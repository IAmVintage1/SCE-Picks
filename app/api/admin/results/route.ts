import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type PropRow = {
  id: string;
  stat_type: string;
  line: number;
  active: boolean;
  player_id: string;
  player_name: string;
  image_url: string | null;
  team_name: string;
  team_slug: string;
  actual_value: number | null;
  result: string | null;
  live_actual: number;
};

type TeamPropRow = {
  id: string;
  prop_type: string;
  line: number | null;
  actual_value: number | null;
  winning_team_slug: string | null;
};

type TeamScoreRow = { team_slug: string; team_name: string; points: number };

async function getResultsState() {
  const [props, teamProps, scores, submissionSummary] = await Promise.all([
    query<PropRow>(`
      with live as (
        select
          player_id,
          coalesce(max(value) filter (where stat_type='points'),0)::numeric as points,
          coalesce(max(value) filter (where stat_type='rebounds'),0)::numeric as rebounds,
          coalesce(max(value) filter (where stat_type='assists'),0)::numeric as assists,
          coalesce(max(value) filter (where stat_type='three_pt_made'),0)::numeric as three_pt_made,
          coalesce(max(value) filter (where stat_type='steals'),0)::numeric as steals,
          coalesce(max(value) filter (where stat_type='blocks'),0)::numeric as blocks,
          coalesce(max(value) filter (where stat_type='turnovers'),0)::numeric as turnovers
        from live_box_score
        group by player_id
      )
      select
        pr.id,
        pr.stat_type::text,
        pr.line::float8 as line,
        pr.active,
        pl.id as player_id,
        pl.name as player_name,
        pl.image_url,
        t.name as team_name,
        t.slug as team_slug,
        r.actual_value::float8 as actual_value,
        r.result::text as result,
        (
          case pr.stat_type::text
            when 'points' then coalesce(l.points,0)
            when 'rebounds' then coalesce(l.rebounds,0)
            when 'assists' then coalesce(l.assists,0)
            when 'three_pt_made' then coalesce(l.three_pt_made,0)
            when 'steals' then coalesce(l.steals,0)
            when 'blocks' then coalesce(l.blocks,0)
            when 'turnovers' then coalesce(l.turnovers,0)
            when 'points_rebounds' then coalesce(l.points,0)+coalesce(l.rebounds,0)
            when 'points_assists' then coalesce(l.points,0)+coalesce(l.assists,0)
            when 'rebounds_assists' then coalesce(l.rebounds,0)+coalesce(l.assists,0)
            when 'rebounds_blocks' then coalesce(l.rebounds,0)+coalesce(l.blocks,0)
            when 'pra' then coalesce(l.points,0)+coalesce(l.rebounds,0)+coalesce(l.assists,0)
            else 0
          end
        )::float8 as live_actual
      from props pr
      join players pl on pl.id=pr.player_id
      join teams t on t.id=pl.team_id
      left join live l on l.player_id=pl.id
      left join results r on r.prop_id=pr.id
      where pr.active=true
      order by t.slug desc, pl.name, pr.stat_type::text
    `),
    query<TeamPropRow>(`
      select
        tp.id,
        tp.prop_type::text,
        tp.line::float8 as line,
        tr.actual_value::float8 as actual_value,
        tr.winning_team_slug
      from team_props tp
      left join team_prop_results tr on tr.team_prop_id=tp.id
      where tp.active=true
      order by tp.prop_type::text
    `),
    query<TeamScoreRow>(`
      select
        t.slug as team_slug,
        t.name as team_name,
        coalesce(sum(l.value),0)::float8 as points
      from teams t
      left join players p on p.team_id=t.id and p.active=true
      left join live_box_score l on l.player_id=p.id and l.stat_type='points'
      where t.slug in ('youngknights','alumknights')
      group by t.id,t.slug,t.name
      order by t.slug
    `),
    query<{ card_status: string; count: number }>(`
      select card_status, count(*)::int as count
      from submissions
      group by card_status
    `),
  ]);

  const gradedPlayerProps = props.filter((p) => p.actual_value !== null).length;
  const gradedTeamProps = teamProps.filter(
    (p) => p.prop_type === "winning_team"
      ? Boolean(p.winning_team_slug)
      : p.actual_value !== null,
  ).length;

  return {
    props,
    teamProps,
    scores,
    summary: {
      playerPropsTotal: props.length,
      playerPropsGraded: gradedPlayerProps,
      teamPropsTotal: teamProps.length,
      teamPropsGraded: gradedTeamProps,
      cards: Object.fromEntries(submissionSummary.map((r) => [r.card_status, r.count])),
    },
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  }

  try {
    return NextResponse.json(await getResultsState());
  } catch (error) {
    console.error("[RESULTS] load failed", error);
    return NextResponse.json({ error: "Couldn't load results." }, { status: 500 });
  }
}

async function finalizeFromTracker() {
  const scoreRows = await query<TeamScoreRow>(`
    select
      t.slug as team_slug,
      t.name as team_name,
      coalesce(sum(l.value),0)::float8 as points
    from teams t
    left join players p on p.team_id=t.id and p.active=true
    left join live_box_score l on l.player_id=p.id and l.stat_type='points'
    where t.slug in ('youngknights','alumknights')
    group by t.id,t.slug,t.name
  `);

  const young = Number(scoreRows.find((r) => r.team_slug === "youngknights")?.points ?? 0);
  const alum = Number(scoreRows.find((r) => r.team_slug === "alumknights")?.points ?? 0);

  if (young === alum) {
    throw new Error("The score is tied. Finish the game before finalizing results.");
  }

  const winner = young > alum ? "youngknights" : "alumknights";

  await query(`
    with live as (
      select
        player_id,
        coalesce(max(value) filter (where stat_type='points'),0)::numeric as points,
        coalesce(max(value) filter (where stat_type='rebounds'),0)::numeric as rebounds,
        coalesce(max(value) filter (where stat_type='assists'),0)::numeric as assists,
        coalesce(max(value) filter (where stat_type='three_pt_made'),0)::numeric as three_pt_made,
        coalesce(max(value) filter (where stat_type='steals'),0)::numeric as steals,
        coalesce(max(value) filter (where stat_type='blocks'),0)::numeric as blocks,
        coalesce(max(value) filter (where stat_type='turnovers'),0)::numeric as turnovers
      from live_box_score
      group by player_id
    ),
    computed as (
      select
        pr.id as prop_id,
        pr.line,
        case pr.stat_type::text
          when 'points' then coalesce(l.points,0)
          when 'rebounds' then coalesce(l.rebounds,0)
          when 'assists' then coalesce(l.assists,0)
          when 'three_pt_made' then coalesce(l.three_pt_made,0)
          when 'steals' then coalesce(l.steals,0)
          when 'blocks' then coalesce(l.blocks,0)
          when 'turnovers' then coalesce(l.turnovers,0)
          when 'points_rebounds' then coalesce(l.points,0)+coalesce(l.rebounds,0)
          when 'points_assists' then coalesce(l.points,0)+coalesce(l.assists,0)
          when 'rebounds_assists' then coalesce(l.rebounds,0)+coalesce(l.assists,0)
          when 'rebounds_blocks' then coalesce(l.rebounds,0)+coalesce(l.blocks,0)
          when 'pra' then coalesce(l.points,0)+coalesce(l.rebounds,0)+coalesce(l.assists,0)
          else 0
        end as actual_value
      from props pr
      left join live l on l.player_id=pr.player_id
      where pr.active=true
    )
    insert into results(prop_id,actual_value,result)
    select
      prop_id,
      actual_value,
      (case
        when actual_value=line then 'push'
        when actual_value>line then 'hit'
        else 'miss'
      end)::pick_result
    from computed
    on conflict(prop_id) do update
      set actual_value=excluded.actual_value,
          result=excluded.result,
          updated_at=now()
  `);

  const total = young + alum;
  await query(
    `
      insert into team_prop_results(team_prop_id,actual_value,winning_team_slug)
      select
        tp.id,
        case when tp.prop_type='combined_points' then $1::numeric else null end,
        case when tp.prop_type='winning_team' then $2::text else null end
      from team_props tp
      where tp.active=true
      on conflict(team_prop_id) do update
        set actual_value=excluded.actual_value,
            winning_team_slug=excluded.winning_team_slug,
            updated_at=now()
    `,
    [total, winner],
  );

  return { winner, young, alum, combined: total };
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  }

  const body = await req.json().catch(() => ({}));

  try {
    if (body.action === "finalize") {
      const final = await finalizeFromTracker();
      return NextResponse.json({ ok: true, final, state: await getResultsState() });
    }

    if (body.kind === "player") {
      const propId = String(body.propId || "");
      const actualValue = Number(body.actualValue);
      if (!propId || !Number.isFinite(actualValue)) {
        return NextResponse.json({ error: "Valid prop and value required." }, { status: 400 });
      }

      const prop = await query<{ line: number }>(
        "select line::float8 as line from props where id=$1 limit 1",
        [propId],
      );
      if (!prop[0]) return NextResponse.json({ error: "Prop not found." }, { status: 404 });

      const resultLabel =
        actualValue === prop[0].line ? "push" : actualValue > prop[0].line ? "hit" : "miss";

      await query(
        `insert into results(prop_id,actual_value,result)
         values($1,$2,$3::pick_result)
         on conflict(prop_id) do update
           set actual_value=excluded.actual_value,
               result=excluded.result,
               updated_at=now()`,
        [propId, actualValue, resultLabel],
      );
      return NextResponse.json({ ok: true });
    }

    if (body.kind === "team") {
      const teamPropId = String(body.teamPropId || "");
      if (!teamPropId) {
        return NextResponse.json({ error: "Team prop required." }, { status: 400 });
      }
      const actualValue =
        body.actualValue === undefined || body.actualValue === null || body.actualValue === ""
          ? null
          : Number(body.actualValue);
      const winningTeamSlug = body.winningTeamSlug ? String(body.winningTeamSlug) : null;

      await query(
        `insert into team_prop_results(team_prop_id,actual_value,winning_team_slug)
         values($1,$2,$3)
         on conflict(team_prop_id) do update
           set actual_value=excluded.actual_value,
               winning_team_slug=excluded.winning_team_slug,
               updated_at=now()`,
        [teamPropId, actualValue, winningTeamSlug],
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown results action." }, { status: 400 });
  } catch (error) {
    console.error("[RESULTS] save failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Couldn't save results." },
      { status: 500 },
    );
  }
}

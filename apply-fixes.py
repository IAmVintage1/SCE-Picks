#!/usr/bin/env python3
from pathlib import Path

path = Path("components/PicksExperience.tsx")
text = path.read_text(encoding="utf-8")

old = r'''function statMatches(
  statType: string | undefined,
  filter: StatFilter,
): boolean {
  if (filter === "ALL") return true;

  return normalizeStat(statType) === normalizeStat(filter);
}'''

new = r'''function statMatches(
  statType: string | undefined,
  filter: StatFilter,
): boolean {
  if (filter === "ALL") return true;

  const statMap: Record<string, StatFilter> = {
    points: "PTS",
    rebounds: "REB",
    assists: "AST",
    three_pt_made: "3PT",
    steals: "STL",
    blocks: "BLK",
    turnovers: "ALL",
    points_rebounds: "PTS+REB",
    points_assists: "PTS+AST",
    rebounds_assists: "ALL",
    rebounds_blocks: "REB+BLK",
    pra: "PRA",
  };

  return statMap[statType ?? ""] === filter;
}'''

if old not in text:
    raise SystemExit("Could not find statMatches block.")
text = text.replace(old, new, 1)

old = r'''        const teamName = getTeamName(
          player,
          teams,
        ).toUpperCase();

        const isYoung =
          teamName.includes("YOUNG") ||
          teamName.includes("KNIGHT");

        const isAlum =
          teamName.includes("ALUM") ||
          teamName.includes("ALUMN");'''

new = r'''        const teamName = getTeamName(
          player,
          teams,
        ).toUpperCase();

        const isYoung =
          player.team.slug === "youngknights";

        const isAlum =
          player.team.slug === "alumknights";'''

if old not in text:
    raise SystemExit("Could not find team classification block.")
text = text.replace(old, new, 1)

old = r'''      {/* MOBILE PICK SLIP */}
      <div className="lg:hidden">
        <PickSlipBar
          picks={pickList}
          minPicks={minPicks}
          settings={settings}
          locked={locked}
          onOpen={() =>
            setMobileSlipOpen(true)
          }
          onSubmit={handleSubmit}
        />

        <PickSlipDrawer
          open={mobileSlipOpen}
          picks={pickList}
          minPicks={minPicks}
          settings={settings}
          locked={locked}
          onClose={() =>
            setMobileSlipOpen(false)
          }
          onRemove={removeLeg}
          onSubmit={handleSubmit}
          confettiTrigger={
            confettiTrigger
          }
        />
      </div>'''

new = r'''      {/* MOBILE PICK SLIP */}
      <div className="lg:hidden">
        <PickSlipBar
          count={pickCount}
          onOpen={() =>
            setMobileSlipOpen(true)
          }
        />

        <PickSlipDrawer
          items={pickList}
          open={mobileSlipOpen}
          onClose={() =>
            setMobileSlipOpen(false)
          }
          onRemove={removeLeg}
          onSubmit={handleSubmit}
          submitting={submitting}
          locked={locked}
          minPicks={minPicks}
          settings={settings}
          confettiTrigger={confettiTrigger}
        />
      </div>'''

if old not in text:
    raise SystemExit("Could not find mobile PickSlip block.")
text = text.replace(old, new, 1)

path.write_text(text, encoding="utf-8")
print("Successfully patched components/PicksExperience.tsx")

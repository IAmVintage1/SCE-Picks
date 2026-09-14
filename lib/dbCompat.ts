import { ident, query } from "@/lib/db";
import "server-only";

type Filter =
  | { kind: "eq"; column: string; value: unknown }
  | { kind: "in"; column: string; value: unknown[] }
  | { kind: "ilike"; column: string; value: string };

type Row = Record<string, any>;
type ListResult = { data: Row[] | null; error: any | null; count?: number | null };
type SingleResult = { data: Row; error: any | null; count?: number | null };
type RuntimeResult = { data: any; error: any | null; count?: number | null };

function dbError(error: any) {
  return {
    message: error?.message || "Database error",
    code: error?.code || null,
    details: error?.detail || null,
  };
}

function cleanSelect(select: string) {
  return select.replace(/\s+/g, " ").trim();
}

class QueryBuilder implements PromiseLike<ListResult> {
  private operation: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private selectText = "*";
  private filters: Filter[] = [];
  private orderBy: { column: string; ascending: boolean; nullsFirst?: boolean } | null = null;
  private payload: any = null;
  private conflictColumn: string | null = null;
  private wantsSingle = false;
  private wantsMaybeSingle = false;
  private wantsReturning = false;
  private wantsCount = false;
  private headOnly = false;
  private limitCount: number | null = null;

  constructor(private table: string) {}

  select(columns = "*", options?: { count?: string; head?: boolean }) {
    this.selectText = cleanSelect(columns);
    if (options?.count) this.wantsCount = true;
    if (options?.head) this.headOnly = true;
    if (this.operation !== "select") this.wantsReturning = true;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ kind: "eq", column, value });
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push({ kind: "in", column, value: values });
    return this;
  }

  or(expression: string) {
    const m = expression.match(/^([a-zA-Z0-9_]+)\.ilike\.%(.*)%$/);
    if (m) this.filters.push({ kind: "ilike", column: m[1], value: `%${m[2]}%` });
    return this;
  }

  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.orderBy = {
      column,
      ascending: options?.ascending !== false,
      nullsFirst: options?.nullsFirst,
    };
    return this;
  }

  limit(count: number) {
    this.limitCount = Math.max(0, Math.floor(count));
    return this;
  }

  insert(values: any | any[]) {
    this.operation = "insert";
    this.payload = Array.isArray(values) ? values : [values];
    return this;
  }

  update(values: any) {
    this.operation = "update";
    this.payload = values;
    return this;
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  upsert(values: any | any[], options?: { onConflict?: string }) {
    this.operation = "upsert";
    this.payload = Array.isArray(values) ? values : [values];
    this.conflictColumn = options?.onConflict || null;
    return this;
  }

  single(): PromiseLike<SingleResult> {
    this.wantsSingle = true;
    return this as unknown as PromiseLike<SingleResult>;
  }

  maybeSingle(): PromiseLike<SingleResult> {
    this.wantsMaybeSingle = true;
    return this as unknown as PromiseLike<SingleResult>;
  }

  private whereClause(params: unknown[]) {
    if (!this.filters.length) return "";
    const pieces = this.filters.map((filter) => {
      const col = ident(filter.column);
      if (filter.kind === "eq") {
        params.push(filter.value);
        return `${col} = $${params.length}`;
      }
      if (filter.kind === "ilike") {
        params.push(filter.value);
        return `${col} ILIKE $${params.length}`;
      }
      if (!filter.value.length) return "false";
      const marks = filter.value.map((v) => {
        params.push(v);
        return `$${params.length}`;
      });
      return `${col} IN (${marks.join(",")})`;
    });
    return ` WHERE ${pieces.join(" AND ")}`;
  }

  private orderClause() {
    if (!this.orderBy) return "";
    const nulls =
      this.orderBy.nullsFirst === undefined
        ? ""
        : this.orderBy.nullsFirst
          ? " NULLS FIRST"
          : " NULLS LAST";
    return ` ORDER BY ${ident(this.orderBy.column)} ${this.orderBy.ascending ? "ASC" : "DESC"}${nulls}`;
  }

  private limitClause() {
    return this.limitCount === null ? "" : ` LIMIT ${this.limitCount}`;
  }

  private async nestedSelect(): Promise<any[] | null> {
    const s = this.selectText;

    if (this.table === "props" && s.includes("player:players")) {
      const params: unknown[] = [];
      const safeWhere = this.whereClause(params).replace(/"([a-zA-Z0-9_]+)"/g, 'p."$1"');
      const order = this.orderBy
        ? ` ORDER BY p.${ident(this.orderBy.column)} ${this.orderBy.ascending ? "ASC" : "DESC"}`
        : "";
      return query(
        `SELECT p.*,
          jsonb_build_object(
            'id', pl.id, 'name', pl.name, 'team_id', pl.team_id,
            'image_url', pl.image_url, 'active', pl.active,
            'created_at', pl.created_at, 'updated_at', pl.updated_at,
            'bio_tags', pl.bio_tags, 'bio', pl.bio,
            'team', jsonb_build_object(
              'id', t.id, 'name', t.name, 'slug', t.slug,
              'color', t.color, 'created_at', t.created_at
            )
          ) AS player
        FROM props p
        JOIN players pl ON pl.id = p.player_id
        JOIN teams t ON t.id = pl.team_id
        ${safeWhere}${order}${this.limitClause()}`,
        params,
      );
    }

    if (this.table === "players" && s.includes("team:teams")) {
      const params: unknown[] = [];
      const rawWhere = this.whereClause(params);
      const where = rawWhere
        .replace(/"([a-zA-Z0-9_]+)"/g, 'p."$1"');
      const order = this.orderBy
        ? ` ORDER BY p.${ident(this.orderBy.column)} ${this.orderBy.ascending ? "ASC" : "DESC"}`
        : "";
      return query(
        `SELECT p.*,
          jsonb_build_object('id',t.id,'name',t.name,'slug',t.slug,'color',t.color,'created_at',t.created_at) AS team
         FROM players p JOIN teams t ON t.id=p.team_id
         ${where}${order}${this.limitClause()}`,
        params,
      );
    }

    if (this.table === "submissions" && (s.includes("user:app_users") || s.includes("picks("))) {
      const params: unknown[] = [];
      const rawWhere = this.whereClause(params);
      const where = rawWhere.replace(/"([a-zA-Z0-9_]+)"/g, 's."$1"');
      const order = this.orderBy
        ? ` ORDER BY s.${ident(this.orderBy.column)} ${this.orderBy.ascending ? "ASC" : "DESC"}`
        : "";
      return query(
        `SELECT s.*,
          CASE WHEN u.id IS NULL THEN NULL ELSE jsonb_build_object(
            'id',u.id,'name',u.name,'email',u.email,
            'instagram_username',u.instagram_username,
            'leaderboard_opt_out',u.leaderboard_opt_out,
            'created_at',u.created_at
          ) END AS "user",
          COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id',pk.id,'selection',pk.selection,'result',pk.result,
                'created_at',pk.created_at,
                'prop', jsonb_build_object(
                  'id',pr.id,'line',pr.line,'stat_type',pr.stat_type,
                  'active',pr.active,'locked',pr.locked,'featured',pr.featured,
                  'player', jsonb_build_object(
                    'id',pl.id,'name',pl.name,'image_url',pl.image_url,
                    'team',jsonb_build_object('id',tm.id,'name',tm.name,'slug',tm.slug,'color',tm.color)
                  )
                )
              )
            )
            FROM picks pk
            JOIN props pr ON pr.id=pk.prop_id
            JOIN players pl ON pl.id=pr.player_id
            JOIN teams tm ON tm.id=pl.team_id
            WHERE pk.submission_id=s.id
          ), '[]'::jsonb) AS picks,
          COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id',tpick.id,'selection',tpick.selection,'result',tpick.result,
                'created_at',tpick.created_at,
                'team_prop',jsonb_build_object(
                  'id',tprop.id,'prop_type',tprop.prop_type,'line',tprop.line,
                  'featured',tprop.featured,'active',tprop.active,'locked',tprop.locked
                )
              )
            )
            FROM team_picks tpick
            JOIN team_props tprop ON tprop.id=tpick.team_prop_id
            WHERE tpick.submission_id=s.id
          ), '[]'::jsonb) AS team_picks
        FROM submissions s
        LEFT JOIN app_users u ON u.id=s.user_id
        ${where}${order}${this.limitClause()}`,
        params,
      );
    }

    return null;
  }

  private selectColumns() {
    if (this.selectText === "*" || this.selectText.includes("(") || this.selectText.includes(":")) return "*";
    return this.selectText
      .split(",")
      .map((x) => ident(x.trim()))
      .join(", ");
  }

  private async executeSelect() {
    const nested = await this.nestedSelect();
    if (nested) return nested;
    const params: unknown[] = [];
    const sql = `SELECT ${this.selectColumns()} FROM ${ident(this.table)}${this.whereClause(params)}${this.orderClause()}${this.limitClause()}`;
    return query(sql, params);
  }

  private async executeInsert() {
    const rows = this.payload as any[];
    if (!rows.length) return [];
    const keys = Object.keys(rows[0]);
    const params: unknown[] = [];
    const groups = rows.map((row) => {
      const marks = keys.map((key) => {
        params.push(row[key]);
        return `$${params.length}`;
      });
      return `(${marks.join(",")})`;
    });
    const returning = this.wantsReturning ? " RETURNING *" : "";
    return query(
      `INSERT INTO ${ident(this.table)} (${keys.map(ident).join(",")})
       VALUES ${groups.join(",")}${returning}`,
      params,
    );
  }

  private async executeUpdate() {
    const keys = Object.keys(this.payload || {});
    const params: unknown[] = [];
    const sets = keys.map((key) => {
      params.push(this.payload[key]);
      return `${ident(key)} = $${params.length}`;
    });
    const returning = this.wantsReturning ? " RETURNING *" : "";
    return query(
      `UPDATE ${ident(this.table)} SET ${sets.join(", ")}${this.whereClause(params)}${returning}`,
      params,
    );
  }

  private async executeDelete() {
    const params: unknown[] = [];
    return query(
      `DELETE FROM ${ident(this.table)}${this.whereClause(params)}${this.wantsReturning ? " RETURNING *" : ""}`,
      params,
    );
  }

  private async executeUpsert() {
    const rows = this.payload as any[];
    if (!rows.length) return [];
    const keys = Object.keys(rows[0]);
    const params: unknown[] = [];
    const groups = rows.map((row) => {
      const marks = keys.map((key) => {
        params.push(row[key]);
        return `$${params.length}`;
      });
      return `(${marks.join(",")})`;
    });
    if (!this.conflictColumn) throw new Error("upsert requires onConflict");
    const updates = keys
      .filter((key) => key !== this.conflictColumn)
      .map((key) => `${ident(key)} = EXCLUDED.${ident(key)}`)
      .join(", ");
    return query(
      `INSERT INTO ${ident(this.table)} (${keys.map(ident).join(",")})
       VALUES ${groups.join(",")}
       ON CONFLICT (${ident(this.conflictColumn)}) DO UPDATE SET ${updates}
       RETURNING *`,
      params,
    );
  }

  async execute(): Promise<RuntimeResult> {
    try {
      let rows: any[] = [];
      if (this.operation === "select") rows = await this.executeSelect();
      if (this.operation === "insert") rows = await this.executeInsert();
      if (this.operation === "update") rows = await this.executeUpdate();
      if (this.operation === "delete") rows = await this.executeDelete();
      if (this.operation === "upsert") rows = await this.executeUpsert();

      const count = this.wantsCount ? rows.length : undefined;
      if (this.headOnly) return { data: null, error: null, count };

      if (this.wantsSingle) {
        if (rows.length !== 1) {
          return { data: null, error: { message: rows.length ? "Multiple rows returned" : "Row not found", code: "PGRST116" } };
        }
        return { data: rows[0], error: null, count };
      }
      if (this.wantsMaybeSingle) {
        if (rows.length > 1) return { data: null, error: { message: "Multiple rows returned", code: "PGRST116" } };
        return { data: rows[0] ?? null, error: null, count };
      }
      return { data: rows, error: null, count };
    } catch (error: any) {
      return { data: null, error: dbError(error) };
    }
  }

  then<TResult1 = ListResult, TResult2 = never>(
    onfulfilled?: ((value: ListResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled as any, onrejected as any);
  }
}

export function createDbClient() {
  return {
    from(table: string) {
      return new QueryBuilder(table);
    },
    async rpc(name: string, args: Record<string, unknown> = {}) {
      try {
        if (name === "bump_live_stat") {
          await query("SELECT bump_live_stat($1,$2,$3)", [
            args.p_player_id,
            args.p_stat_type,
            args.p_delta,
          ]);
          return { data: null, error: null };
        }
        if (name === "reset_live_tracking") {
          await query("SELECT reset_live_tracking()");
          return { data: null, error: null };
        }
        return { data: null, error: { message: `Unknown database function: ${name}` } };
      } catch (error: any) {
        return { data: null, error: dbError(error) };
      }
    },
  };
}

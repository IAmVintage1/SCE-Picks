import { Pool } from "@neondatabase/serverless";
import "server-only";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const globalDb = globalThis as unknown as { scePicksPool?: Pool };
export const pool =
  globalDb.scePicksPool ??
  new Pool({
    connectionString,
  });

if (process.env.NODE_ENV !== "production") globalDb.scePicksPool = pool;

export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool.query(text, params as any[]);
  return result.rows as T[];
}

export function ident(value: string) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(value)) {
    throw new Error("Invalid SQL identifier.");
  }
  return `"${value}"`;
}

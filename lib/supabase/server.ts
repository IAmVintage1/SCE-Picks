import { createDbClient } from "@/lib/dbCompat";
export function createServerSupabase() {
  return createDbClient();
}

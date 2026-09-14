import { createDbClient } from "@/lib/dbCompat";
import "server-only";
export function createAdminSupabase() {
  return createDbClient();
}

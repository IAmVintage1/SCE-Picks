import { createClient } from "@supabase/supabase-js";
import "server-only";

// CRITICAL: this client uses the service_role key, which bypasses
// Row Level Security entirely. It must only ever be imported from
// files under app/api/admin/** (server-side route handlers) that
// have already checked requireAdmin() from lib/adminAuth.ts.
// Never import this file into a client component or a page that
// renders in the browser.
export function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}

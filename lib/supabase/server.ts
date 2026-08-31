import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Used inside server components / route handlers for reads that
// should respect RLS (i.e. everything the public is allowed to see).
export function createServerSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Not needed: this app doesn't use Supabase Auth sessions.
        },
      },
    }
  );
}

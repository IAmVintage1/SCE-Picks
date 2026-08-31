# SCE Picks

**Call your shot.** A free-to-play sports prediction app for YoungKnights vs
AlumKnights (October 9, UCF). No entry fees, no wagering — users just pick
OVER or UNDER on player stats.

This is Phase 1 of the build: the full picking experience (filters, player
cards, pick slip, guest submission) and the admin dashboard (players, props,
photo uploads, submissions, event settings), all backed by a real Supabase
database. Results, automatic hit/miss, the leaderboard, and crowd
percentages are Phase 2/3 — the database tables for them already exist
(`results`), so nothing needs to be rebuilt when you're ready to add them.

---

## What you'll need

- A free [Supabase](https://supabase.com) account
- A free [Vercel](https://vercel.com) account
- A free [GitHub](https://github.com) account
- Node.js installed on your computer (only if you want to run it locally
  before deploying — you can skip straight to deployment if not)

None of these require a credit card for this project's scale.

---

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New Project**.
3. Name it `sce-picks`, set a database password (save it somewhere), pick a
   region close to you, and click **Create new project**. Wait ~2 minutes
   for it to finish setting up.

## 2. Run the database schema

1. In your Supabase project, open **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open `supabase/schema.sql` from this project, copy all of it, paste it
   into the SQL editor, and click **Run**.
4. Repeat the same steps for `supabase/seed.sql` — this adds the two teams
   and your exact 20 roster players. No stats or props are created yet;
   you'll add those yourself from the admin dashboard.

## 3. Create the player photo storage bucket

1. In Supabase, open **Storage** in the left sidebar.
2. Click **New bucket**.
3. Name it exactly `player-photos`.
4. Toggle **Public bucket** to ON (this lets photos display on the site).
5. Click **Create bucket**.
6. Go back to **SQL Editor**, open a new query, paste in the contents of
   `supabase/storage-policies.sql`, and click **Run**.

## 4. Get your Supabase API keys

1. In Supabase, go to **Project Settings** (gear icon) → **API**.
2. You'll need three values for the next step:
   - **Project URL** → this is `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → this is `SUPABASE_SERVICE_ROLE_KEY`
     (keep this one secret — never put it in frontend code or share it
     publicly; this project only ever uses it in server-side API routes)

## 5. Set your admin password

Pick a strong password for the admin dashboard — this is what you'll type
in at `/admin/login` to manage players, props, and submissions. You'll set
this as `ADMIN_PASSWORD` in the next step.

You'll also need a random secret string for signing admin login sessions
(`ADMIN_SESSION_SECRET`). If you have a terminal handy, generate one with:

```bash
openssl rand -hex 32
```

If you don't have a terminal, any long random string of letters and
numbers (30+ characters) works fine.

## 6. Push this project to GitHub

1. Create a new repository on GitHub (e.g. `sce-picks`), keep it private if
   you'd like.
2. From inside this project folder, run:

```bash
git init
git add .
git commit -m "Initial SCE Picks build"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/sce-picks.git
git push -u origin main
```

(The `.gitignore` already excludes `node_modules` and your `.env` files, so
your secrets never get pushed to GitHub.)

## 7. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com), sign in, and click **Add New →
   Project**.
2. Import the `sce-picks` GitHub repository you just pushed.
3. Before clicking Deploy, open **Environment Variables** and add all five:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | from step 4 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from step 4 |
| `SUPABASE_SERVICE_ROLE_KEY` | from step 4 |
| `ADMIN_PASSWORD` | from step 5 |
| `ADMIN_SESSION_SECRET` | from step 5 |

4. Click **Deploy**. After a minute or two, Vercel gives you a live URL
   like `sce-picks.vercel.app`.

## 8. Upload player photos

1. Visit `your-site.vercel.app/admin/login` and sign in with your admin
   password.
2. Go to the **Players** tab. All 20 roster players are already there.
3. Click **Upload photo** under each player and choose an image. It's
   saved to Supabase Storage immediately — no code changes needed.

## 9. Create your first prop

1. Go to the **Props** tab.
2. Choose a player, a stat (Points, Rebounds, Assists, 3PT Made, Steals,
   Blocks, Turnovers, or a combo like PRA), and enter the line (e.g. `12.5`).
3. Click **Create prop**. It appears on the live picks page immediately.

## 10. Test a submission

1. Visit your live site's homepage and click **Make Your Picks**.
2. Pick OVER or UNDER on the prop you just created.
3. Open the pick slip, tap **Lock In Picks**, fill in the guest form, and
   submit.
4. Go back to the admin dashboard's **Submissions** tab — your test
   submission should appear immediately.

---

## Running it locally (optional)

If you want to preview changes before pushing to GitHub:

```bash
npm install
cp .env.example .env.local   # then fill in your real values
npm run dev
```

Visit `http://localhost:3000`.

---

## Project structure

```
app/
  page.tsx                 → homepage
  picks/page.tsx            → main picking screen
  admin/                    → admin dashboard pages (protected)
  api/picks/submit/         → handles guest pick submissions
  api/admin/                → admin-only API routes (players, props,
                               submissions, settings, photo upload)
components/                 → PlayerCard, PickSlip, SubmitModal, etc.
lib/
  types.ts                  → shared TypeScript types
  adminAuth.ts               → admin session cookie logic
  supabase/
    client.ts                → browser client (anon key only)
    server.ts                → server component client (anon key, RLS)
    admin.ts                 → server-only client (service role key)
supabase/
  schema.sql                 → run this first in Supabase SQL Editor
  seed.sql                   → run this second (adds teams + 20 players)
  storage-policies.sql        → run this after creating the storage bucket
middleware.ts                → protects all /admin and /api/admin routes
```

## Security notes

- The Supabase **service role key** is only ever used inside
  `app/api/admin/**` route handlers, which are protected by the admin
  session cookie via `middleware.ts`. It is never sent to the browser.
- Row Level Security is enabled on every table. The public (anon key) can
  only read active players/props/results and insert their own
  submissions/picks — it cannot modify players, props, results, or other
  people's submissions.
- Admin login is a single shared password (Phase 1, matching "make setup
  as simple as possible"). If you want individual admin accounts with
  their own logins later, Supabase Auth can be layered in without changing
  the database schema.

## What's next (Phase 2 / 3, not yet built)

- Entering actual game stats and auto-grading picks (the `results` table
  and grading trigger already exist in `schema.sql` — the admin UI for
  entering results is the next piece to add)
- Public leaderboard
- Crowd percentage bars (% picked OVER vs UNDER per prop)
- Social-media-shareable result cards

# Turning Constellation into a hosted website

Two free accounts and about 15 minutes of clicking. When you're done you'll have a
URL you can open anywhere, sign in with your email, and your sky will follow you —
**end-to-end encrypted**, so the database only ever stores ciphertext.

Without this setup the app still works fully, just locally in one browser.

## 1. Supabase (accounts + storage) — ~10 minutes

1. Create a free account at [supabase.com](https://supabase.com) and click **New project**.
   Any name and region; the database password it asks for is for admin use, not for the app.
2. In the left sidebar open **SQL Editor**, paste the block below, and click **Run**:

   ```sql
   create table public.skies (
     user_id uuid primary key references auth.users(id) on delete cascade,
     salt text not null,
     iv text not null,
     data text not null,
     updated_at timestamptz not null default now()
   );

   alter table public.skies enable row level security;

   create policy "read own sky" on public.skies
     for select using (auth.uid() = user_id);
   create policy "create own sky" on public.skies
     for insert with check (auth.uid() = user_id);
   create policy "update own sky" on public.skies
     for update using (auth.uid() = user_id);
   ```

   Row-level security means each signed-in user can only ever touch their own row —
   enforced by the database itself.

3. Email sign-in is on by default (Authentication → Sign In / Up → Email). Nothing to do
   unless you've changed defaults. Magic links are used, so no passwords are stored.
4. **Recommended:** open **Authentication → Emails → Magic Link** and add the one-time code
   to the template, e.g. a line like:

   ```html
   <p>Or enter this code: {{ .Token }}</p>
   ```

   Phone email apps often open the link in their own built-in browser, which signs in the
   wrong browser. The code lets you sign in the browser you're actually using — the app has
   a "6-digit code" field right under "check your email".
4. Open **Settings → API** and copy two values:
   - **Project URL** (like `https://abcdefgh.supabase.co`)
   - **anon / public key** (a long string starting `eyJ…`)

   The anon key is safe to expose in the browser — row-level security is what protects data.

## 2. Local test (optional but recommended)

```bash
cp .env.example .env.local
# paste the two values into .env.local
npm run dev
```

A "☁ sign in to sync" link appears in the footer. Sign in with your email, click the link
in your inbox, choose a passphrase — you're syncing.

## 3. Vercel (hosting) — ~5 minutes

1. Create a free account at [vercel.com](https://vercel.com) **with your GitHub login**.
2. Click **Add New → Project**, and import the `constellation` repository.
3. Vercel auto-detects Vite; don't change the build settings. Before deploying, open
   **Environment Variables** and add both:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
4. Click **Deploy**. You'll get a URL like `https://constellation-xyz.vercel.app`.
5. Back in Supabase: **Authentication → URL Configuration**, set **Site URL** to your
   Vercel URL (and add it to Redirect URLs). This is where the magic-link emails point.
6. If you set the project up before the merge-based sync update, no database change is
   needed — the same `skies` table works as-is.

Every push to the connected branch redeploys automatically.

## What the encryption means in practice

- Your passphrase never leaves the browser. A key is derived from it
  (PBKDF2-SHA256, 310k iterations) and the entire sky is encrypted with AES-256-GCM
  **before** upload. Supabase stores only ciphertext.
- **There is no passphrase recovery.** Not a policy — a property. Losing the passphrase
  loses the cloud copy (any device still signed in and unlocked retains the data and
  could re-upload under a new passphrase by signing out/in fresh).
- The magic-link email proves who you are; the passphrase is what your data is
  encrypted with. Both are needed on a new device.
- The working copy on each device stays in that browser's localStorage, as before.

## How two devices stay in agreement

- Devices **merge, they don't overwrite**: every record (person, thread, moment, event,
  reminder) is reconciled individually — the newest edit of a record wins, moments simply
  combine, and deletions are remembered (for ~6 months) so a removed star doesn't
  reappear when an old copy syncs in.
- Every upload is **version-checked**: if the other device wrote first, this one pulls,
  merges, and retries instead of overwriting. A device left open for days can no longer
  erase the other's recent changes.
- A device **pulls when its tab wakes up** and **flushes just before it disappears**, so
  quick edit-then-pocket moments still land.
- Sync only runs after the **passphrase** is entered on that device — signing in with the
  email alone is not enough (the passphrase *is* the encryption key). The footer shows the
  live status; "☁ locked" means the passphrase step is still pending.
- Simultaneous edits to the *same field of the same person* on two devices within the same
  moment still resolve to the newer edit — that's the one remaining conflict, and it's the
  size of one field, not your whole sky.

## Limits worth knowing (v1)

- Changing the passphrase isn't built yet (workaround: sign out everywhere, delete the
  row in Supabase's Table Editor, sign in on the device that has the data, pick a new one).

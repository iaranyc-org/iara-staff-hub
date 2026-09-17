# iara Lineup

The onboarding and menu-training app for iara. Named after the lineup, the
pre-service meeting where a restaurant teaches its staff the menu.

This repo has two single-page PWAs, no build step for either:

- `iara_staff_hub.html` — service manual, team bios, food & beverage guide
  with a manager-editable menu, knowledge-check quizzes, and a team
  progress view. Serves at `/`.
- `iara_kitchen_ops.html` — kitchen ops: ingredient costing, recipe
  costing, inventory counts, purchase orders, and sales tracking.
  Manager-only. Serves at `/ops`.

## Local preview

Serve the folder with any static file server (e.g. `python3 -m http.server`)
so the manifest/icon paths resolve correctly, then open
`iara_staff_hub.html` or `iara_kitchen_ops.html` directly.

## Shared data (Firebase)

Both apps need a shared database, and use real Firebase Auth (not just a
client-side check) so the security rules can actually enforce access:

- `iara_staff_hub.html` — the team signs in as one shared account
  (`staff@iara.nyc`) for menu editing, quiz history, and the Team Progress
  view; managers additionally sign in with Google (see `MANAGERS` in the
  file) for menu-editing and manager-only views.
- `iara_kitchen_ops.html` — manager Google sign-in only (same `MANAGERS`
  list, kept in step between both files). It's a second, separately named
  Firebase Auth app instance, so a manager who's already signed in on the
  Hub is recognized here automatically (same browser, same origin).

Both talk to Firestore through a small `db.doc()/db.collection()` wrapper
(`initDb()` in the Hub, the equivalent in `initApp()` in Kitchen Ops) built
on the Firebase Firestore compat SDK, which is already wired into both
files.

To activate it:

1. Go to the [Firebase console](https://console.firebase.google.com/),
   create a project (or reuse one).
2. **Build > Firestore Database > Create database.** Any region is fine.
3. **Build > Authentication > Sign-in method**: enable **Email/Password**
   (for the shared staff account) and **Google** (for managers).
4. Create the shared staff account under **Authentication > Users** —
   email `staff@iara.nyc`, the password the team is given.
5. In **Project settings > General > Your apps**, add a Web app and copy
   the `firebaseConfig` object it gives you.
6. Paste those values into `FIREBASE_CONFIG` near the top of the
   `<script>` block in **both** `iara_staff_hub.html` and
   `iara_kitchen_ops.html` (replace every `REPLACE_ME` in each).
7. In **Firestore Database > Rules**, paste the contents of
   `firestore.rules` from this repo and publish. It covers both apps'
   collections, and gates manager-only actions on the `MANAGERS` email
   allowlist baked into the rules — keep that list in sync with the
   `MANAGERS` array in both HTML files.

If `FIREBASE_CONFIG` is left as `REPLACE_ME` in a given file, that app's
sync features just degrade gracefully (no crash, no shared data) — Kitchen
Ops falls back to local in-browser seed data, and the Staff Hub's editable
features and progress view go inactive while everything else keeps working.

## Deploying to Vercel

1. Push this repo to GitHub (see below).
2. In [Vercel](https://vercel.com/new), **Import Project** and select the
   GitHub repo. No framework/build settings needed — it's static.
3. Deploy. `vercel.json` rewrites `/` to `/iara_staff_hub.html` and `/ops`
   to `/iara_kitchen_ops.html`; `manifest.json`/`ops-manifest.json` and
   `icon-512.png` are served as-is for each app's PWA install prompt.

## Collaborating via GitHub

Add teammates as collaborators under the repo's **Settings > Collaborators**
so they can push branches / open PRs. Each person needs their own GitHub
account and their own SSH key or token configured locally.

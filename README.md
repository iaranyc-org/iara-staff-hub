# iara Lineup

The onboarding and menu-training app for iara. Named after the lineup, the
pre-service meeting where a restaurant teaches its staff the menu.

Single-page training PWA: service manual, team bios, food & beverage
guide with a manager-editable menu, knowledge-check quizzes, and a team
progress view. Everything lives in `iara_staff_hub.html` — no build step.

## Local preview

Just open `iara_staff_hub.html` in a browser, or serve the folder with any
static file server (e.g. `python3 -m http.server`) so the manifest/icon
paths resolve correctly.

## Shared data (Firebase)

Menu editing, quiz history, and the Team Progress view need a shared
database. The app talks to it through a small `db.doc()/db.collection()`
wrapper (see `initDb()` in `iara_staff_hub.html`) that's compatible with
the Firebase Firestore compat SDK, which is already wired in.

To activate it:

1. Go to the [Firebase console](https://console.firebase.google.com/),
   create a project (or reuse one).
2. **Build > Firestore Database > Create database.** Any region is fine.
3. In **Project settings > General > Your apps**, add a Web app and copy
   the `firebaseConfig` object it gives you.
4. Paste those values into `FIREBASE_CONFIG` near the top of the
   `<script>` block in `iara_staff_hub.html` (replace every `REPLACE_ME`).
5. In **Firestore Database > Rules**, paste the contents of
   `firestore.rules` from this repo and publish.

**Security note:** `firestore.rules` as shipped allows anyone with the
project ID to read/write `staff/*` and `menu_items/*` — there's no real
user authentication in this app, only a client-side manager PIN
(`MANAGER_PIN` in `iara_staff_hub.html`, default `1926`) that gates the
*UI*, not the database. That's an acceptable tradeoff for a low-stakes
internal tool, but don't put anything sensitive in Firestore, and
consider adding real Firebase Auth + tighter rules if that changes.

If `FIREBASE_CONFIG` is left as `REPLACE_ME`, those three features just
degrade gracefully (no crash, no data) — everything else works normally.

## Deploying to Vercel

1. Push this repo to GitHub (see below).
2. In [Vercel](https://vercel.com/new), **Import Project** and select the
   GitHub repo. No framework/build settings needed — it's static.
3. Deploy. `vercel.json` rewrites `/` to `/iara_staff_hub.html` so the app
   loads at the root URL; `manifest.json` and `icon-512.png` are served
   as-is for the PWA install prompt.

## Collaborating via GitHub

Add teammates as collaborators under the repo's **Settings > Collaborators**
so they can push branches / open PRs. Each person needs their own GitHub
account and their own SSH key or token configured locally.

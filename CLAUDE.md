# iara Staff Hub

Static site for iara staff (205 Allen St, NYC), live at staff.iara.nyc. No build step. Vercel deploys `main` automatically, so whatever lands on `main` is live for staff right away.

## How to make a change
1. Work on a new branch, never on `main` (it is protected; you can't push to it).
2. Make the edit. For JavaScript, run `node --check lineup.js` (or the file you touched).
3. Run `python3 tools/version_assets.py` so phones pick up the new files.
4. Commit, push the branch, and open a pull request with `gh pr create`. Vercel posts a preview link on the PR. Open it and check your change there.
5. Jay approves and merges. Then it goes live.

## Where things are
- `/lineup` → `iara_staff_hub.html` + `lineup.js`: menu, stories, quizzes (`QUIZ_*` arrays), service manual, team bios.
- `/finance` → `iara_finance.html` (`/ops` redirects here) (finance, managers only).
- `/supplies` → `iara_kitchen_ops.html`. `/analytics` → `iara_analytics.html`.
- Routes: `vercel.json`. Offline cache: `sw.js`. Shared styles: `kit/`.
- Data lives in Firebase (project `iara-lineup`). Menu edits can also be made in the app itself (Edit Menu).

## House rules
- Write "iara" in lowercase. Title Case on buttons and headers. Numerals, not words, for numbers.
- No em-dashes in anything staff or guests read. Use a comma, colon or period.
- Never invent menu facts (ingredients, sourcing, allergens, prices). If it isn't confirmed, ask.
- Wine is not in the quiz. The sommelier covers wine.
- Don't change `firestore.rules`, the managers list or anything in Firebase without asking Jay.

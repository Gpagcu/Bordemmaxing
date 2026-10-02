# Security and privacy checklist

Your repository is public, in your own account, and permanent. That is the point
of it, and it is also why this file exists.

## Before the first push

- [x] `.gitignore` includes `.env`, and `git check-ignore -v .env` confirms it
- [x] `git ls-files | grep -iE '\.env$|\.pem$|id_rsa'` prints nothing — confirmed, `.env` has never been tracked in this repo
- [x] `.env.example` is committed, with **placeholder** values only
- [x] No connection string, key or password anywhere in the repository, including in a screenshot — all screenshots in `docs/assets/` are of the app's UI only, never a terminal or editor window. **Separate from this repo check:** the real Neon password and Gemini key were briefly pasted into an AI chat while debugging mid-project. Both were rotated afterward — see `SECURITY-CHECKLIST.md` row 5.
- [x] No `student.json`, and no name, student number or email of yours or anyone else's — the README's Author line has a name only (expected, per the assignment's own documentation guide), no student ID, personal email, or phone number appears anywhere in the repo

Deleting a file later does **not** remove it from the history. If you commit a
credential, **rotate it first**, at the service, and clean up the history second.
The rotation is the fix; the cleanup is hygiene.

## The application

- [x] Every SQL query is parameterised — every query in `server/questsrepo.js` uses `$1`/`$2` placeholders via `pg`, never string-built SQL
- [x] Input is validated **on the server**, not only in React. Length limits on every text field — fixed this week: `POST /api/quests` now rejects quest text over 200 characters and category over 40 server-side, matching (and no longer only relying on) the client's own `maxLength` attributes
- [x] `cors({ origin: allowedOrigins })` names your origins — `CORS_ORIGINS` is an explicit allowlist, never a bare `cors()` with no options
- [x] `NODE_ENV=production` on the host, and no stack trace in any response body — set in Render's Environment tab; every route handler returns a generic `{ error: '...' }` message while logging the real error only server-side via `console.error()`
- [x] `helmet` installed — added this week: `app.use(helmet())` in `server.js`
- [x] Anything that costs money or accepts a password is rate limited — `POST /api/quests/generate` (the Gemini call) is limited to 5 requests/minute per IP; the app has no passwords of its own (Cloudflare Access handles login externally, not the app)
- [ ] Passwords, if you have accounts, are hashed with bcrypt and never logged — **N/A**, this app has no account/password system of its own; access control is handled entirely by Cloudflare Access in front of the deployed app
- [ ] Every route that touches somebody's data has the ownership check **in the query** — **N/A, intentionally.** This project has no real accounts, so quests, history, and hide/delete are documented as deliberately global rather than per-user (see README, Known issues). There is no "somebody's data" to scope a query to.
- [ ] `npm audit` run once, and the easy fixes taken — **action needed:** run `npm audit` in both `client/` and `server/` and note what came back here before final submission; not yet done as of writing this file

## Privacy

- [x] No real classmates' names, numbers, emails or photos, anywhere — this is a solo project; no other individual's personal data appears in seed data, screenshots, or the demo video
- [x] Seed data is invented — all 50 preset quests are invented text, no real person's data
- [x] If real people tested your app, even three friends, their data is deleted before you submit — the only "personal" data the app ever stores is a random, non-identifying per-browser id (`clientId.js`), not names or contact info; nothing to delete on anyone's behalf
- [ ] If your app collects anything about anyone, the app says what it collects — **minor gap:** the app silently generates a random browser id to tag who added/completed a quest, but nothing in the UI discloses this. It's not personally identifying, but a one-line note (similar to the existing `DemoNotice`) would be the honest fix; not added yet
- [x] Any face in a screenshot is stock, generated, or yours — **N/A**, the app has no photos or faces anywhere; every visual is a CSS shape or color

## What to write in your journal

The riskiest thing about this project was pasting the real Neon database
password and Gemini API key directly into an AI chat while debugging a
connection issue — not committed to the repo, but exposed somewhere outside
it all the same. I rotated both afterward and updated them in Render's
dashboard and my local `.env`. What I knowingly accepted, given the time
left before submission: the database still connects using Neon's
full-privilege owner role rather than a permission-scoped one, and `npm
audit` hasn't been run yet. Both are real, named gaps rather than things I
assumed were fine.
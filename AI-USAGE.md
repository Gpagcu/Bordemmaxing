# AI usage

This project was built with AI assistance (Claude, Anthropic). This file is
the record of it.

**Note on commit links below:** each entry needs the real commit SHA from
this repo's history. Find it with `git log --oneline` and match the commit
message to the change described, then replace `<SHA>` in the URL. I've left
these as placeholders rather than guessing, since inventing a commit link
would defeat the point of this file being evidence.

## 1. How I used AI

### 2026-09-20 - Backend scaffolding: schema, seed data, and API

* **Tool:** Claude (Anthropic)
* **What I asked for:** A database schema and Express API for a "side quest
  gashapon" app — quests with a rarity system, weighted random draws, and
  full CRUD.
* **What it gave back:** `server/db/schema.sql`, `server/db/seed.sql` (50
  preset quests across 5 rarity tiers), `server/questsRepo.js`, and
  `server/server.js` with all routes.
* **What I kept, what I changed, and why:** Kept the overall schema and
  route structure. Found and fixed a real bug it introduced myself — an
  unescaped apostrophe in one seed quest's text broke the SQL insert; fixed
  by escaping it properly.
* **Commit:** https://github.com/Gpagcu/Bordemmaxing/commit/42f9a70267d1cf69134cf882afb6791da8cd856e

### 2026-09-20/21 - Deployment environment troubleshooting

* **Tool:** Claude (Anthropic)
* **What I asked for:** Help getting a local Postgres database running for
  development.
* **What it gave back:** Step-by-step guidance across three failed paths
  (local Postgres install, then Docker) before landing on a hosted Neon
  database as the working solution, after Docker failed with a BIOS-level
  virtualization error that isn't fixable in software.
* **What I kept, what I changed, and why:** Switched to Neon entirely,
  abandoning the local/Docker approach given time constraints. This was a
  judgment call on my part to stop chasing a local fix and take the
  faster working path.
* **Commit:** https://github.com/Gpagcu/Bordemmaxing/commit/ce64406d5d9f5b849692d6cce52ccfe274451918

### 2026-09-21 - React frontend: Spin, Add Quest, and History screens

* **Tool:** Claude (Anthropic)
* **What I asked for:** Three screens wired to the backend, matching the
  course template's existing API-switch pattern (`mockApi.js`/`httpApi.js`).
* **What it gave back:** `App.jsx` with tab-based navigation, and the three
  screen components, each following the loading/ready/error/empty state
  pattern from the template's original example.
* **What I kept, what I changed, and why:** Kept the structure and state
  pattern as given. This became the base I built styling and later features
  on top of.
* **Commit:** https://github.com/Gpagcu/Bordemmaxing/commit/a25ec65f4a400b295e87c613a00b286dd00c25e6


### 2026-09-25 - Gemini AI quest generation feature

* **Tool:** Claude (Anthropic)
* **What I asked for:** A way to generate a quest suggestion via an
  external AI API (Gemini), satisfying the project's third-party API
  requirement, called server-side so the key isn't exposed to the browser.
* **What it gave back:** `server/aiService.js`, a new route, and client
  wiring so the "Generate & add with AI" button creates the quest directly
  and shows it in a popup.
* **What I kept, what I changed, and why:** Kept the server-side-only
  design (my own requirement, for security). Had to iterate twice on the
  actual Gemini call — see "Where the AI got it wrong" below.
* **Commit:** https://github.com/Gpagcu/Bordemmaxing/commit/bc3d0dce83390a2de6872a8500e09646e12ac477

### 2026-09-25 - Fixing the unique-quest scoping bug

* **Tool:** Claude (Anthropic)
* **What I asked for:** I noticed I could barely ever draw a unique
  (user-added) quest and asked why, suspecting either bad luck or a bug.
* **What it gave back:** A diagnosis (quests were scoped to a per-browser
  client id, so different sessions had different, tiny effective pools) and
  a rewrite of `questsRepo.js` making unique quests, history, and delete
  global instead of per-browser.
* **What I kept, what I changed, and why:** Kept the fix as given — it
  matched the project's own documented "no real accounts" simplification,
  so scoping by browser was actually unnecessary complexity, not a feature.
* **Commit:** https://github.com/Gpagcu/Bordemmaxing/commit/58e1e104e11ace02485dd2801d8f48f56e0b45e0

### 2026-09-26 - Design system and capsule/wheel spin animation

* **Tool:** Claude (Anthropic)
* **What I asked for:** Responsive styling with a toy-capsule-machine
  aesthetic, then later a redesign after professor feedback that the first
  animation attempt (a simple two-tone capsule) needed more "wow factor."
* **What it gave back:** First a CSS capsule that shook and popped; later
  rebuilt entirely into a spinning conic-gradient color wheel with a fixed
  pointer that decelerates and lands on the drawn rarity.
* **What I kept, what I changed, and why:** Kept the final wheel version.
  Asked for a timing/easing adjustment after testing it myself and finding
  the pacing felt off.
* **Commit:** https://github.com/Gpagcu/Bordemmaxing/commit/bdcdfd24552d5fbe9cff1d301907a0503a91933b


## 2. Where the AI got it wrong

### Case 1 - Unescaped apostrophe broke the seed data

* **What it gave me:** `server/db/seed.sql` with the line
  `('Send a meme to someone who'll appreciate it', ...)`.
* **What was wrong with it:** The apostrophe in "who'll" wasn't escaped for
  SQL, which requires doubling a literal apostrophe (`''`). Running the
  file threw `syntax error at or near "l"`.
* **What I did instead:** Had it find and fix the specific line
  (`who''ll`), then re-ran the seed successfully.
* **Commit:** https://github.com/Gpagcu/Bordemmaxing/commit/42f9a70267d1cf69134cf882afb6791da8cd856e

### Case 2 - Recommended a deprecated Gemini model, then hit a second real issue

* **What it gave me:** `server/aiService.js` using model
  `gemini-2.5-flash`.
* **What was wrong with it:** Google had deprecated that model for new API
  keys — the live API returned a 404 telling me to use `gemini-3.8-flash`
  instead. After switching models, a second, different problem appeared:
  the new model returned an empty response, because Gemini's newer models
  "think" before answering by default and were spending the entire output
  token budget on invisible reasoning, leaving nothing for the actual
  answer.
* **What I did instead:** Updated the model name per Google's own error
  message, then had it add `thinkingConfig: { thinkingBudget: 0 }` to
  disable that reasoning step for this simple task, and added logging of
  the full raw API response so a future failure like this would be
  diagnosable instead of a guessing game.
* **Commit:** https://github.com/Gpagcu/Bordemmaxing/commit/bc3d0dce83390a2de6872a8500e09646e12ac477

### Case 3 - Original unique-quest design scoped by browser, not globally

* **What it gave me:** The first version of the spin logic scoped
  user-added ("unique") quests, quest listings, and history to a per-browser
  client id.
* **What was wrong with it:** This project has no real login system, so
  "per-browser" identity is meaningless and actively confusing — quests I
  added in one browser session were invisible in another, making the
  effective draw pool far smaller than it looked and making the rarity odds
  seem broken when they weren't.
* **What I did instead:** Had it rewrite the relevant functions in
  `questsRepo.js` to treat unique quests, history, and quest deletion as
  global instead of scoped, matching the "no real accounts" simplification
  already documented in the README.
* **Commit:** https://github.com/Gpagcu/Bordemmaxing/commit/f9c02c6e77c5dfebdf703b8d1b1b94845bcd9658

## 3. Who wrote what

*the inital history screen was build by me, this screen simple records all completed quest that have been done*

*the first version of the spinscreen where the animation was a simple sphere that has a shake animation this then was later change to add more visuals *

*the addQeustScreen this was build to add unique quest that are of another rarity and to increase the amount of quest apart from the original 50 quest *

*the css design was adjusted meticulously to better fit the visual apperance of the project*

### Written by me

* File: AddQuestScreen.jsx, aiService.js
* Commit: Generate-with-AI now creates the quest directly
* What it does and why it is built this way: this was a simple change of incorpurating the generate random quest via a GEMINI AI API for completely random quest.

### The AI-written part I understand best

* File:spinScreen.jsx
* Commit: Tweaked the spin animation to be spin-a-wheel
* What it does and why we kept it:originally this was only a simple sphere with a shake animation now it is changed to an actual spin-the-wheel with proper spin-the-wheel animations.

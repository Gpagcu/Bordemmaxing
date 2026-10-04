# Proposal


**Status as of week 3 (final):** fully built and deployed. Backend, frontend,
AI integration, and an access-control layer are all live. What follows is
this document brought up to date — see the "parts most likely to drift"
section below for exactly what changed since the original plan.

## The parts most likely to drift

- **Core features.** Shipped beyond the original plan: AI-generated quests
  (Gemini, server-side), a non-destructive hide/unhide toggle for
  user-added quests, a reset-history action, and a full redesign of the
  spin interaction from a simple shaking capsule into a spinning,
  rarity-colored wheel. Nothing from the original plan was cut.
- **Where each piece is hosted.** Client + access gate: a Cloudflare Worker
  (`bordemmaxing.spinproject.workers.dev`), behind Cloudflare Access.
  API: Express, deployed to Render — rejects any request without a secret
  header the Worker alone holds, so it can't be reached by skipping the
  gate. Database: PostgreSQL, hosted on Neon. GitHub Pages is still
  published but demo-mode only, since it has no way to supply the Worker's
  secret header.
- **The date demo mode goes off.** The *real* deployment (Worker + Render +
  Neon) has been running in real-API mode since week 2. GitHub Pages
  remains demo-mode permanently by design now, not as a temporary state —
  it's the fallback entrance, not the live one.
- **Risks.** The weighted-spin logic (the original "one risk," below) turned
  out fine. The risk that actually materialized was environment and
  deployment debugging — Postgres/Docker/BIOS issues in week 1, then CORS,
  stale deploys, and filename-casing mismatches between Windows and
  Render's Linux runtime in weeks 2–3. See `REPORT.md` and
  `docs/04-weekly-reports.md` for the specifics.

---

## Overview

### Overview
Bordemmaxing is a side-quest app for boredom. Instead of scrolling through
a static to-do list, the user spins a gashapon-style wheel and gets handed
one random quest to do — anything from "drink a glass of water" to a rare
"legendary" challenge — drawn from 50 built-in quests plus any the user
adds themselves (or generates with AI), weighted so rarer quests are
genuinely rarer.

### Problem it solves
Boredom itself isn't the hard part to fix — deciding what to do about it
is. A blank "what should I do" moment, or even a long list of options, adds
friction and often ends in doing nothing (or just more scrolling).
Bordemmaxing removes that decision entirely: one button, one quest, no
browsing required. The rarity system also adds a small reward loop — most
spins are low-effort and common, but every so often something rarer and
more memorable comes up — which gives repeat use a reason to exist beyond
simple utility.

### Main user flow
1. User opens the app and lands on the **Spin** screen (behind a Cloudflare
   Access login — enter an approved email, get a one-time code).
2. They tap **Spin** — a color wheel spins and lands on a random,
   rarity-weighted quest.
3. The drawn quest is shown with its rarity badge and category.
4. The user either does the quest and taps **Mark as done** (logged to
   history), or just spins again if it's not for them right now.
5. On the **Add Quest** screen, they can write their own custom quests, or
   click **Generate & add with AI** to have Gemini suggest one
   automatically. Either way, it joins the pool with its own pull chance.
   Quests can be hidden from the spin pool without being deleted.
6. On the **History** screen, they can look back at everything they've
   completed and when, or reset the log entirely.

### Core features
- **Weighted random spin** — a spinning wheel draws one quest at a time,
  with preset quests pulled according to rarity tier (common → legendary)
  and user-added quests pulled from their own separate `unique` pool.
- **Add your own quests, or generate one with AI** — extend the pool beyond
  the 50 presets, manually or via Gemini.
- **Hide a quest** — a non-destructive toggle that excludes a quest from
  the spin pool without deleting it.
- **Mark quests complete** — each completion is logged individually, so the
  same quest can be done more than once over time.
- **Completion history** — a browsable log of what's been done and when,
  with the option to reset it entirely.
- **Access-gated deployment** — the live app sits behind Cloudflare Access
  (email one-time-PIN login), and the API independently rejects any request
  that doesn't come through that gate.

### Sections or routes this app needs

| # | Section / route | What it is for |
|---|---|---|
| 1 | Spin | The core interaction — spin the wheel, get a random rarity-weighted quest, mark it done. |
| 2 | Add Quest | Add a custom quest (written or AI-generated) to the pool; hide or delete your own quests. |
| 3 | History | Browse everything the user has completed, with timestamps; reset the log. |

Kept to 3 screens, switched by tab state rather than a router — nothing
here needs a bookmarkable URL, so a router would add a dependency for no
benefit. This held true through the final build; no fourth screen was ever
needed.

### State: what data does the app hold?

For the Spin screen, the most important one:

| Data | Shape (rough) | Who owns it (which component) | Changes when... |
|---|---|---|---|
| `quest` | `{ id, text, category, rarity, is_completed, ... }` or `null` | `SpinScreen` | user spins (new quest drawn) or completes the current one |
| `spinning` | `boolean` | `SpinScreen` | a spin request is in flight |
| `rotation` | `number` | `SpinScreen` | the wheel's accumulated rotation — always increases, never resets, so the animation never snaps backward between spins |
| `completing` | `boolean` | `SpinScreen` | a complete request is in flight |
| `error` | `Error` or `null` | `SpinScreen` | a spin or complete request fails |
| `activeTab` | `'spin' \| 'add' \| 'history'` | `App` | user clicks a tab |

Each screen still owns its own data independently — this didn't change
from the original plan. The one addition is `rotation`, which came from
building the wheel animation and wasn't anticipated at proposal time.

### What each screen contains

**Screen: Spin**
- Block 1: Heading + short description ("Bored? Pull the lever and see
  what you get.")
- Block 2: A spinning color wheel with a fixed pointer, plus the Spin
  button (label changes between "Spin" / "Spin again" / "Spinning...") —
  this replaced the originally-planned plain capsule after a redesign for
  more visual impact
- Block 3: Result card — rarity badge, quest text, category, and a "Mark as
  done" button (or a "✓ Completed" state once done)
- Block 4: Inline error message with a retry button, shown only on failure

### Content gathered
- 50 preset quests, written across 5 rarity tiers — done, seeded into the
  database (`server/db/seed.sql`)
- Rarity tier names and pull-weight values — done
- Screenshots of the working UI — done, see `docs/02-mockup.md`
- A demo video for final submission — scripted and recorded, see
  `docs/05-demo-video.md` for the link

### One risk (as originally written) — and what actually happened
The part I was least sure how to build correctly was the weighted random
spin logic — making common quests pull far more often than legendary ones,
while also giving user-added quests their own separate pull chance without
disrupting the preset odds. This turned out fine once the rarity weights
were defined as plain numbers and the pick was done in two steps (rarity
tier first, then a random quest within that tier).

In hindsight, this was not where the real time cost ended up. The actual
biggest risks across the whole project were environment and deployment
problems: no local Postgres, then Docker failing on a BIOS-level
virtualization block in week 1; then, in weeks 2–3, CORS failures between
GitHub Pages and Render, a stale auto-deploy that silently never triggered,
a Windows-versus-Linux filename-casing mismatch that broke the Render build
twice, and finally retrofitting a Cloudflare Access login layer after the
app was already built assuming it would stay open. The lesson worth
keeping for future-me: "the part I'm unsure how to code" and "the part that
costs the most time" are often not the same part at all — and deciding on
the access-control model at the *start* of a project, not the end, would
have avoided most of the week 3 rework.
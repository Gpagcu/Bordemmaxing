# Weekly reports

Five minutes a week. Add a new section at the top; never edit an old one.

The value is entirely in writing them **while it is happening**. What took four
hours and why is invisible a month later, and it is exactly what your journal
needs.

---

## Week of 2026-09-20

**Done.** Database schema and 50 seeded preset quests (five rarity tiers), Express API with all routes, weighted rarity spin logic — all built and confirmed working against a live hosted Postgres database.

**Stuck.** No local Postgres install, then Docker Desktop failed with "virtualization support not detected" — Intel VT-x was disabled in BIOS, which isn't fixable in software alone. Switched to a hosted Postgres instance (Neon) instead, which unblocked everything in a few minutes.

**Hours.** ~10 (most of it environment/database setup, not app code).

**Next.** Build the React frontend — Spin, Add Quest, and History screens — against the now-working backend.

---

## Week of 2026-09-27

**Done.** Full stack actually deployed and live: client on GitHub Pages, API on Render, both talking to the real Neon database in production. AI-powered quest generation via Gemini, called server-side. Fixed a real bug where unique quests were scoped per-browser instead of globally. Added a hide-from-spins toggle and a reset-history action. Rebuilt the spin animation as a color wheel that decelerates and lands on the drawn rarity.

**Stuck.** CORS between GitHub Pages and Render, for two separate reasons stacked on top of each other: first, Render's auto-deploy hadn't actually triggered on push at all, so I was testing against a stale build and "fixing" things that never redeployed. Second, once redeploys were confirmed, CORS_ORIGINS on Render was still literally set to my local http://localhost:5173,5174 instead of the production https://gpagcu.github.io origin. Separately, Gemini's newer model (gemini-3.8-flash) returned an empty response because it "thinks" before answering by default and was spending the whole token budget on invisible reasoning — fixed by setting thinkingConfig.thinkingBudget to 0.

**Hours.** ~15.

**Next.** Rotate the Neon password and Gemini key (pasted both into chat while debugging — need to treat as compromised). Set up Cloudflare Zero Trust in front of the deployed app. Write docs/06-security-and-privacy.md and AI-USAGE.md.

...

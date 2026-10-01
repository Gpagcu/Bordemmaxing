# Bordemmaxing

**Repository:** https://github.com/Gpagcu/Bordemmaxing
**Live site:** https://bordemmaxing.spinproject.workers.dev
**Access:** Gated by Cloudflare Access (email One-Time PIN). Enter an
approved email, you'll receive a short code, and the app loads once it's
verified. Ask to be added to the policy if your email isn't accepted.

## 1. Overview

Bordemmaxing is a "side quest" app for when you're bored. Instead of picking
from a static list, you spin a gashapon-style wheel that draws a random
quest for you to do — anything from "drink a glass of water" to a rare or
"legendary" challenge — drawn from 50 built-in quests plus any you add
yourself, weighted by rarity. You can also generate a quest suggestion with
AI (Gemini) instead of writing your own. It's for anyone who wants a small,
low-stakes nudge to do something different when they're stuck in a boredom
rut.

## 2. Setup and installation

**Prerequisites:**
- [Node.js](https://nodejs.org/) (v18 or later recommended)
- A PostgreSQL database — either a local instance or a free hosted one (this
  project runs against [Neon](https://neon.tech))
- `npm` (comes with Node.js)
- A free [Gemini API key](https://aistudio.google.com/apikey), if you want
  the AI-generate feature to work locally
- A [Cloudflare account](https://dash.cloudflare.com) (free), if you want to
  redeploy the Worker/Access layer rather than just run the app locally

**1. Clone the repo:**
```bash
git clone https://github.com/Gpagcu/Bordemmaxing.git
cd Bordemmaxing
```

**2. Install dependencies:**
```bash
cd server && npm install
cd ../client && npm install
cd ../worker && npm install
cd ..
```

**3. Environment and configuration**

Copy the example env files and fill them in:
```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Variables needed in `server/.env`:

| Variable | Example | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host/dbname?sslmode=require` | Your Postgres connection string |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins, no trailing slash, no path |
| `NODE_ENV` | `development` | Set to `production` on a deployed host |
| `GEMINI_API_KEY` | `your-gemini-api-key-here` | Needed for the "Generate & add with AI" button |
| `PROXY_SECRET` | _(leave unset locally)_ | Only required in production — see "Access control" below. Locally, the server skips this check entirely |
| `PORT` | _(leave unset locally)_ | The host sets this in production; defaults to `4000` locally |

Variables needed in `client/.env`:

| Variable | Example | Notes |
|---|---|---|
| `VITE_USE_MOCK_API` | `false` | Only the exact string `false` turns off demo mode |
| `VITE_API_BASE_URL` | `http://localhost:4000` | For local dev. Leave **empty** when building for the Worker — see "How to run it" |

**Never commit real credentials.** `.env` files are git-ignored; only the
`.env.example` files (with placeholders) are committed.

**4. Set up and seed the database**
```bash
psql <your-database-url> -f server/db/schema.sql
psql <your-database-url> -f server/db/seed.sql
```
This creates the `quests` and `quest_history` tables and inserts 50 preset
quests spread across five rarity tiers. If you're updating an existing
database rather than starting fresh, also run
`server/db/migration-add-is-active.sql`.

## 3. How to run it

**Local development (no Cloudflare involved):**

Start the API:
```bash
node server/server.js
```
You should see `Bordemmaxing API running on port 4000 (development)`.

Start the client, in a separate terminal:
```bash
cd client
npm run dev
```
Open the address Vite prints (typically `http://localhost:5173`).

Quick checks:
```bash
curl http://localhost:4000/healthz     # {"status":"ok"}
curl http://localhost:4000/api/quests  # a list of quests
```

**Production (how the live site actually runs):**

The real deployment is three separate pieces:

1. **Database:** Neon, already live, nothing to run.
2. **API:** Express, deployed to Render. In production it requires every
   request to carry a matching `X-Proxy-Secret` header, or it returns
   `403 Forbidden` — this is what stops anyone from reaching it directly and
   skipping the login gate.
3. **Client + gate:** a Cloudflare Worker that serves the built React app
   and forwards `/api/*` and `/healthz` to Render, attaching the secret
   header itself. Cloudflare Access sits in front of the whole Worker, so
   the secret header is never visible to a browser — only the Worker holds it.

To rebuild and redeploy the Worker after a client change:
```bash
cd client
npm run build          # VITE_API_BASE_URL must be empty for this build
cd ../worker
npx wrangler deploy
```
An empty `VITE_API_BASE_URL` makes the client call relative paths like
`/api/quests`, which resolve against whatever origin loaded the page — the
Worker, in production.

## 4. Features and usage

- **Spin for a quest** — a spinning color wheel draws a random quest.
  Presets are weighted by rarity (common quests are far more likely than
  legendary ones); user-added quests have their own separate pull chance.
  The wheel spins continuously while waiting on the server (which also
  covers Render's free-tier cold-start delay gracefully), then decelerates
  and lands on the drawn rarity's color.
- **Add a quest** — add your own custom quest, or click **Generate & add
  with AI** to have Gemini suggest one automatically. User-added quests
  always get a `unique` rarity.
- **Hide a quest** — a non-destructive toggle that removes one of your own
  quests from the spin pool without deleting it. The category line
  collapses smoothly; the quest itself, its badge, and both action buttons
  stay fully visible and usable.
- **Complete a quest** — mark a drawn quest as done. Each completion is
  logged, so the same quest can be completed more than once over time.
- **View history** — see everything you've completed and when, or reset the
  whole log (and every quest's completion state) with the "Reset history"
  button.

**Main API endpoints** (all require the proxy secret in production, added
automatically by the Worker):

| Method | Path | What it does |
|---|---|---|
| `GET` | `/healthz` | Health check — confirms the API is up and can reach the database |
| `GET` | `/api/quests` | List quests (presets plus all user-added quests) |
| `GET` | `/api/quests/spin` | Draw one random quest (rarity-weighted) |
| `POST` | `/api/quests/generate` | Ask Gemini for a quest suggestion (does not save it; rate-limited to 5/min per IP) |
| `POST` | `/api/quests` | Add a new quest (`{ text, category }`) |
| `PATCH` | `/api/quests/:id/toggle-active` | Hide/unhide a user-added quest from the spin pool |
| `PATCH` | `/api/quests/:id/complete` | Mark a quest as completed |
| `DELETE` | `/api/quests/:id` | Permanently delete a user-added quest |
| `GET` | `/api/history` | List completion history |
| `DELETE` | `/api/history` | Reset history and every quest's completion state |

## 5. Project structure

```
Bordemmaxing/
├── client/                 # React + Vite frontend
│   └── src/
│       ├── api/            # httpApi.js (real), mockApi.js (demo), index.js (switch), clientId.js
│       ├── components/     # SpinScreen, AddQuestScreen, HistoryScreen, DemoNotice
│       ├── App.jsx
│       └── main.jsx
├── server/
│   ├── db/
│   │   ├── pool.js
│   │   ├── schema.sql
│   │   ├── seed.sql
│   │   └── migration-add-is-active.sql
│   ├── questsrepo.js       # Data-access layer + weighted spin logic
│   ├── aiService.js        # Server-side Gemini API call
│   ├── server.js           # Express app, routes, proxy-secret gate, rate limiting
│   └── .env.example
├── worker/                 # Cloudflare Worker: serves the client, proxies to Render
│   ├── src/index.js
│   └── wrangler.jsonc
├── docs/                   # Course-required planning/design docs
├── REPORT.md
├── AI-USAGE.md
└── README.md
```

## 6. Screenshots and Demo Video

spinScreen<img width="712" height="565" alt="image" src="https://github.com/user-attachments/assets/be964d1a-9004-43dd-8370-e50551b083aa" />
addQuestScreen<img width="748" height="546" alt="image" src="https://github.com/user-attachments/assets/26e93f8b-965c-4e76-9c3f-7a2dc4e96b11" />
historyScreen<img width="834" height="752" alt="image" src="https://github.com/user-attachments/assets/c6516fd1-233c-4907-8212-1dfe52ee9e78" />

## Video Link
  **Link:**

## Demo mode

This client can still run two ways, chosen by one environment variable at
**build** time:

| `VITE_USE_MOCK_API` | What happens |
| --- | --- |
| unset, or `true` | The client answers its own requests from `localStorage`. No server, no database, no login. |
| `false` | The client calls the real Express API. **This only works from a build that also has the proxy secret available — in practice, only the Cloudflare Worker build.** |

GitHub Pages, if it's still published, runs in demo mode only. It has no way
to supply the Worker's secret header, so it cannot reach the real API — the
Worker link above is the actual live app.

## 7. Known issues and next steps

**Known issues:**
- No traditional user accounts — identity is a lightweight per-browser id;
  quests, history, and hide/delete actions are intentionally global rather
  than per-user, since there's nothing to scope them to. Cloudflare Access
  controls *who can reach the app at all*, which is a separate layer from
  per-user data ownership.
- `RarityBadge` is still copy-pasted as inline JSX across three components
  instead of being one shared component.
- No server-side maximum-length validation on quest text — only the
  client's input `maxLength`, which a direct API call could bypass (the
  proxy-secret gate limits who can make that call at all, but doesn't
  replace input validation).
- The database connects as Neon's default owner role rather than a
  permission-scoped one.
- A couple of seeded preset quests have minor text/spacing typos from an
  earlier copy-paste.

**Next steps:**
- Extract `RarityBadge` into a real shared component.
- Add server-side length validation on quest text.
- Clean up the typo'd seed entries and reconsider the tone of a couple of
  the "legendary" tier quests.

## Architecture

The React client and the Cloudflare Access gate are the same Worker:
Cloudflare Access checks the visitor's email before anything else loads, and
once past it, the Worker serves the built client and forwards `/api/*` and
`/healthz` to the Express API on Render, attaching a shared secret header.
Render independently rejects any request without that exact header, so the
gate can't be bypassed by finding the raw Render URL. Render is the only
thing that talks to PostgreSQL, hosted on Neon. GitHub Pages, if published,
serves a separate, ungated build restricted to demo mode only.

## Author

Pagcu, Carl Gaebriel J. (@Gpagcu), HAU-6APSI.

## Licence

MIT, see [LICENSE](LICENSE).

---

Parts of this project's setup, debugging, and documentation were assisted by
AI (Claude). See `AI-USAGE.md` for details.
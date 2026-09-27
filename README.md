# Bordemmaxing

**Repository:** https://github.com/Gpagcu/Bordemmaxing
**Live site:** https://gpagcu.github.io/Bordemmaxing/
**API:** https://bordemmaxing.onrender.com/healthz

> Note: Render's free tier spins down after inactivity. The first request
> after idle time can take up to ~50 seconds to respond while it wakes up —
> this is expected, not a bug.

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

**1. Clone the repo:**
```bash
git clone https://github.com/Gpagcu/Bordemmaxing.git
cd Bordemmaxing
```

**2. Install dependencies:**
```bash
cd server
npm install
cd ../client
npm install
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
| `DATABASE_URL` | `postgresql://user:pass@host/dbname?sslmode=require` | Your Postgres connection string (local or hosted) |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins, no trailing slash, no path |
| `NODE_ENV` | `development` | Set to `production` on a deployed host |
| `GEMINI_API_KEY` | `your-gemini-api-key-here` | Needed for the "Generate & add with AI" button; the app works fine without it, that button just won't |
| `PORT` | _(leave unset locally)_ | The host sets this in production; defaults to `4000` locally |

Variables needed in `client/.env`:

| Variable | Example | Notes |
|---|---|---|
| `VITE_USE_MOCK_API` | `false` | Only the exact string `false` turns off demo mode; unset means the app runs on a simulated in-browser backend |
| `VITE_API_BASE_URL` | `http://localhost:4000` | The Express API's URL, no trailing slash |

**Never commit real credentials.** `.env` files are git-ignored; only the
`.env.example` files (with placeholders) are committed.

**4. Set up and seed the database**

Run the schema, then the seed data, against your Postgres instance (via
`psql`, or a hosted provider's SQL editor):
```bash
psql <your-database-url> -f server/db/schema.sql
psql <your-database-url> -f server/db/seed.sql
```
This creates the `quests` and `quest_history` tables and inserts 50 preset
quests spread across five rarity tiers.

## 3. How to run it

**Start the API:**
```bash
node server/server.js
```
You should see:
```
Bordemmaxing API running on port 4000 (development)
```

**Start the client** (in a separate terminal):
```bash
cd client
npm run dev
```
Open the address Vite prints (typically `http://localhost:5173`).

**Quick check the backend is alive and can reach the database:**
```bash
curl http://localhost:4000/healthz
```
should return `{"status":"ok"}`.

```bash
curl http://localhost:4000/api/quests
```
should return JSON — a list of quests.

## 4. Features and usage

- **Spin for a quest** — draw a random quest from a spinning color wheel.
  Presets are weighted by rarity (common quests are far more likely than
  legendary ones); if you've added your own quests, there's a separate
  chance to draw one of those instead. The wheel spins continuously while
  waiting on the server, then decelerates and lands on the drawn rarity's
  color.
- **Add a quest** — add your own custom quest to the pool, or click
  **Generate & add with AI** to have Gemini suggest one and add it
  automatically (shown in a closeable popup). User-added quests always get
  a `unique` rarity, separate from the preset tiers.
- **Hide a quest** — temporarily remove one of your own quests from the
  spin pool without deleting it, using the "Hide from spins" toggle.
  Deleting is separate and permanent.
- **Complete a quest** — mark a drawn quest as done. Each completion is
  logged, so the same quest can be completed more than once over time.
- **View history** — see a log of everything you've completed and when, or
  reset the whole log (and every quest's completion state) with the "Reset
  history" button.

**Main API endpoints:**

| Method | Path | What it does |
|---|---|---|
| `GET` | `/healthz` | Health check — confirms the API is up and can reach the database |
| `GET` | `/api/quests` | List quests (presets plus all user-added quests) |
| `GET` | `/api/quests/spin` | Draw one random quest (rarity-weighted) |
| `POST` | `/api/quests/generate` | Ask Gemini for a quest suggestion (does not save it) |
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
│   │   ├── pool.js         # Postgres connection pool
│   │   ├── schema.sql      # Table definitions
│   │   ├── seed.sql        # 50 preset quests
│   │   └── migration-add-is-active.sql  # adds the hide/unhide column to an existing DB
│   ├── questsRepo.js       # Data-access layer + weighted spin logic
│   ├── aiService.js        # Server-side Gemini API call
│   ├── server.js           # Express app and routes
│   └── .env.example
├── docs/                   # Course-required planning/design docs
├── journal/                # Weekly learning log entries
├── REPORT.md                # Weekly increment reports
├── AI-USAGE.md
└── README.md
```

## 6. Screenshots

spinScreen<img width="712" height="565" alt="image" src="https://github.com/user-attachments/assets/be964d1a-9004-43dd-8370-e50551b083aa" />
addQuestScreen<img width="748" height="546" alt="image" src="https://github.com/user-attachments/assets/26e93f8b-965c-4e76-9c3f-7a2dc4e96b11" />
historyScreen<img width="834" height="752" alt="image" src="https://github.com/user-attachments/assets/c6516fd1-233c-4907-8212-1dfe52ee9e78" />

## Demo mode

This repository can run two ways, chosen by one environment variable at
**build** time.

| `VITE_USE_MOCK_API` | What happens |
| --- | --- |
| unset, or `true` | The client answers its own requests from `localStorage`. No server, no database, nothing shared between visitors. |
| `false` | The client calls the real Express API, which reads and writes real PostgreSQL. **This is what the live GitHub Pages site currently runs.** |

| Piece | Status |
| --- | --- |
| **Client** | Deployed to GitHub Pages, connected to the real API |
| **API** | Deployed to Render, live |
| **Database** | Live, hosted on [Neon](https://neon.tech) |

## 7. Known issues and next steps

**Known issues:**
- No authentication — user identity is a lightweight per-browser id, not
  real login. User-added quests, history, and hide/delete actions are
  intentionally global rather than per-user, since there are no real
  accounts to scope them to.
- The site is public but not yet behind any access control. **Cloudflare
  Zero Trust (email one-time-PIN gate) is planned for the start of week 3**
  to restrict access before staying public longer, per professor feedback.
- No rate limiting on `/api/quests/generate` — it calls a metered external
  API with no throttling yet, which is a real cost risk.
- A temporary `/debug/cors` diagnostic route is still present in
  `server.js` from deployment troubleshooting and needs removing.
- A couple of seeded preset quests have minor text/spacing typos from an
  earlier copy-paste; not yet cleaned up.
- `RarityBadge` is currently copy-pasted as inline JSX across three
  components instead of being one shared component.

**Next steps:**
- Set up Cloudflare Zero Trust in front of the deployed app.
- Rotate the database and Gemini credentials (both were briefly exposed
  during debugging).
- Add rate limiting to the AI-generation endpoint.
- Remove the temporary debug route.
- Clean up the typo'd seed entries and reconsider the tone of a couple of
  the "legendary" tier quests.
- Extract `RarityBadge` into a real shared component.

## Architecture

The React client (Vite, deployed to GitHub Pages) talks to an Express API
(deployed to Render) over HTTPS, which is the only thing that talks to
PostgreSQL directly. The database is hosted on Neon. The client can also run
against a simulated in-browser backend for demo purposes, chosen by one
build-time environment variable, so the interface can be shown even if the
real API is ever asleep or unreachable.

## Author

Pagcu, Carl Gaebriel J. (Gpagcu) , HAU-6APSI.

## Licence

MIT, see [LICENSE](LICENSE).

---

Parts of this project's setup, debugging, and documentation were assisted by
AI (Claude). See `AI-USAGE.md` for details.

# LILA Tic-Tac-Toe — Multiplayer Game

> Production-ready, server-authoritative multiplayer Tic-Tac-Toe built with **Nakama** + **Next.js 15**.

---

## Live Demo

| Component | URL |
|---|---|
| Frontend | `https://lila-tictactoe.vercel.app` *(deploy via Vercel)* |
| Nakama Server | `https://lila-nakama.fly.dev` *(deploy via Fly.io — see below)* |
| Nakama Console | `https://lila-nakama.fly.dev:7351` |

---

## Architecture & Design Decisions

### System Diagram

```
Browser (Next.js 15)
  │
  ├── REST calls  → Nakama HTTP API (:7350)
  │     ├── POST /v2/account/authenticate/email  (login/register)
  │     └── POST /v2/rpc/{id}                    (game RPCs)
  │
  └── WebSocket → Nakama Socket API (:7350)
        ├── matchmakerAdd / matchmakerRemove  (quick match queue)
        ├── matchJoin                         (join match by ID)
        └── matchData (send/receive)          (real-time game events)
              │
              ▼
        Nakama Server (TypeScript Runtime)
          ├── matchmakerMatched hook → matchCreate("tictactoe")
          ├── Match Handler (server-authoritative)
          │     ├── matchInit    — initialise board state
          │     ├── matchJoin    — assign X/O, broadcast start
          │     ├── matchLoop    — validate moves, check win/draw,
          │     │                  drive turn timer (1 tick/sec)
          │     ├── matchLeave   — forfeit unfinished games
          │     └── matchTerminate
          ├── RPC: rpc_find_match  (matchmaker queue)
          ├── RPC: rpc_create_private_room
          ├── RPC: rpc_leave_matchmaker
          ├── RPC: rpc_get_leaderboard
          └── RPC: rpc_get_my_stats
                │
                └──▶ CockroachDB
                      ├── Nakama built-in storage (player_stats)
                      └── Nakama leaderboard (tictactoe_wins)
```

### Key Design Decisions

| Decision | Rationale |
|---|---|
| **Server-authoritative moves** | All board mutations happen inside `matchLoop` on the server. The client sends `position` only — never state. This prevents any client-side cheating. |
| **Nakama TypeScript runtime** | Nakama's TS runtime runs inside the server process (not as a separate service), keeping latency sub-millisecond for state transitions. |
| **Op codes over channels** | Using integer op codes over Nakama's match data pipeline keeps the protocol minimal and easy to version. |
| **CockroachDB for persistence** | Bundled with Nakama, zero extra infra. All player stats and leaderboard data survive server restarts. |
| **1 tick/second match loop** | Drives the turn timer countdown server-side. Clients receive `OP_TIMER_TICK` every second — no client-managed timers, no drift. |
| **Matchmaker string properties** | Mode (`classic`/`timed`) is encoded as a matchmaker string property so you only get paired with someone in the same mode. |
| **Private rooms via match ID** | `rpc_create_private_room` creates an open authoritative match and returns its ID. Friends paste the ID to join — no lobby polling needed. |
| **Next.js App Router + client hooks** | Game state lives in `useGame` hook (client component). No server-side data fetching needed — all state flows through Nakama sockets. |

### Concurrent Games

Nakama's authoritative match system natively supports unlimited concurrent game sessions. Each match is completely isolated:
- Separate match state object per game
- Separate WebSocket subscriptions per player
- No shared mutable state between matches

---

## Features

### Core
- [x] Server-authoritative game logic (all validation server-side)
- [x] Real-time move broadcasting via Nakama WebSocket
- [x] Automatic matchmaking (paired by mode)
- [x] Private room creation + join by ID
- [x] Player disconnect handling (forfeit + win award)
- [x] Email/password authentication via Nakama
- [x] Responsive mobile-first UI

### Bonus
- [x] **Leaderboard** — global win ranking with personal stats (wins, losses, streak, best streak)
- [x] **Timed mode** — 30-second server-side countdown per turn; timeout = forfeit
- [x] **Concurrent games** — unlimited simultaneous matches, each fully isolated
- [x] **Persistent stats** — win/loss/streak stored in Nakama storage, survive restarts

---

## Op Codes (Client ↔ Server Protocol)

| Op Code | Direction | Payload | Description |
|---|---|---|---|
| `1` (OP_MOVE) | Client → Server | `{ position: 0-8 }` | Player makes a move |
| `2` (OP_STATE) | Server → Client | Full `GameState` object | Board state after validated move |
| `3` (OP_GAME_OVER) | Server → Client | `GameOverPayload` | Game ended (win/draw) |
| `4` (OP_TIMER_TICK) | Server → Client | `{ timeLeft, currentTurn }` | Timer countdown (timed mode) |
| `5` (OP_OPPONENT_LEFT) | Server → Client | `{ message }` | Opponent disconnected |

---

## Project Structure

```
lila-tictactoe/
├── nakama-modules/          # Nakama TypeScript server module
│   ├── src/
│   │   └── main.ts          # All server logic (match handler + RPCs)
│   ├── build/               # Compiled JS (gitignored, generated by tsc)
│   │   └── index.js
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                # Next.js 15 application
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx     # Main game page (all-in-one SPA)
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── Board.tsx        # 3×3 interactive grid
│   │   │   ├── Timer.tsx        # Countdown bar (timed mode)
│   │   │   ├── GameOverModal.tsx # Result screen
│   │   │   └── Leaderboard.tsx  # Rankings + personal stats
│   │   ├── hooks/
│   │   │   ├── useGame.ts   # Core game logic + socket events
│   │   │   └── useAuth.ts   # Session management
│   │   ├── lib/
│   │   │   └── nakama.ts    # Nakama client + RPC helpers
│   │   └── types/
│   │       └── game.ts      # Shared TypeScript types + op codes
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── docker-compose.yml       # Local full-stack dev environment
└── README.md
```

---

## Setup & Installation

### Prerequisites
- [Node.js 20+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Option A — Docker Compose (Recommended)

```bash
# 1. Clone the repo
git clone https://github.com/your-username/lila-tictactoe.git
cd lila-tictactoe

# 2. Build the Nakama TypeScript module
cd nakama-modules
npm install
npm run build        # compiles src/main.ts → build/index.js
cd ..

# 3. Start everything (CockroachDB + Nakama + Frontend)
docker compose up --build

# Services:
#   Frontend:        http://localhost:3000
#   Nakama HTTP API: http://localhost:7350
#   Nakama Console:  http://localhost:7351  (admin/admin)
#   CockroachDB UI:  http://localhost:8080
```

### Option B — Frontend Dev Server (with running Nakama)

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local if your Nakama is not on localhost:7350
npm install
npm run dev
# Frontend: http://localhost:3000
```

---

## Deployment

### Deploy Nakama to Fly.io

Fly.io is the simplest path for Nakama deployment (persistent volumes, cheap, global).

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# From the repo root
fly launch --name lila-nakama --region lhr --no-deploy

# Attach a volume for data persistence
fly volumes create nakama_data --size 5 --region lhr

# Set secrets
fly secrets set NAKAMA_CONSOLE_PASSWORD=your-strong-password

# Deploy
fly deploy
```

**`fly.toml`** (place in repo root):

```toml
app = "lila-nakama"
primary_region = "lhr"

[build]
  image = "registry.heroiclabs.com/heroiclabs/nakama:3.22.0"

[mounts]
  source = "nakama_data"
  destination = "/nakama/data"

[[services]]
  internal_port = 7350
  protocol = "tcp"
  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
  [[services.ports]]
    port = 80
    handlers = ["http"]

[env]
  NAKAMA_DATABASE_ADDRESS = "root@<your-cockroachdb-url>"
```

> For CockroachDB in production, use [CockroachDB Serverless](https://cockroachlabs.com/free) (free tier) and set `NAKAMA_DATABASE_ADDRESS` accordingly.

### Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

cd frontend
vercel --prod
```

Set these environment variables in the Vercel dashboard:
```
NEXT_PUBLIC_NAKAMA_HOST=lila-nakama.fly.dev
NEXT_PUBLIC_NAKAMA_PORT=443
NEXT_PUBLIC_NAKAMA_USE_SSL=true
NEXT_PUBLIC_NAKAMA_KEY=defaultkey
```

---

## Testing Multiplayer Functionality

### Method 1 — Two Browser Tabs (Quickest)

1. Open `http://localhost:3000` in **Tab 1** → Register as `player1@test.com`
2. Open `http://localhost:3000` in **Tab 2** (or incognito) → Register as `player2@test.com`
3. On both tabs: select **Classic** mode → click **Quick Match**
4. Both players match within seconds → game starts
5. Alternate clicking cells. Only the active player's turn is clickable — server rejects out-of-turn moves

### Method 2 — Private Room

1. Tab 1: click **Create Private Room** → copy the Room ID
2. Tab 2: click **Join with Room ID** → paste ID → Join
3. Game starts immediately

### Method 3 — Timed Mode Timeout Test

1. Start a **Timed** mode match
2. Have one player do nothing for 30 seconds
3. Observe server-side forfeit → other player wins automatically

### Verifying Server-Authority (Cheat Prevention)

Open browser DevTools on either tab and try:
```javascript
// This does nothing — the server ignores out-of-turn messages
socket.sendMatchState(matchId, 1, encoder.encode(JSON.stringify({ position: 0 })));
```
Only the player whose `sessionId === state.currentTurn` can place marks.

---

## API Reference

### RPC Endpoints (call via `POST /v2/rpc/{id}`)

| RPC ID | Auth | Payload | Returns |
|---|---|---|---|
| `rpc_find_match` | Required | `{ "mode": "classic"\|"timed" }` | `{ "ticket": "...", "mode": "..." }` |
| `rpc_leave_matchmaker` | Required | `{ "ticket": "..." }` | `{ "success": true }` |
| `rpc_create_private_room` | Required | `{ "mode": "classic"\|"timed" }` | `{ "matchId": "...", "mode": "..." }` |
| `rpc_get_leaderboard` | Required | `{}` | `{ "records": [...] }` |
| `rpc_get_my_stats` | Required | `{}` | `{ "wins", "losses", "streak", "bestStreak" }` |

### Authentication

```bash
# Register / Login
curl -X POST http://localhost:7350/v2/account/authenticate/email \
  -H "Authorization: Basic $(echo -n 'defaultkey:' | base64)" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123","create":true,"username":"testuser"}'
```

---

## Nakama Configuration

Key Nakama server settings (set via CLI args or config file):

| Setting | Value | Purpose |
|---|---|---|
| `session.token_expiry_sec` | `7200` | 2-hour JWT sessions |
| `runtime.js_entrypoint_filepath` | `/nakama/data/modules/index.js` | Compiled TS module |
| `logger.level` | `INFO` | Server logs |
| `tickRate` | `1` | 1 tick/sec per match (drives timer) |

---

## Scalability Notes

- Nakama runs stateful match handlers in-process. For horizontal scaling, use Nakama's [cluster mode](https://heroiclabs.com/docs/nakama/getting-started/cluster/) with multiple nodes behind a load balancer.
- Each match is pinned to one node via consistent hashing on match ID.
- CockroachDB scales horizontally without application changes.
- The frontend is completely stateless and scales infinitely on Vercel/CDN.

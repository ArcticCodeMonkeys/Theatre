# Theatre

Theatre is an open-source, browser-based virtual tabletop (VTT) for **Ruin**, a tabletop role-playing game inspired by Nimble and D&D. It combines a layered tactical map, character sheets, shared images, chat, live player presence, reaction prompts, and a TypeScript rules engine in a single pnpm monorepo.

The project is currently an early playable foundation. The client, server, authentication flow, shared map state, character-sheet persistence, image library, chat, targeting tools, and several Ruin mechanics are implemented. The architecture document contains the broader target design; features marked as planned below are not necessarily available yet.

## What Theatre Is For

Theatre is designed to support online or locally hosted Ruin sessions with:

- A gridded map for arranging backgrounds, terrain, objects, and tokens.
- Character sheets with Ruin's four ability stats, three health tracks, resources, attacks, conditions, equipment, and notes.
- Reusable attack data with range, damage, damage types, conditions, and Ruin effects.
- Shared map updates and player presence through Socket.IO.
- A server-side data layer for users, sheets, images, map state, and chat messages.
- Google-based sign-in and per-user sheet ownership for multiplayer reaction prompts.
- A shared rules engine that can be used by both the browser client and the server.

## Current Features

### Map and tokens

- Square grid rendering with tile-based positioning.
- Separate map and token layers.
- Image upload and image-library browsing.
- Dragging images onto the map.
- Layer selection, reordering, movement between layers, deletion, and dimension editing.
- Context-menu actions for placed images.
- Map serialization and hydration for persistence and synchronization.
- Target selection for attacks, including area-of-effect geometry and tile warnings.

### Character sheets

- Multiple sheet windows can be opened at once.
- Windows can be moved, resized, focused, and closed.
- Editable identity, class, race, background, level, stats, skills, saves, health, mana, equipment, feats, attacks, conditions, and notes.
- Token images can be associated with sheets.
- Attack actions can start the client targeting flow.
- Sheets can be saved and loaded through the server API.

### Multiplayer and communication

- Google OAuth login with Express sessions and Passport.
- First-login username setup.
- Online-user presence list.
- Shared chat and roll messages.
- Live map synchronization.
- Cross-client reaction prompts and responses.
- A server health endpoint at `/health`.

### Rules engine

The `@theatre/rules-engine` package is independent of the DOM and exports shared TypeScript logic for:

- Dice and Ruin roll modifiers.
- Static, dynamic, and contested checks.
- Creatures, stats, health tracks, and character state.
- Attack definitions and damage sources.
- Defend, Avoid, Resist, and Persist reactions.
- Conditions and stackable condition severity.
- Combat parties, initiative, and rounds.
- Momentum and Ruin thresholds.
- Short, brief, and long rests.

## Repository Layout

```text
Theatre/
├── packages/
│   ├── client/              # React + Vite browser application
│   │   ├── src/renderer/    # Canvas, map state, targeting geometry
│   │   ├── src/ui/          # Sheets, chat, auth, panels, HUDs
│   │   ├── src/lib/         # Dice and Socket.IO client helpers
│   │   └── src/types/       # Client-facing data types
│   ├── rules-engine/        # Shared, pure TypeScript Ruin mechanics
│   │   └── src/
│   └── server/              # Express, Socket.IO, auth, APIs, persistence
│       ├── src/
│       └── uploads/         # Runtime image assets checked into this workspace
├── docs/
│   ├── Architecture-Plan.md # Target architecture and implementation phases
│   ├── Project-Goals.md      # Product and design goals
│   ├── Ruin-Rules.md         # Working Ruin rules reference
│   └── CHANGELOG.md          # Project change history
├── dev.ps1                  # Windows launcher for client and server
├── package.json             # Workspace scripts
├── pnpm-workspace.yaml      # pnpm package configuration
└── tsconfig.base.json       # Shared TypeScript compiler settings
```

## Technology Stack

| Area | Technology |
| --- | --- |
| Language | TypeScript |
| Client UI | React 18 |
| Client build tool | Vite 5 |
| Map rendering | Pixi.js 8 |
| Client state | React state and local refs, with Zustand available for shared state |
| Realtime transport | Socket.IO 4 |
| Server | Node.js, Express 4, and Socket.IO |
| Authentication | Passport Google OAuth 2.0 and `express-session` |
| Persistence | SQL.js, an SQLite-compatible in-memory database exported to a file |
| Monorepo | pnpm workspaces |
| Rules tests | Vitest |

## Prerequisites

- Node.js 18 or newer is recommended.
- pnpm 8 or newer is recommended.
- A Google OAuth application is needed for the normal login flow.
- PowerShell is needed for the optional `dev.ps1` launcher on Windows.

Check the installed tools with:

```powershell
node --version
pnpm --version
```

## Installation

Clone the repository, enter the project directory, and install all workspace dependencies:

```powershell
pnpm install
```

The workspace links `@theatre/rules-engine` into both the client and server packages automatically.

## Configuration

The server reads environment variables through `dotenv`. Create a `.env` file in the directory from which the server is started, normally the repository root:

```dotenv
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
SESSION_SECRET=replace-this-with-a-long-random-value
PORT=3001
```

Only `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are required for Google login. If they are missing, the server still starts, but authentication through Google will fail. The development fallback session secret is `dev-secret-change-me`; do not use that value outside local development.

### Google OAuth callback

The current development callback is fixed to:

```text
http://localhost:3001/auth/google/callback
```

Add that URL to the Google OAuth client's authorized redirect URIs. The client is expected at:

```text
http://localhost:5173
```

The authentication implementation currently redirects back to that local client URL after login, so production hosting will require making those URLs configurable.

## Running the Application

### Start both services on Windows

From the repository root:

```powershell
.\dev.ps1
```

This launcher stops stale listeners on ports `3001` and `5173`, then opens separate PowerShell windows for the server and client.

Open the client at [http://localhost:5173](http://localhost:5173). The server runs at [http://localhost:3001](http://localhost:3001), and its health check is available at [http://localhost:3001/health](http://localhost:3001/health).

### Start services manually

Run these commands in separate terminals:

```powershell
pnpm dev:server
pnpm dev
```

The equivalent package-specific commands are:

```powershell
pnpm --filter @theatre/server dev
pnpm --filter @theatre/client dev
```

To run both package development processes from one terminal:

```powershell
pnpm dev:all
```

### Production-style local run

Build every package first:

```powershell
pnpm build
```

Then start the compiled server:

```powershell
pnpm --filter @theatre/server start
```

The client build is written by Vite to `packages/client/dist`. It can be previewed with:

```powershell
pnpm --filter @theatre/client preview
```

The current server is configured primarily for the local Vite client, so production deployment needs additional configuration for CORS, OAuth callback URLs, cookies, and serving or hosting the client bundle.

## Workspace Commands

From the repository root:

| Command | Purpose |
| --- | --- |
| `pnpm install` | Install workspace dependencies |
| `pnpm dev` | Start the Vite client |
| `pnpm dev:server` | Start the server with `tsx watch` |
| `pnpm dev:all` | Start client and server in parallel |
| `pnpm build` | Build rules engine, client, and server |
| `pnpm test` | Run the rules-engine Vitest suite |
| `pnpm --filter @theatre/rules-engine dev` | Watch-build the shared package |
| `pnpm --filter @theatre/client build` | Type-check and build the client |
| `pnpm --filter @theatre/server build` | Compile the server |
| `pnpm --filter @theatre/server start` | Run the compiled server |

## Server API and Realtime Events

The server listens on port `3001` by default.

### HTTP endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Returns `{ "status": "ok" }` |
| `GET /auth/google` | Starts Google OAuth |
| `GET /auth/google/callback` | Handles the OAuth callback |
| `GET /auth/me` | Returns the current session user |
| `PATCH /auth/me/username` | Sets or updates the current username |
| `POST /auth/logout` | Destroys the current session |
| `GET /api/map` | Loads the persisted map state |
| `PUT /api/map` | Replaces the persisted map state |
| `GET /api/users` | Lists known users |
| `/api/images` | Image upload and image-library routes |
| `/api/sheets` | Character-sheet routes |
| `/api/chat` | Chat and roll-message routes |

The client sends credentials with authenticated requests. CORS is currently restricted to `http://localhost:5173` with credentials enabled.

### Socket.IO events

The current realtime events include:

- `user:join`: register a connected user's presence.
- `users:update`: broadcast the current online-user list.
- `map:push`: persist a client's map state and relay it to other clients.
- `map:update`: receive a map update from another client.
- `reaction:prompt`: relay an attacker's reaction request to the relevant defender.
- `reaction:response`: relay the defender's chosen reaction back to the attacker.

## Data and Persistence

The server initializes a SQL.js database and creates or migrates tables for:

- `users`
- `images`
- `sheets`
- `map_state`
- `chat_messages`

SQL.js keeps the database in memory while the process runs and writes the exported database to a local file whenever `persist()` is called. The database and uploaded files are runtime state, not a replacement for a production database or object-storage service. Back up or remove generated state deliberately when resetting a development world.

The database schema includes the core sheet fields: Ruin stats and dice, skill and save data, HP, Mental, Grave, AP, reactions, mana, momentum, conditions, equipment, feats, attacks, notes, token image, and ownership.

## Ruin Rules in Brief

The rules engine follows the working rules reference in [docs/Ruin-Rules.md](docs/Ruin-Rules.md).

### Stats and health

Ruin uses four stats:

- **Might (MIG):** strength, constitution, physical force, and endurance.
- **Dexterity (DEX):** speed, balance, stealth, and precision.
- **Will (WIL):** perception, medicine, recall, and mental resolve.
- **Presence (PRE):** influence, arcana, nature, soul, and magical resonance.

Each creature has three health tracks:

- **HP:** physical health and ordinary attack damage.
- **Mental:** the will to keep fighting and a resource against control effects.
- **Grave:** the strength of the soul and the creature's relationship with death.

### Checks and dice

- Static checks use the relevant stat score plus skill bonus.
- Dynamic checks roll the relevant ability die plus skill bonus.
- Contested checks compare the results of two creatures.
- Critical success occurs at least 5 above the DC; critical failure occurs at least 5 below it.
- Dice range from `1` through `d4`, `d6`, `d8`, `d10`, and `d12`.
- `Die Higher` and `Die Lower` move one step through that ordered die scale.
- `Force` adds a die; `Graze` removes a die, subject to the attack's damage-source rules.

### Attacks and reactions

Ruin attacks generally roll damage rather than rolling to hit. The target uses a reaction to reduce or negate the result. The basic reactions are:

- **Defend:** Might die.
- **Avoid:** Dexterity die.
- **Resist:** Will die.
- **Persist:** Presence die.

Attack tags such as Binary, Contested, Melee, Ranged, Spell, and Weapon describe how an attack behaves and what defenses can respond to it.

### Momentum and Ruin

Rolling a die's maximum gives the party Momentum. When the party reaches `10 × party size` Momentum, it gains Ruin. Attacks and spells can define a Ruin effect that becomes available while Ruin is held.

## Development Guidelines

- Keep game rules in `packages/rules-engine` when they can remain pure and reusable.
- Keep browser-only rendering and interaction in `packages/client`.
- Keep persistence, authentication, realtime coordination, and authoritative validation in `packages/server`.
- Prefer typed data objects for creatures, attacks, conditions, sheets, and map state.
- Automate mechanical resolution such as dice, damage, conditions, resources, and rest recovery while leaving meaningful action and reaction choices to players.
- Treat the server as the authority for multiplayer state and contested resolution as those systems mature.
- Update the relevant document in `docs/` when a rule, architectural decision, or project goal changes.

## Roadmap

The planned work is organized in the architecture document as follows:

1. **Foundation:** complete the shared rules primitives, map grid, and token movement.
2. **Combat loop:** deepen attacks, reactions, momentum, initiative, and combat logging.
3. **Character and compendium:** add searchable rules content, richer character data, resources, rests, armor, shields, and spells.
4. **Map and assets:** improve layered image workflows, token customization, measuring, and dice tools.
5. **Multiplayer:** strengthen sessions, synchronization, server authority, permissions, and durable storage.
6. **Polish:** add dynamic lighting, fog of war, multiple maps, presets, tutorials, and hosted deployment.

See [docs/Architecture-Plan.md](docs/Architecture-Plan.md) for the detailed module breakdown and milestone checklist.

## Troubleshooting

### The client cannot connect to the server

Confirm that the server is running on port `3001`, then visit `/health`. If using a different port, update the client API and Socket.IO configuration; the current client has local development URLs in several modules.

### Google login fails

Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are present, that the callback URL exactly matches the Google OAuth configuration, and that the server was restarted after changing `.env`.

### The login session is not preserved

Use the same `localhost` hostname consistently for client and server, keep credentials enabled, and check that the browser is not blocking the session cookie. The development cookie is intentionally not marked `secure` because local HTTP is used.

### Port `3001` or `5173` is already in use

Run `dev.ps1`, which attempts to stop stale listeners on both ports, or stop the owning process manually before starting the services again.

### The database looks stale or corrupted

Stop the server before moving or deleting its generated database file. The next server start recreates the schema and default map row, but deleting the database also deletes local users, sheets, chat history, and image metadata.

## Project Status

Theatre is a private version `0.0.1` prototype under active development. APIs, data shapes, authentication configuration, and the rules-engine surface may change while the core game loop is being built.

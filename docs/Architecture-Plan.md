# Theatre VTT — Architecture & Actionable Plan

---

## Tech Stack Decision

### Chosen Stack: **JavaScript (TypeScript) — Web-Based**

**Reasoning over alternatives:**

| Factor | C++ | Java | JavaScript (TS) |
|---|---|---|---|
| Multiplayer / Networking | Hard (manual sockets) | Moderate (Spring, Netty) | Easy (Socket.IO, WebRTC) |
| UI / Canvas Rendering | Hard (no native web canvas) | Moderate (JavaFX/Swing) | Easy (HTML5 Canvas / Pixi.js) |
| Live Deployment (Roll20-like) | Very Hard | Moderate | Easy (host anywhere, browser-native) |
| Modular, scalable UI | Hard | Moderate | Easy (component architecture) |
| Time to working prototype | Slow | Moderate | Fast |
| Cross-platform play | Requires compilation | Requires JVM | Browser-native |

JavaScript with TypeScript gives strong typing (important for the rules engine) while being browser-native — perfectly suited for a Roll20-style VTT.

---

### Core Libraries & Tools

| Layer | Tool | Purpose |
|---|---|---|
| Language | **TypeScript** | Type safety across rules engine and UI |
| Rendering | **Pixi.js v8** | WebGL-accelerated 2D canvas for map, tokens, grid |
| Framework | **React** | UI panels (character sheet, compendium, HUD) |
| State Management | **Zustand** | Lightweight shared game state |
| Multiplayer | **Socket.IO** | Real-time bidirectional events (moves, attacks, rolls) |
| Backend | **Node.js + Express** | Game session server, rules authority |
| Build Tool | **Vite** | Fast dev server and bundling |
| Testing | **Vitest** | Unit tests for the rules engine |
| Persistence | **SQLite (via better-sqlite3)** | Local session/character/map storage |

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      Browser Client                      │
│                                                          │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────┐  │
│  │  Pixi.js    │   │  React UI    │   │  Rules       │  │
│  │  Renderer   │   │  Panels      │   │  Engine      │  │
│  │  (Map/Grid/ │   │  (CharSheet/ │   │  (Checks,    │  │
│  │   Tokens)   │   │   Compendium/│   │   Attacks,   │  │
│  │             │   │   HUD)       │   │   Conditions)│  │
│  └──────┬──────┘   └──────┬───────┘   └──────┬───────┘  │
│         └─────────────────┴──────────────────┘          │
│                           │                              │
│                    ┌──────▼──────┐                       │
│                    │  Zustand    │                       │
│                    │  Game State │                       │
│                    └──────┬──────┘                       │
│                           │ Socket.IO Client             │
└───────────────────────────┼──────────────────────────────┘
                            │ WebSocket
┌───────────────────────────┼──────────────────────────────┐
│              Node.js + Express Server                    │
│                           │                              │
│                    ┌──────▼──────┐                       │
│                    │  Socket.IO  │                       │
│                    │  Server     │                       │
│                    └──────┬──────┘                       │
│                           │                              │
│         ┌─────────────────┼─────────────────┐            │
│  ┌──────▼──────┐   ┌──────▼──────┐  ┌───────▼──────┐    │
│  │  Session    │   │  Rules      │  │  SQLite DB   │    │
│  │  Manager   │   │  Authority  │  │  (maps,chars,│    │
│  │            │   │  (validates │  │   sessions)  │    │
│  │            │   │   rolls)    │  │              │    │
│  └────────────┘   └─────────────┘  └──────────────┘    │
└──────────────────────────────────────────────────────────┘
```

---

## Module Breakdown

### 1. `rules-engine` (Shared — used by both client and server)
The core of everything. Encodes Ruin's rules as pure TypeScript logic.

- **`Creature`** — Base object for all creatures (PCs, NPCs, monsters). Contains stats (MIG/DEX/WIL/PRE), health bars (HP/Mental/Grave), conditions, equipped items.
- **`StatBlock`** — Scores and dice (e.g., `MightDie: "d8"`, `MightScore: 4`)
- **`DiceRoller`** — Handles the d4/d6/d8/d10/d12 system, Die Higher/Lower, Force/Graze, min/max tracking for Momentum
- **`Check`** — Static, Dynamic, and Contested check resolution with DC and Degrees of Success
- **`Attack`** — Tags (Binary, Contested, Melee, Ranged, Spell, Weapon), damage sources, Ruin effect
- **`Reaction`** — Defend/Avoid/Resist/Persist with die subtraction logic
- **`ConditionManager`** — All conditions, stackable severity, duration tracking, resistances/immunities/vulnerabilities
- **`CombatEngine`** — Party grouping, Ambush detection, Initiative (Ready/Surprised), Round phases (R1/R2/S1/S2), AP/Reaction tracking
- **`MomentumTracker`** — Per-party momentum counters, Ruin threshold (10 × party size), enemy momentum
- **`RestManager`** — Short/Brief/Long rest logic, Exhaustion, HP/Mental/Grave recovery

---

### 2. `renderer` (Client — Pixi.js)
Handles all visual output on the map canvas.

- **`GridLayer`** — Renders the square grid (configurable cell size), snapping
- **`MapLayer`** — Layered image import system (background, terrain, object, token layers)
- **`TokenLayer`** — Creature tokens with HP bar overlays, condition icons
- **`MeasureTool`** — Distance measuring overlays (in feet, using grid cells)
- **`LightingLayer`** *(stretch)* — Dynamic lighting and fog of war

---

### 3. `ui` (Client — React)
All panel-based UI outside the canvas.

- **`CharacterSheetPanel`** — Editable sheet: stats, skills, health bars, feats, equipment slots (armor/boots/ring/etc.), spells, mana
- **`CompendiumPanel`** — Searchable list of feats, conditions, weapons, spells, rules. Drag-onto-sheet to apply.
- **`AttackTemplateBuilder`** — Form to define an attack: tags, range, damage dice per source, damage types, conditions inflicted, Ruin effect. Saves as a reusable template.
- **`DiceRollerWidget`** — Manual dice roller respecting the Die Higher/Lower/Force/Graze modifiers
- **`InitiativeTracker`** — Displays Ready/Surprised groups, current phase, AP/Reaction counters per creature
- **`CombatLog`** — Feed of all rolls, reactions, damage taken, conditions applied
- **`ReactionQueryPopup`** — When an attack resolves, prompts the targeted player to choose a reaction (Defend/Avoid/Resist/Persist or a feature reaction), then auto-applies the result
- **`ResourceTracker`** — Tracks mana, uses-per-rest, spell slots, item charges. Auto-recharges on rest.

---

### 4. `server` (Node.js)
Authoritative game session host.

- **`SessionManager`** — Creates/joins sessions, manages connected players, GM designation
- **`GameStateSync`** — Broadcasts state changes to all clients via Socket.IO
- **`RulesAuthority`** — Server-side validation of rolls and rule applications (prevents cheating)
- **`Persistence`** — Saves/loads sessions, maps, character sheets to SQLite

---

## Data Models (Key Types)

```typescript
// Every combatant in the game extends this
interface Creature {
  id: string;
  name: string;
  stats: { MIG: StatEntry; DEX: StatEntry; WIL: StatEntry; PRE: StatEntry; };
  health: { HP: HealthBar; Mental: HealthBar; Grave: HealthBar; };
  conditions: ActiveCondition[];
  equipment: EquipmentSlots;
  feats: Feat[];
  ap: number;        // current AP (max 3)
  reactions: number; // current reactions (max 3)
}

interface StatEntry {
  score: number;     // flat number added to Static Checks
  die: DieFace;      // d4 | d6 | d8 | d10 | d12 | 1 — used for Dynamic Checks & Saves
}

type DieFace = 1 | 4 | 6 | 8 | 10 | 12;

interface AttackTemplate {
  id: string;
  name: string;
  tags: AttackTag[];          // "Binary" | "Contested" | "Melee" | "Ranged" | "Spell" | "Weapon"
  damageSources: DamageSource[];
  conditions: ConditionEffect[];
  ruinEffect: string;         // description or structured effect
  range: number;              // in feet
}

interface DamageSource {
  diceCount: number;
  dieFace: DieFace;
  damageType: DamageType;
}

interface ActiveCondition {
  name: ConditionName;
  severity?: number;   // for stackable conditions
  duration: DurationRule;
}
```

---

## Actionable Milestones

### Phase 1 — Foundation (Weeks 1–3)
- [ ] Initialize Vite + React + TypeScript project
- [ ] Set up Pixi.js canvas inside a React component
- [ ] Implement `rules-engine` core: `Creature`, `StatBlock`, `DiceRoller`, `Check`
- [ ] Implement `ConditionManager` (all listed conditions, stackable severity)
- [ ] Implement basic `CombatEngine` (parties, initiative, rounds)
- [ ] Render a basic grid with configurable cell size
- [ ] Place and move a token on the grid

### Phase 2 — Combat Loop (Weeks 4–6)
- [ ] Implement `Attack` system with all tag classifications
- [ ] Implement `Reaction` system (Defend/Avoid/Resist/Persist) with die subtraction
- [ ] Build `ReactionQueryPopup` — prompt target, resolve result, apply damage
- [ ] Build `AttackTemplateBuilder` UI
- [ ] Implement `MomentumTracker` (min/max detection, Ruin threshold)
- [ ] Build `InitiativeTracker` UI (Ready/Surprised, phase display, AP/Reactions)
- [ ] Build `CombatLog`

### Phase 3 — Character & Compendium (Weeks 7–9)
- [ ] Build `CharacterSheetPanel` (all stats, health bars, skills, feats, equipment slots)
- [ ] Build `CompendiumPanel` with feat/condition/weapon/spell data
- [ ] Implement `ResourceTracker` with rest-based recharging
- [ ] Implement `RestManager` (Short/Brief/Long, HP/Mental/Grave recovery, Exhaustion)
- [ ] Implement armor (bonus Defend die) and shield (Block reaction, shield HP)
- [ ] Implement spell/mana system with `Spell Malfunction` table

### Phase 4 — Map & Assets (Weeks 10–12)
- [ ] Layered image import (background / terrain / object / token layers)
- [ ] Token customization (image, name, HP bar visibility)
- [ ] `MeasureTool` for distance overlays
- [ ] `DiceRollerWidget` standalone panel

### Phase 5 — Multiplayer (Weeks 13–16)
- [ ] Set up Node.js + Express + Socket.IO server
- [ ] `SessionManager` — create/join by session code
- [ ] `GameStateSync` — broadcast map moves, attacks, rolls, condition changes
- [ ] `RulesAuthority` — server validates all contested rolls and damage applications
- [ ] SQLite persistence for sessions, maps, characters
- [ ] GM vs Player permission system (GM sees all, players see only their token's FOV)

### Phase 6 — Polish & Stretch Goals (Ongoing)
- [ ] Dynamic lighting + fog of war
- [ ] Full searchable Rules Compendium (rendered Markdown)
- [ ] Multiple map support and map presets
- [ ] Tutorial / onboarding mode
- [ ] Deploy to web service (Railway, Fly.io, or similar)

---

## Project Structure

```
theatre/
├── packages/
│   ├── rules-engine/         # Pure TS, no DOM deps — shared by client + server
│   │   ├── src/
│   │   │   ├── creature.ts
│   │   │   ├── dice.ts
│   │   │   ├── checks.ts
│   │   │   ├── attacks.ts
│   │   │   ├── reactions.ts
│   │   │   ├── conditions.ts
│   │   │   ├── combat.ts
│   │   │   ├── momentum.ts
│   │   │   └── resting.ts
│   │   └── package.json
│   ├── client/               # Vite + React + Pixi.js
│   │   ├── src/
│   │   │   ├── renderer/     # Pixi.js layers
│   │   │   ├── ui/           # React panels
│   │   │   ├── state/        # Zustand stores
│   │   │   └── socket/       # Socket.IO client hooks
│   │   └── package.json
│   └── server/               # Node.js + Express + Socket.IO
│       ├── src/
│       │   ├── session.ts
│       │   ├── sync.ts
│       │   ├── authority.ts
│       │   └── db.ts
│       └── package.json
├── docs/
│   ├── Ruin-Rules.md
│   ├── Project-Goals.md
│   └── Architecture-Plan.md
└── package.json              # pnpm workspace root
```

> Using **pnpm workspaces** to manage the monorepo so `rules-engine` can be imported by both `client` and `server` without duplication.

---

## Key Design Principles (from Project Goals)

1. **Modularity first** — Every game concept (`Creature`, `AttackTemplate`, `Feat`) is a self-contained typed object that can be referenced and reused everywhere.
2. **Automate mechanics, not decisions** — Dice rolls, damage application, condition tracking, and AP deduction are automated. What reaction to take, what action to use — left to the player.
3. **UI appears when needed** — Reaction popups only appear on-demand. Compendium is a panel, not always-visible clutter.
4. **Server is authoritative** — All contested rolls and damage resolution are validated server-side to keep multiplayer fair.
5. **Scalable data** — All features, feats, weapons, and spells are data-driven JSON entries in the Compendium, not hardcoded logic. New content = new data file.

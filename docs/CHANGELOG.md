# Theatre — Development Changelog

Reference document for AI agents and contributors. Covers all architectural decisions, file-by-file changes, and known patterns since project inception.

---

## Project Overview

**Theatre** is a Virtual Tabletop (VTT) built specifically for the **Ruin** TTRPG system. It runs as a local monorepo with a React client and a Node.js server, designed for eventual online multiplayer via Socket.IO.

**Stack:**
- TypeScript 5.x + React 18 + Vite 5 (client, port 5173)
- Node.js 24 + Express 4 + Socket.IO 4 (server, port 3001)
- sql.js 1.x (pure WASM SQLite — no native deps)
- pnpm workspaces monorepo

**Packages:**
| Package | Path | Purpose |
|---|---|---|
| `@theatre/rules-engine` | `packages/rules-engine` | Ruin game logic (dice, checks, conditions) |
| `@theatre/client` | `packages/client` | React/Vite frontend |
| `@theatre/server` | `packages/server` | Express REST + Socket.IO backend |

**Dev launch:** `.\dev.ps1` from repo root — kills ports 3001/5173, opens two PowerShell windows (one per package).

---

## Phase 1 — Monorepo Bootstrap & Rules Engine

### Files created
- `pnpm-workspace.yaml` — workspace definition
- `packages/rules-engine/src/` — Ruin-specific game logic
  - Dice system: d1/d4/d6/d8/d10/d12, Die Higher/Lower/Force/Graze modifiers
  - Check types: Static, Dynamic, Contested
  - Degree-of-success logic (±5 thresholds)
  - Conditions list: Blinded, Burning, Burnout, Charmed, Downed, Grappled, Hastened, Hidden, Incapacitated, Injured, Invisible, Paralyzed, Prone, Restrained, Shocked, Slowed, Stunned
  - Momentum / Ruin point tracking
  - Save types: Defend (MIG), Avoid (DEX), Resist (WIL), Persist (PRE)
- `packages/server/src/index.ts` — Express + Socket.IO server entry
- `packages/server/src/db.ts` — sql.js SQLite initialization
- `packages/client/src/main.tsx` — React entry point

### Notes
- No `d20` in Ruin — dice range is d1 to d12 only
- `DIE_OPTIONS` throughout the codebase must reflect: `[1, 4, 6, 8, 10, 12]`

---

## Phase 2 — Canvas Map & Image System

### Architecture decision
Pixi.js was evaluated and abandoned due to StrictMode double-mount race conditions. All map rendering uses **plain HTML5 Canvas 2D**.

### Files created/modified

#### `packages/server/src/db.ts`
- `images` table: `id, filename, original, mimetype, size, created_at`
- `uploads/` directory auto-created on startup via `mkdirSync`

#### `packages/server/src/images.ts`
- `GET /api/images` — list all uploaded images
- `POST /api/images` — multer file upload, saves to `packages/server/uploads/`
- `DELETE /api/images/:id` — removes DB record and file from disk
- Static file serving: `GET /uploads/:filename`
- Type annotation: `const router: IRouter = Router()` (required to avoid TS2742 inference error)

#### `packages/client/src/renderer/canvasState.ts`
- `PlacedImage` type: `{ id, src, x, y, w, h, rotation, layer }`
- `CanvasState` type: `{ mapLayer, tokenLayer, selectedId, activeLayer }`
- Z-order helpers: `moveToFront`, `moveToBack`, `moveForward`, `moveBackward`
- Layer helpers: `setLayer`, `getLayer`

#### `packages/client/src/renderer/MapCanvas.tsx`
- Full imperative canvas component (~287 lines)
- Layer-restricted selection: tokens only selectable on token layer, map images on map layer
- Right-click context menu trigger via `onContextMenu` prop
- Rotation locked to 90° increments
- Drag-and-drop image placement from sidebar
- Transform handles: move, resize (corner), rotate

#### `packages/client/src/ui/ContextMenu.tsx`
- Right-click popup for placed images
- Actions: Delete, Move to Layer, Set Dimensions, Move to Front/Back/Forward/Backward

#### `packages/client/src/ui/LayerToolbar.tsx`
- Fixed top bar, switches active layer between `'map'` and `'token'`

#### `packages/client/src/types/images.ts`
- `ImageRecord`: `{ id, filename, original, mimetype, size, created_at, url }`

### Known patterns
- `stateRef` + `setVersion(v => v + 1)` pattern used in `App.tsx` to trigger re-renders without putting canvas state in React state (avoids canvas thrash)
- Images served at `http://localhost:3001/uploads/:filename`

---

## Phase 3 — Character Sheet Feature

### Commit: `"Added a character sheet tab and a basic character sheet template"`

### Files created/modified

#### `packages/client/src/types/sheets.ts`
All client-side types for the character sheet system.

```typescript
type DieFace = 1 | 4 | 6 | 8 | 10 | 12;
const DIE_OPTIONS: DieFace[] = [1, 4, 6, 8, 10, 12];

interface SkillBonuses {
  Climb: number; Push: number; Carry: number;        // MIG
  Stealth: number; 'Sleight of Hand': number; Acrobatics: number;  // DEX
  Spot: number; Medicine: number; Recall: number;    // WIL
  Influence: number; Arcana: number; Nature: number; // PRE
}

interface Equipment {
  mainHand: string; offHand: string;
  helmet: string; necklace: string; armor: string; cape: string;
  gloves: string; boots: string; ring1: string; ring2: string;
}

interface CharacterSheet {
  id: number; name: string; character_class: string;
  race: string; background: string; level: number;
  mig_score: number; mig_die: DieFace;
  dex_score: number; dex_die: DieFace;
  wil_score: number; wil_die: DieFace;
  pre_score: number; pre_die: DieFace;
  skill_bonuses: string;   // JSON-encoded SkillBonuses
  hp_current: number; hp_max: number;
  mental_current: number; mental_max: number;
  grave_current: number; grave_max: number;
  ap_current: number; reactions_current: number;
  mana_current: number; mana_max: number;
  momentum: number; conditions: string;   // JSON-encoded string[]
  equipment: string;   // JSON-encoded Equipment
  feats: string; attacks: string; notes: string;
  created_at: string;
}
```

- `DEFAULT_SKILL_BONUSES` — all skills defaulting to `0`
- `DEFAULT_EQUIPMENT` — all 10 slots defaulting to `''`
- `emptySheet()` — returns `Omit<CharacterSheet, 'id'|'created_at'>` with safe defaults

#### `packages/server/src/db.ts`
- `sheets` table added (see full schema in current file)
- All columns have `NOT NULL DEFAULT` values to prevent null surprises

#### `packages/server/src/sheets.ts`
- `GET /api/sheets` — list all sheets ordered by `created_at DESC`
- `GET /api/sheets/:id` — single sheet
- `POST /api/sheets` — insert new sheet (30 fields)
- `PATCH /api/sheets/:id` — partial update, whitelist-filtered allowed fields
- `DELETE /api/sheets/:id` — remove sheet
- Type annotation: `const router: IRouter = Router()` (same TS2742 avoidance as images.ts)
- POST and PATCH wrapped in `try/catch` — errors return `500` with message instead of crashing

#### `packages/server/src/index.ts`
- `app.use('/api/sheets', sheetsRouter)` registered
- CORS explicitly lists all methods: `['GET','POST','PATCH','PUT','DELETE','OPTIONS']`

#### `packages/client/src/ui/SidePanel.tsx`
Right sidebar replacing the old image-only panel. Tabs: **Images** and **Sheets**.

- Images tab: upload button + draggable image list (unchanged behaviour)
- Sheets tab: list of sheets with open (📖) and delete (🗑) buttons, "+ New" button
- `handleNewSheet`: POSTs `emptySheet()`, adds to list, immediately opens the window
- Props: `onDragStart`, `onOpenSheet`, `savedSheet?`
- `savedSheet` effect: when App feeds an updated sheet back (after a PATCH save), SidePanel updates its local list so re-opening shows current data

**Critical CSS note:** Tab active style uses `borderBottom: '2px solid #7b8cde'` (full shorthand). Do **not** use `borderBottomColor` as an override — React will warn about shorthand/non-shorthand conflict.

#### `packages/client/src/ui/CharacterSheet.tsx`
The main sheet form component (~291 lines).

**Critical architecture rule:** `NumInput`, `DieSelect`, `Pips`, and `SectionHeader` are defined **at module scope**, outside the `CharacterSheet` component function. If they were defined inside the component, React would see them as new component types on every render, causing remount → focus loss → inputs appearing uneditable.

Key sub-components:
- `NumInput` — `<input type="number">` with `parseInt` + `Math.max(min, n)` guard
- `DieSelect` — `<select>` over `DIE_OPTIONS`
- `Pips` — clickable pip row (used for AP and Reactions)
- `SectionHeader` — styled section divider

Save logic:
- `persist(next)` — debounced 600ms PATCH to `/api/sheets/:id`, calls `onUpdate(saved)` on success
- `set(field, value)` — updates local state and calls `persist`
- `setSkill` / `setEquip` — use **functional `setLocal` updater** with `JSON.parse(prev.skill_bonuses)` inside the updater to avoid stale closure bugs
- Errors now logged to console (`[CharacterSheet] PATCH failed` / `[CharacterSheet] persist error`) instead of silently swallowed

Sheet sections:
1. **Header** — Name, Class, Race, Background, Level
2. **Stats** — 4 cards (MIG/DEX/WIL/PRE), each with Score, Die, and 3 skill bonus inputs. Save label shown (Defend/Avoid/Resist/Persist)
3. **Health** — HP / Mental / Grave bars with current/max inputs and progress bar. No hint text.
4. **Combat** — AP pips (max 3), Reactions pips (max 3), Mana current/max. No momentum display.
5. **Saves** — Reference reminder row (read-only, shows die type)
6. **Conditions** — Only shown if `conditions` array is non-empty; pills with remove button
7. **Equipment** — 10 slots in 2-column grid
8. **Feats & Features** — Resizable textarea

Removed sections (do not re-add without confirmation): HP/Mental/Grave hint text, Momentum display, Notes textarea.

Equipment slots (in order):
```
mainHand, offHand, helmet, necklace, armor, cape, gloves, boots, ring1, ring2
```

#### `packages/client/src/ui/SheetWindow.tsx`
Floating `position: fixed` window wrapper.

- Drag via title bar `onMouseDown` + `document.addEventListener('mousemove')`
- Resize via SE corner handle
- Position stored in `useRef` (not state) to avoid re-renders during drag; `bump(v => v+1)` forces one re-render on mouse-up
- `applyPos()` directly sets `el.style.left/top/width/height`
- Min size: 480×320
- Props: `sheet, x, y, w, h, zIndex, onClose, onUpdate, onFocus`

#### `packages/client/src/App.tsx`
- `windows: WindowEntry[]` state — each entry is `SheetWindowState & { zBase: number }`
- `savedSheet: CharacterSheet | undefined` state — fed to `SidePanel` to keep its list in sync
- `let zCounter = 100` — module-level, incremented on window open/focus
- `handleOpenSheet` — checks for duplicate (brings to front if exists), staggers new window position by `(prev.length % 8) * 24`
- `handleUpdateSheet` — updates `windows` list AND sets `savedSheet`
- Default window size: 560×700, starting position: 60+offset, 60+offset

---

## Phase 4 — Bug Fixes

### Commit: `"Fix bugs with DB, UI, and numbers not being editable"`

### Bug: Number inputs uneditable / values not saving on initial implementation

**Root cause:** `NumInput` and `DieSelect` were defined inside the `CharacterSheet` component function body. React treats inline function definitions as new component types on every render, causing the inputs to unmount and remount on every keystroke — immediately losing focus.

**Fix:** Moved all sub-components (`NumInput`, `DieSelect`, `Pips`, `SectionHeader`) to module scope.

### Bug: Feats, Equipment, and Skills not saving

**Root cause:** Stale closure — `setSkill` and `setEquip` captured the initial `local` state via closure and always wrote back stale JSON.

**Fix:** Both callbacks use the functional `setLocal(prev => ...)` form, reading `prev.skill_bonuses` / `prev.equipment` inside the updater so they always operate on the latest state.

### Bug: Server crash on `POST /api/sheets` — `Cannot destructure 'columns' of undefined`

**Root cause:** The existing `theatre.db` was created before `character_class` was added to the schema. `CREATE TABLE IF NOT EXISTS` does not alter existing tables, so the column was missing. sql.js silently swallowed the INSERT failure (no throw). `last_insert_rowid()` returned 0, and `SELECT WHERE id = 0` returned no rows, crashing at the destructure.

**Fix:**
1. Added `ALTER TABLE` migration in `db.ts` (runs after CREATE TABLE, caught in try/catch since the column will already exist on fresh DBs):
   ```typescript
   try { _db.run(`ALTER TABLE sheets ADD COLUMN character_class TEXT DEFAULT ''`); } catch { /* already exists */ }
   ```
   Note: Uses `TEXT DEFAULT ''` without `NOT NULL` — sql.js ALTER TABLE cannot backfill existing rows with `NOT NULL`.
2. Wrapped POST INSERT and PATCH UPDATE in `try/catch` — returns `500` with error text instead of crashing the process.
3. Added null guards: `idResult[0]?.values[0][0]`, early return if `!id`.
4. Deleted stale `theatre.db` to force clean recreation.

### Bug: Inconsistent data loading on page refresh

**Root cause:** `getDb()` was `async` with no concurrency guard. On page load, `GET /api/images` and `GET /api/sheets` fire simultaneously. Both arrived before `_db` was assigned, both called `initSqlJs()` (async WASM load), and whichever resolved second overwrote `_db` with a fresh empty instance — discarding the first one's schema setup and any data it loaded from disk.

**Fix:** Singleton initialization promise in `db.ts`:
```typescript
let _db: Database | null = null;
let _initPromise: Promise<Database> | null = null;

export function getDb(): Promise<Database> {
  if (_db) return Promise.resolve(_db);
  if (_initPromise) return _initPromise;
  _initPromise = _init();
  return _initPromise;
}

async function _init(): Promise<Database> { ... }
```
All concurrent callers await the same `_initPromise` — `_init()` only ever runs once.

### Bug: React CSS warning on tab active style

**Symptom:** `Warning: Removing a style property during rerender (borderBottomColor) when a conflicting property is set (borderBottom)`

**Root cause:** `tabBtnStyle` used `borderBottom: '2px solid transparent'` (shorthand) but `tabActivStyle` overrode with `borderBottomColor: '#7b8cde'` (non-shorthand). React flags this as a potential styling bug.

**Fix:** `tabActivStyle` now uses `borderBottom: '2px solid #7b8cde'` (full shorthand) to match.

### Bug: Changes lost when closing and reopening a sheet without refreshing

**Root cause:** `SidePanel` fetches its `sheets` list once on mount and never updates it after. When a PATCH save succeeds, `App` updates `windows` state (the open window reflects the save) but `SidePanel`'s cached list remains stale. Closing and reopening passes the old pre-edit copy to `handleOpenSheet`.

**Fix:** `App` now maintains a `savedSheet` state, set inside `handleUpdateSheet` every time a save comes back from the server. `SidePanel` accepts `savedSheet?: CharacterSheet` as a prop and runs:
```typescript
useEffect(() => {
  if (!savedSheet) return;
  setSheets(prev => prev.map(s => s.id === savedSheet.id ? savedSheet : s));
}, [savedSheet]);
```

---

## Current File Inventory

| File | Status | Notes |
|---|---|---|
| `packages/rules-engine/src/` | Stable | Ruin game logic |
| `packages/server/src/index.ts` | Stable | Express + Socket.IO entry, CORS allows all methods |
| `packages/server/src/db.ts` | Stable | Singleton init promise, migration for character_class |
| `packages/server/src/images.ts` | Stable | Upload, list, delete |
| `packages/server/src/sheets.ts` | Stable | Full CRUD, try/catch on writes |
| `packages/client/src/types/images.ts` | Stable | ImageRecord type |
| `packages/client/src/types/sheets.ts` | Stable | CharacterSheet, Equipment (10 slots), SkillBonuses, DieFace |
| `packages/client/src/renderer/canvasState.ts` | Stable | PlacedImage, CanvasState, z-order helpers |
| `packages/client/src/renderer/MapCanvas.tsx` | Stable | Canvas rendering, drag/drop, context menu |
| `packages/client/src/ui/LayerToolbar.tsx` | Stable | Map/Token layer switcher |
| `packages/client/src/ui/ContextMenu.tsx` | Stable | Right-click menu for placed images |
| `packages/client/src/ui/SidePanel.tsx` | Stable | Images + Sheets tabs, savedSheet sync |
| `packages/client/src/ui/CharacterSheet.tsx` | Stable | Sheet form, sub-components at module scope |
| `packages/client/src/ui/SheetWindow.tsx` | Stable | Floating draggable/resizable window |
| `packages/client/src/App.tsx` | Stable | Root component, all state orchestration |
| `dev.ps1` | Stable | Dev launch script |
| `packages/server/theatre.db` | Runtime | Auto-created; delete to reset all data |
| `packages/server/uploads/` | Runtime | Uploaded image files |

---

## Planned Features (from Project-Goals.md)

- [ ] Rules Compendium — feat/feature browser integrated into character sheet
- [ ] Attack templates — define attacks with range, damage types, conditions, targeting rules; auto-enforce effects and trigger reaction queries
- [ ] Dice roller UI
- [ ] Measuring tools on the map
- [ ] Resource tracking + automatic rest recharging (Short/Brief/Long rest)
- [ ] Multiplayer — Socket.IO live sync (local first, then hosted)
- [ ] Dynamic lighting (stretch)
- [ ] Multiple maps + presets (stretch)

---

## Important Conventions

### sql.js patterns
- All queries use `db.exec(sql)` for SELECT (returns `QueryExecResult[]`)
- All mutations use `db.run(sql, params)` 
- After every write, call `persist()` to flush to disk (`theatre.db`)
- `exec` returns `[]` (empty array, not `null`) when no rows match — always guard: `if (!result.length || !result[0].values.length)`
- Parameter binding uses `?` positional placeholders — count them carefully

### React patterns
- Sub-components used inside a parent **must be defined at module scope** — never inside the parent function body
- Canvas state uses `useRef` + manual re-render trigger (`setVersion(v => v + 1)`) to avoid React-managed state causing canvas redraws
- JSON fields (`skill_bonuses`, `equipment`, `conditions`, `attacks`) are stored as serialized strings in SQLite and parsed on read. Always use `try/catch` around `JSON.parse` and fall back to defaults
- Debounced saves: 600ms timeout, cleared on each new edit — `saveTimer.current`

### TypeScript
- Express routers must be typed as `const router: IRouter = Router()` to avoid TS2742 deep instantiation error
- `npx tsc --noEmit` run from each package directory independently
- Both packages currently type-check clean

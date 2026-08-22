# People Directory

### → [presight-one.vercel.app](https://presight-one.vercel.app)

Live, with all 10,000 records. Nothing to install.

A searchable, filterable directory of 10,000 people. Type a name, narrow by nationality and hobbies, and the sidebar always shows the top 20 of each **for the result set you are currently looking at** — with counts that match what selecting them returns.

Built against the brief in [REQUIREMENTS.md](REQUIREMENTS.md).

---

## Quick start

Nothing to run — it is deployed at **[presight-one.vercel.app](https://presight-one.vercel.app)**.

To run it yourself:

```bash
docker compose up --build
```

Open **http://localhost:7777**. That is the whole setup — no Node install, no seeding step. The container seeds itself on first boot and skips it afterwards.

Prefer to run it directly? You need **Node 22.5 or newer** (`.nvmrc` pins 24.15.0):

```bash
nvm use
npm install
npm run seed     # creates server/data/presight.db
npm run dev
```

| | |
|---|---|
| Client | http://localhost:5555 |
| API | http://localhost:7777 |

`npm run dev` runs both processes together; Vite proxies `/api` to the server, so the client always calls same-origin paths. Run them apart with `npm run dev:server` and `npm run dev:client`.

If you start the server on an older Node it exits with an explanation rather than a stack trace — the API uses the built-in `node:sqlite` module, which does not exist before 22.5.

---

- **React 19** client — URL-synced state, virtualized infinite list, light and dark themes
- **Express 5** API — paginated, filtered, sorted, with live facet counts
- **SQLite** as the source of truth, through Node's built-in `node:sqlite` (no native modules)

## Architecture

![Architecture](docs/architecture.png)

The design turns on one decision. `buildFilterSql()` is the only place that knows what "in scope" means; it returns a single `WITH matched AS (…)` CTE, and **four queries prefix it** — the total, the page, the hobby counts and the nationality counts. Because they are all built from the same filter, a facet count can never disagree with the list it produces.

Dependencies point one way — `schema → service → repository → connection` — and nothing below the HTTP boundary imports Express or zod, which is why the service can be tested by calling a function instead of standing up a server.

## Database

SQLite, at `server/data/presight.db` (gitignored — recreate it with `npm run seed`).

```bash
npm run seed                       # wipe and re-seed, deterministic
SEED_USER_COUNT=500 npm run seed   # a smaller set
npm run seal                       # collapse to a single read-only-safe file
rm -rf server/data && npm run seed # rebuild from nothing
sqlite3 server/data/presight.db    # inspect it
```

The seed is deterministic — every Faker instance is explicitly seeded, so re-running produces byte-identical data and a failing test always reproduces.

`seal` exists for read-only deployments. The database normally runs in WAL mode, which is a three-file format: SQLite must write `presight.db-shm` even to serve a `SELECT`, so a WAL database on a read-only filesystem is not slow — it is unreadable. `seal` checkpoints the WAL back into the main file, switches to a rollback journal, vacuums, and removes the sidecars, leaving one self-contained file. A later writable boot restores WAL on its own.

Four tables. Hobbies are a join table rather than a JSON column, because the brief needs *"has all of these hobbies"* matching and per-hobby counts over a filtered set — both a few lines of SQL against a join table, and slow, awkward string work against a blob.

| Table | Rows | |
|---|---|---|
| `users` | 10,000 | `avatar`, `first_name`, `last_name`, `age`, `nationality_id`, plus lowercased name columns |
| `nationalities` | 45 | |
| `hobbies` | 47 | |
| `user_hobbies` | ~43,000 | 0–10 per user |

The lowercased `*_lc` columns exist because SQLite's `LIKE` only case-folds ASCII, and the directory is international — without them, searching for `MARTÍN` would miss *Martín*.

## Production build

```bash
npm run build
npm start        # http://localhost:7777 — Express serves the API and the built client
```

One origin, one process. Deep links work: any non-API GET falls through to the client shell, while unknown `/api/*` paths stay JSON 404s.

## Docker

```bash
docker compose up --build    # http://localhost:7777
docker compose down          # stop; the volume keeps the data
docker compose down -v       # stop and delete the database
docker compose up -d         # background
docker compose logs -f app   # follow
```

| | |
|---|---|
| Image | 219MB, `node:24-alpine`, four-stage build |
| Runs as | the non-root `node` user |
| Data | named volume `directory-data`, mounted at `/data` |
| Health | `/api/health`, checked every 30s |

The image ships only production dependencies and compiled output — no `tsx`, no `typescript`, no source. Because SQLite comes from Node's built-in `node:sqlite`, there is no native module to compile and the image needs no build toolchain.

Set `SEED_ON_START=always` to force a re-seed on every boot, or override `SEED_USER_COUNT` for a smaller dataset.

## Deploying

Any container host runs the [Dockerfile](Dockerfile) unchanged, with a volume mounted at `/data`. That path keeps the deployed app byte-identical to what `docker compose up` gives you, and the database stays writable.

Vercel is what [presight-one.vercel.app](https://presight-one.vercel.app) runs on, via [vercel.json](vercel.json) and [api/index.mjs](api/index.mjs) — the static client and the Express app are served from one origin, so the client needs no base path, no API URL and no CORS.

```bash
vercel          # preview
vercel --prod
```

Import it with **Framework Preset: Other** and an empty Build Command; `vercel.json` supplies everything. It builds, seeds and seals the database at build time and ships the 3.4MB file inside the function bundle, then opens it read-only (`DB_READONLY=1`, set in `vercel.json`). The data is therefore immutable — re-seeding means redeploying, which is fine for a read-only directory. Note that GitHub Pages cannot host this app: it serves static files only, and there would be no `/api` behind the client.

---

## API

### `GET /api/users`

| Param | Notes |
|---|---|
| `q` | Matched across `first_name` and `last_name`. Every whitespace-separated word must hit one of the two fields, so a full name works and word order does not matter. |
| `nationalities` | **OR** — a user from any selected country matches |
| `hobbies` | **AND** — a user must have every selected hobby |
| `sort` | `first_name` · `last_name` · `age` · `nationality` |
| `order` | `asc` · `desc` |
| `page`, `pageSize` | `pageSize` max 100, default 50 |

List params accept both `?hobbies=a,b` and `?hobbies=a&hobbies=b`.

```json
{
  "data": [{ "id": 1, "avatar": "…", "first_name": "…", "last_name": "…",
             "age": 34, "nationality": "France", "hobbies": ["Chess", "Reading"] }],
  "pagination": { "page": 1, "pageSize": 50, "total": 417,
                  "totalPages": 9, "hasMore": true }
}
```

### `GET /api/facets`

Takes `q`, `nationalities` and `hobbies`. Returns the top 20 of each as `{ value, count }`.

It is a separate endpoint on purpose: infinite scroll requests page 2, 3, 4… continuously, and the sidebar must not recompute on every one. Facets refetch only when the text or filters change.

Each facet is scoped by the semantics of its own dimension. **Hobbies** are AND, so every selected hobby narrows the set and the remaining hobbies — counted inside it — are exactly *"what can I narrow by next"*. **Nationalities** are OR, so that facet ignores its own selection; scoping it by itself would leave only the countries already chosen, and "filter by one or more nationalities" would become unreachable from the interface. Its counts still honour the text and hobby filters, and they sum to the total across a multi-country selection.

### `GET /api/health`

`{ "ok": true }`.

---

## Client

Everything that defines the view lives in the URL — text, selected nationalities, selected hobbies, sort field and direction. Reload or share the link and you get the identical view back; the browser's back button walks the filter history. Nothing else stores view state.

- **Virtualized list** — scrolling all 10,000 records keeps roughly 18 cards in the DOM.
- **Infinite scroll** — the next page loads as the sentinel row approaches.
- **Loading, empty and error states**, with a retry and a clear-filters path out.
- **Responsive** — the filter rail becomes a drawer below 1024px.
- **Dark by default**, switchable and remembered. Every foreground/background pair is at or above WCAG AA (4.5:1) in both themes.
- **`/`** focuses the search field.

Two easter eggs: search `presight`, or `peter parker`.

## Tests

```bash
npm test         # 43 tests
npm run typecheck
```

Node's built-in test runner against an in-memory database — no test framework, no extra dependencies. They target the properties the brief is graded on rather than line coverage: facet counts matching the totals they produce, a full page-walk asserting no duplicates or gaps, AND/OR filter semantics, deterministic ordering across all four sort fields with the `id` tie-break, Unicode search, and SQL injection through `sort`.

## Layout

```
client/src
├── api/            typed fetch layer + shared response types
├── hooks/          useFilterState (URL ⇄ state), useDirectory, useTheme
└── components/     UserList, UserCard, FilterSidebar, SearchField, …

server/src
├── index.ts        guarded entry point: serve · seed · seal · migrate
├── db/             connection, schema, seed, seal, vocabularies
└── users/          routes → controller → service → repository → filters

api/index.mjs       Vercel entrypoint — exports the same Express app
```

## Configuration

Every setting has a working default, so there is no `.env` to create.

| Variable | Default |
|---|---|
| `PORT` | `7777` |
| `DB_PATH` | `server/data/presight.db` |
| `DB_READONLY` | unset — set to `1` to open the database read-only and skip migrations |
| `CLIENT_DIST` | `client/dist` |
| `SEED_USER_COUNT` | `10000` |
| `NODE_ENV` | unset (development) |

Node 22+ reads an env file natively if you want one: `node --env-file=.env dist/index.js`.

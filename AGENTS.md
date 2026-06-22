# Agent guide — septa-map

Instructions for coding agents working in this repository.

## Quick start

Requires **Node 26** (see `.tool-versions`; [mise](https://mise.jdx.dev/) activates it automatically).

```bash
npm install
cp client/.env.example client/.env.local   # set VITE_MAPBOX_TOKEN
npm run dev
```

`npm run dev` starts three processes:

1. **Express** proxy on `:5050` — serves `GET /septa` locally
2. **Vite** dev server on `:5173` — React app, proxies `/septa` → Express
3. **Chrome** with CDP on `:9222` — isolated profile, app tab open

Connection metadata is written to **`.dev/browser.json`** (gitignored).

## Inspecting the running app

**Always verify UI changes visually** — do not rely on build success alone.

```bash
npm run inspect
```

Writes:

| File | Contents |
| ---- | -------- |
| `.dev/inspect-screenshot.png` | Full-page screenshot |
| `.dev/inspect-report.json` | Vehicle count, map/deck loaded flags, console errors |

A healthy report looks like:

```json
{
  "countText": "Showing 700+ of 700+ vehicles",
  "mapLoaded": true,
  "deckLoaded": true,
  "errors": []
}
```

### Attach to Chrome via Playwright (CDP)

```javascript
import { readFileSync } from 'fs';
import { chromium } from 'playwright';

const { cdpUrl, appUrl } = JSON.parse(
  readFileSync('.dev/browser.json', 'utf8'),
);
const browser = await chromium.connectOverCDP(cdpUrl);
const page =
  browser.contexts()[0]?.pages().find((p) => p.url().startsWith(appUrl)) ??
  (await browser.contexts()[0].newPage());
```

Prefer **`connectOverCDP`** over launching a new browser when `npm run dev` is already running.

### Environment overrides

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `APP_URL` | `http://localhost:5173` | URL Chrome opens / inspect targets |
| `CHROME_DEBUG_PORT` | `9222` | CDP port |
| `CHROME_PATH` | auto-detected | Chrome/Chromium executable |

## Repository layout

```
client/               Vite + React frontend (npm workspace)
  src/App.tsx         Map page — DeckGL + Map + IconLayer
  src/useLiveData.ts  Polls /septa, animates vehicle positions
  src/types.ts        Vehicle types + SEPTA response normalization
  vite.config.ts      Dev proxy, Vitest config
functions/septa.ts    Cloudflare Pages Function (production API)
index.ts              Express dev proxy (local only)
e2e/                  Playwright tests (mock /septa via route)
scripts/
  open-chrome-dev.mjs Launched by npm run dev
  inspect-app.mjs     Agent inspection snapshot
```

## Architecture notes

- **Local dev:** browser → Vite `:5173` → `/septa` proxied → Express `:5050` → SEPTA API
- **Production:** Cloudflare Pages static `client/dist` + `functions/septa.ts`
- **Map stack:** deck.gl 9 + react-map-gl 7 + mapbox-gl 3
  - `DeckGL` is the root; `Map` is a child **with `mapStyle` set** so deck.gl injects size/view state
  - Do not nest `Map` inside `DeckGL` without `mapStyle` — the basemap will not render
- **Vehicle icons:** SVGs imported as `./icon.svg?url` with explicit `width="128" height="128"` on the root `<svg>`
  - deck.gl 9 fails to load dimensionless SVGs (`createImageBitmap` error); icons silently missing
- **Env var:** `VITE_MAPBOX_TOKEN` in `client/.env.local` (not `REACT_APP_*`)

## Commands

| Command | Use when |
| ------- | -------- |
| `npm run dev` | Normal development — servers + debug Chrome |
| `npm run dev:server` | Servers only, no browser |
| `npm run inspect` | Snapshot app state for debugging |
| `npm run build` | Production build → `client/dist` |
| `npm test` | Vitest unit tests + Playwright e2e |
| `npm run test:unit` | Vitest only (`client/`) |
| `npm run test:e2e` | Playwright only (`e2e/`) |
| `npm run lint` | Oxlint |
| `npm run format` | Oxfmt (double quotes, 2-space indent) |
| `npm run cf:dev` | Build + Wrangler Pages dev (production-like) |

## Verification checklist

After frontend changes, especially map/layer work:

1. `npm run build` — TypeScript + Vite build pass
2. `npm run inspect` — screenshot shows basemap **and** vehicle icons
3. `.dev/inspect-report.json` — `errors` is empty, vehicle count > 0
4. `npm test` — unit + e2e pass

For map icon changes, zoom in **and** out — `IconLayer` uses meter-based sizing with pixel clamps (`sizeMinPixels` / `sizeMaxPixels` in `App.tsx`).

## Testing

- **Unit:** Vitest + Testing Library in `client/src/*.test.tsx` — map components mocked
- **E2E:** Playwright in `e2e/` — mocks `/septa` with `e2e/fixtures/vehicles.json`
  - E2E webServer starts **Vite only** (not Express); `/septa` is mocked in tests
  - Hover test reaches into deck.gl via React fiber — fragile if component tree changes

## Tooling conventions

- **Lint/format:** oxlint + oxfmt at repo root; Husky pre-commit runs both via lint-staged
- **Workspaces:** install once at root (`npm install`); client is `"client"` workspace
- **Do not** edit the plan files in `.cursor/plans/`
- **Do not** commit `.dev/`, `client/.env.local`, or secrets

## Deployment (Cloudflare Pages)

- Build: `npm run build`
- Output: `client/dist`
- Env: `VITE_MAPBOX_TOKEN`, `NODE_VERSION=26`

See [README.md](README.md) for full setup and deployment details.

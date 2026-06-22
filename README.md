# septa-map

**[Live map → septa-map.pages.dev](https://septa-map.pages.dev)**

Display live SEPTA bus &amp; trolley positions on an interactive map.

A React + Vite single-page app rendered with deck.gl + Mapbox GL. Live vehicle
positions come from SEPTA's public TransitView feed, proxied server-side to
avoid browser CORS issues.

## Architecture

- **Frontend** (`client/`): React SPA (Vite), built to static assets in
  `client/dist`.
- **API** (`functions/septa.ts`): a Cloudflare Pages Function exposing
  `GET /septa`, which fetches SEPTA's
  [TransitViewAll](https://www3.septa.org/hackathon/TransitViewAll/) feed and
  flattens it into a single array of vehicles.
- Deployed on **Cloudflare Pages** (static frontend + serverless function).

The Express server (`index.ts`) is retained only for local development.

## Data source

Vehicle positions come from SEPTA's public
[TransitViewAll](https://www3.septa.org/hackathon/TransitViewAll/) JSON feed
(`https://www3.septa.org/hackathon/TransitViewAll/`). This is part of SEPTA's
Hackathon API — no API key is required.

The feed returns a nested structure: routes → vehicles, each with latitude,
longitude, route ID, vehicle ID, and related metadata. Positions update on the
order of every few seconds as SEPTA's AVL (automatic vehicle location) system
reports GPS fixes from buses and trolleys in service.

The app never calls SEPTA directly from the browser. A server-side proxy
fetches the feed, validates the response shape, and flattens it into a single
array of vehicles with `[lng, lat]` coordinates (see `normalizeVehicles` in
`client/src/types.ts`).

## Data flow

### Production (Cloudflare Pages)

```text
Browser (React SPA)
  │  GET /septa every 10s
  ▼
Cloudflare Pages Function (functions/septa.ts)
  │  GET TransitViewAll
  ▼
SEPTA API (www3.septa.org)
```

1. The browser loads static assets (`client/dist`) from Cloudflare's CDN.
2. `useLiveData` polls `GET /septa` on the same origin every 10 seconds.
3. The Pages Function fetches the TransitViewAll feed from SEPTA, normalizes
   the response, and returns a flat JSON array of vehicles.
4. Responses are cached at the edge for 5 seconds (`Cache-Control: max-age=5`)
   to absorb traffic spikes without making the map feel stale.
5. Between polls, the frontend interpolates each vehicle's position so markers
   glide smoothly instead of jumping.

There is no separate backend service in production — the static site and
`/septa` proxy are both served by Cloudflare Pages.

### Local development

```text
Browser (React SPA)
  │  GET /septa every 10s
  ▼
Vite dev server (:5173) — proxy
  ▼
Express (:5050, server.ts)
  │  GET TransitViewAll
  ▼
SEPTA API (www3.septa.org)
```

Locally, Vite proxies `/septa` to the Express dev server on port 5050, which
performs the same fetch-and-normalize step as the Cloudflare Function. Use
`npm run cf:dev` to test the production path (static build + Pages Function via
Wrangler) without deploying.

## Environment variables

| Variable             | Where      | Purpose                                |
| -------------------- | ---------- | -------------------------------------- |
| `VITE_MAPBOX_TOKEN`  | build-time | Mapbox GL access token for the basemap |

For local development, copy `client/.env.example` to `client/.env.local` and set
the token. For production, set the same variable as a build-time environment
variable in the Cloudflare Pages project settings.

## Local development

Requires **Node 26** (pinned in `mise.toml` for local dev; `.node-version` is
committed for Cloudflare Pages and other Node version managers). [mise](https://mise.jdx.dev/)
activates the version automatically in this directory.

```bash
# install dependencies (npm workspaces — single install at repo root)
npm install

# run Express (:5050), Vite (:5173), and Chrome with CDP debug port (:9222)
npm run dev
```

This launches Chrome with remote debugging enabled and writes connection info to
`.dev/browser.json`. Coding agents (and Playwright) can attach to the running
browser without starting a new one:

```bash
# snapshot the app — screenshot, console errors, vehicle count
npm run inspect
```

Outputs land in `.dev/inspect-screenshot.png` and `.dev/inspect-report.json`.

To run servers only (no browser):

```bash
npm run dev:server
```

The Vite dev server proxies `/septa` to the Express server on port 5050 (see
`server.proxy` in `client/vite.config.ts`).

**Agent browser connection**

| Resource | Value |
| -------- | ----- |
| App URL | `http://localhost:5173` |
| CDP URL | `http://127.0.0.1:9222` |
| Connection file | `.dev/browser.json` |

Playwright attach example:

```javascript
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const { cdpUrl } = JSON.parse(readFileSync('.dev/browser.json', 'utf8'));
const browser = await chromium.connectOverCDP(cdpUrl);
```

To test the production setup (static build + the real Cloudflare Function)
locally, use Wrangler:

```bash
npm run cf:dev   # builds client/ then runs `wrangler pages dev`
```

## Tooling

- **Vite** — dev server and production bundler
- **Chrome CDP** — debug browser launched by `npm run dev` for visual inspection
- **Oxlint** — linting (`npm run lint`)
- **Oxfmt** — formatting (`npm run format`, `npm run format:check`)
- **Husky** + **lint-staged** — format and lint on pre-commit
- **Vitest** — tests (`npm test`)

## Deploying to Cloudflare Pages

Connect the GitHub repo in the Cloudflare dashboard (Workers &amp; Pages > Create >
Pages) and configure:

- **Build command:** `npm run build`
- **Build output directory:** `client/dist`
- **Environment variables:** `VITE_MAPBOX_TOKEN` for **Preview** and **Production**
  (Node 26 via `.node-version`; local dev uses `mise.toml`)

You can also deploy from the CLI:

```bash
npm run cf:deploy
```

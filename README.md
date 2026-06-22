# septa-map

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

## Environment variables

| Variable             | Where      | Purpose                                |
| -------------------- | ---------- | -------------------------------------- |
| `VITE_MAPBOX_TOKEN`  | build-time | Mapbox GL access token for the basemap |

For local development, copy `client/.env.example` to `client/.env.local` and set
the token. For production, set the same variable as a build-time environment
variable in the Cloudflare Pages project settings.

## Local development

Requires **Node 26** (pinned in `.tool-versions`; [mise](https://mise.jdx.dev/) will
activate it automatically in this directory).

```bash
# install dependencies (npm workspaces — single install at repo root)
npm install

# run the Express proxy (:5050) and the Vite dev server (:5173) together
npm run dev
```

The Vite dev server proxies `/septa` to the Express server on port 5050 (see
`server.proxy` in `client/vite.config.ts`).

To test the production setup (static build + the real Cloudflare Function)
locally, use Wrangler:

```bash
npm run cf:dev   # builds client/ then runs `wrangler pages dev`
```

## Tooling

- **Vite** — dev server and production bundler
- **Oxlint** — linting (`npm run lint`)
- **Oxfmt** — formatting (`npm run format`, `npm run format:check`)
- **Husky** + **lint-staged** — format and lint on pre-commit
- **Vitest** — tests (`npm test`)

## Deploying to Cloudflare Pages

Connect the GitHub repo in the Cloudflare dashboard (Workers &amp; Pages > Create >
Pages) and configure:

- **Build command:** `npm run build`
- **Build output directory:** `client/dist`
- **Environment variables:** `VITE_MAPBOX_TOKEN`, and `NODE_VERSION=26`
  (also pinned via `.tool-versions` for local development with mise)

The `functions/` directory is deployed automatically as Pages Functions, so
`GET /septa` is served by `functions/septa.ts`. SPA routing is handled by
`client/public/_redirects`.

You can also deploy from the CLI:

```bash
npm run cf:deploy
```

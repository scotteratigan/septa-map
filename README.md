# septa-map

Display live SEPTA bus &amp; trolley positions on an interactive map.

A React (Create React App) single-page app rendered with deck.gl + Mapbox GL.
Live vehicle positions come from SEPTA's public TransitView feed, proxied
server-side to avoid browser CORS issues.

## Architecture

- **Frontend** (`client/`): React SPA, built to static assets.
- **API** (`functions/septa.js`): a Cloudflare Pages Function exposing
  `GET /septa`, which fetches SEPTA's
  [TransitViewAll](https://www3.septa.org/hackathon/TransitViewAll/) feed and
  flattens it into a single array of vehicles.
- Deployed on **Cloudflare Pages** (static frontend + serverless function).

The legacy Express server (`index.js`) is retained only for local development.

## Environment variables

| Variable                  | Where           | Purpose                                  |
| ------------------------- | --------------- | ---------------------------------------- |
| `REACT_APP_MAPBOX_TOKEN`  | build-time      | Mapbox GL access token for the basemap   |

For local development, copy `client/.env.example` to `client/.env.local` and set
the token. For production, set the same variable as a build-time environment
variable in the Cloudflare Pages project settings.

## Local development

Requires **Node 26** (pinned in `.tool-versions`; [mise](https://mise.jdx.dev/) will
activate it automatically in this directory).

```bash
# install dependencies
npm install
cd client && npm install && cd ..

# run the Express proxy (:5050) and the CRA dev server (:3000) together
npm run dev
```

The CRA dev server proxies `/septa` to the Express server on port 5050 (see
`proxy` in `client/package.json`).

To test the production setup (static build + the real Cloudflare Function)
locally, use Wrangler:

```bash
npm run cf:dev   # builds client/ then runs `wrangler pages dev`
```

## Deploying to Cloudflare Pages

Connect the GitHub repo in the Cloudflare dashboard (Workers &amp; Pages > Create >
Pages) and configure:

- **Build command:** `npm run build`
- **Build output directory:** `client/build`
- **Environment variables:** `REACT_APP_MAPBOX_TOKEN`, and `NODE_VERSION=26`
  (also pinned via `.tool-versions` for local development with mise)

The `functions/` directory is deployed automatically as Pages Functions, so
`GET /septa` is served by `functions/septa.js`. SPA routing is handled by
`client/public/_redirects`.

You can also deploy from the CLI:

```bash
npm run cf:deploy
```

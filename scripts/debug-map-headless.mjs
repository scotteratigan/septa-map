import { chromium } from 'playwright';

const URL = 'http://localhost:5173/';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const logs = [];
page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`));

await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });

await page.waitForFunction(
  () => {
    const el = document.querySelector('.filters__count');
    const m = el?.textContent?.match(/of (\d+) vehicles/);
    return m && Number(m[1]) > 0;
  },
  { timeout: 20000 },
);

await page.waitForTimeout(4000);

const report = await page.evaluate(() => {
  function findDeck() {
    const wrapper = document.getElementById('deckgl-wrapper');
    if (!wrapper) return null;
    const key = Object.keys(wrapper).find((k) => k.startsWith('__reactFiber'));
    let fiber = key ? wrapper[key] : null;
    for (let i = 0; i < 30 && fiber; i++) {
      let state = fiber.memoizedState;
      while (state) {
        if (state.memoizedState?.deck?.isInitialized) {
          return state.memoizedState.deck;
        }
        state = state.next;
      }
      fiber = fiber.return;
    }
    return null;
  }

  const deck = findDeck();
  const layer = deck?.props?.layers?.[0];

  const centerPick = deck?.pickObject({
    x: Math.floor(window.innerWidth / 2),
    y: Math.floor(window.innerHeight / 2),
    radius: 200,
  });

  const phillyPick = deck?.pickObject({
    x: Math.floor(window.innerWidth / 2),
    y: Math.floor(window.innerHeight / 2),
    radius: 500,
  });

  // Sample projected positions for first 3 vehicles
  const projections = [];
  if (deck && layer?.props?.data?.length) {
    const viewport = deck.getViewports()[0];
    for (const d of layer.props.data.slice(0, 3)) {
      const [x, y] = viewport.project(d.coordinates);
      projections.push({ id: d.VehicleID, coordinates: d.coordinates, x, y });
    }
  }

  return {
    countText: document.querySelector('.filters__count')?.textContent,
    canvases: [...document.querySelectorAll('canvas')].map((c) => ({
      id: c.id,
      w: c.width,
      h: c.height,
      cw: c.clientWidth,
      ch: c.clientHeight,
    })),
    deckFound: !!deck,
    deckInitialized: deck?.isInitialized,
    layerId: layer?.id,
    dataLength: layer?.props?.data?.length,
    isLoaded: layer?.isLoaded,
    needsReload: layer?.needsReload,
    loadStatus: layer?.loadStatus,
    iconManager: layer?.state?.iconManager
      ? {
          numIcons: Object.keys(layer.state.iconManager._iconMapping ?? {}).length,
          urls: Object.values(layer.state.iconManager._iconMapping ?? {}).map(
            (v) => v.url ?? v,
          ),
        }
      : null,
    viewport: deck?.getViewports()?.[0]
      ? {
          width: deck.getViewports()[0].width,
          height: deck.getViewports()[0].height,
          zoom: deck.getViewports()[0].zoom,
        }
      : null,
    centerPick: centerPick?.object?.VehicleID ?? null,
    projections,
    svgResources: performance
      .getEntriesByType('resource')
      .filter((e) => e.name.includes('.svg'))
      .map((e) => e.name),
  };
});

console.log(JSON.stringify({ report, logs: logs.filter((l) => !l.includes('[vite]')) }, null, 2));

await page.screenshot({
  path: '/Users/scottratigan/dev/septa-map/scripts/debug-screenshot.png',
});
await browser.close();

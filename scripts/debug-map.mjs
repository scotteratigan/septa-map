import { chromium } from 'playwright';

const URL = 'http://localhost:5173/';
const CHROME =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const browser = await chromium.launch({
  headless: false,
  channel: 'chrome',
  executablePath: CHROME,
  args: ['--auto-open-devtools-for-tabs'],
});

const page = await browser.newPage();

const logs = [];
page.on('console', (msg) => {
  const text = `[${msg.type()}] ${msg.text()}`;
  logs.push(text);
  console.log(text);
});
page.on('pageerror', (err) => {
  const text = `[pageerror] ${err.message}`;
  logs.push(text);
  console.error(text);
});

console.log(`Opening ${URL} ...`);
await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });

// Wait for vehicle data to load
await page.waitForFunction(
  () => {
    const el = document.querySelector('.filters__count');
    if (!el) return false;
    const m = el.textContent?.match(/of (\d+) vehicles/);
    return m && Number(m[1]) > 0;
  },
  { timeout: 20000 },
);

await page.waitForTimeout(3000);

const report = await page.evaluate(() => {
  const countText =
    document.querySelector('.filters__count')?.textContent ?? '';
  const deckCanvas = document.querySelector('#deckgl-overlay, canvas');
  const allCanvases = [...document.querySelectorAll('canvas')].map((c) => ({
    id: c.id,
    className: c.className,
    width: c.width,
    height: c.height,
    clientWidth: c.clientWidth,
    clientHeight: c.clientHeight,
    style: c.getAttribute('style'),
    parent: c.parentElement?.className ?? c.parentElement?.id,
  }));
  const mapCanvas = document.querySelector('.mapboxgl-canvas');
  const deckWrapper = document.querySelector('[id$="-wrapper"]');

  // Try to find deck instance via React fiber on deck wrapper
  let deckDebug = null;
  const wrapper = document.getElementById('deckgl-wrapper');
  if (wrapper) {
    const key = Object.keys(wrapper).find((k) => k.startsWith('__reactFiber'));
    let fiber = key ? wrapper[key] : null;
    for (let i = 0; i < 20 && fiber; i++) {
      const deck = fiber.memoizedState?.memoizedState?.deck;
      if (deck?.isInitialized) {
        const layer = deck.props.layers?.[0];
        deckDebug = {
          layerId: layer?.id,
          layerCount: deck.props.layers?.length,
          dataLength: layer?.props?.data?.length ?? layer?.state?.data?.length,
          isLoaded: layer?.isLoaded,
          needsReload: layer?.needsReload,
          viewports: deck.getViewports().map((v) => ({
            id: v.id,
            width: v.width,
            height: v.height,
            zoom: v.zoom,
            latitude: v.latitude,
            longitude: v.longitude,
          })),
          pickCenter: deck.pickObject({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
            radius: 50,
          }),
        };
        break;
      }
      fiber = fiber.return;
    }
  }

  const iconUrls = [...document.querySelectorAll('img')].map((img) => img.src);
  const svgRequests = performance
    .getEntriesByType('resource')
    .filter((e) => e.name.includes('.svg'))
    .map((e) => ({ name: e.name, duration: e.duration }));

  return {
    countText,
    deckWrapperExists: !!deckWrapper,
    mapCanvasExists: !!mapCanvas,
    allCanvases,
    deckDebug,
    iconUrls,
    svgRequests,
    mapPageStyle: document.getElementById('map-page')?.getBoundingClientRect(),
  };
});

console.log('\n=== DEBUG REPORT ===');
console.log(JSON.stringify(report, null, 2));

// Screenshot for inspection
await page.screenshot({
  path: '/Users/scottratigan/dev/septa-map/scripts/debug-screenshot.png',
  fullPage: true,
});
console.log('\nScreenshot: scripts/debug-screenshot.png');
console.log('Chrome left open for manual inspection. Close the browser when done.');

// Keep browser open
await new Promise(() => {});

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { chromium } from 'playwright';

const DEV_DIR = join(process.cwd(), '.dev');
const BROWSER_INFO = join(DEV_DIR, 'browser.json');
const SCREENSHOT = join(DEV_DIR, 'inspect-screenshot.png');

function loadBrowserInfo() {
  try {
    return JSON.parse(readFileSync(BROWSER_INFO, 'utf8'));
  } catch {
    throw new Error(
      'No .dev/browser.json found. Run `npm run dev` first to launch Chrome.',
    );
  }
}

async function getAppPage(browser, appUrl) {
  const base = appUrl.replace(/\/$/, '');
  for (const context of browser.contexts()) {
    for (const page of context.pages()) {
      if (page.url().startsWith(base)) return page;
    }
  }

  const context = browser.contexts()[0] ?? (await browser.newContext());
  const page = await context.newPage();
  await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  return page;
}

async function main() {
  const { appUrl, cdpUrl } = loadBrowserInfo();
  const browser = await chromium.connectOverCDP(cdpUrl);
  const page = await getAppPage(browser, appUrl);

  const logs = [];
  const hook = (msg) => logs.push(`[${msg.type()}] ${msg.text()}`);
  page.on('console', hook);

  if (!page.url().startsWith(appUrl.replace(/\/$/, ''))) {
    await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  }

  await page
    .waitForFunction(
      () => {
        const el = document.querySelector('.filters__count');
        const m = el?.textContent?.match(/of (\d+) vehicles/);
        return m && Number(m[1]) > 0;
      },
      { timeout: 20_000 },
    )
    .catch(() => {});

  await page.waitForTimeout(2000);

  mkdirSync(DEV_DIR, { recursive: true });
  await page.screenshot({ path: SCREENSHOT, fullPage: true });

  const report = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    countText: document.querySelector('.filters__count')?.textContent ?? null,
    mapLoaded: !!document.querySelector('.mapboxgl-canvas'),
    deckLoaded: !!document.getElementById('deckgl-overlay'),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  }));

  page.off('console', hook);

  const output = {
    ...report,
    screenshot: SCREENSHOT,
    errors: logs.filter(
      (line) => line.startsWith('[error]') || line.startsWith('[pageerror]'),
    ),
    warnings: logs.filter((line) => line.startsWith('[warning]')),
  };

  writeFileSync(join(DEV_DIR, 'inspect-report.json'), JSON.stringify(output, null, 2));
  console.log(JSON.stringify(output, null, 2));
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});

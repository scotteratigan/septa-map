import { accessSync, mkdirSync, writeFileSync } from "fs";
import { spawn } from "child_process";
import { join } from "path";

const APP_URL = process.env.APP_URL ?? "http://localhost:5173";
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT ?? 9222);
const DEV_DIR = join(process.cwd(), ".dev");
const PROFILE_DIR = join(DEV_DIR, "chrome-profile");
const BROWSER_INFO = join(DEV_DIR, "browser.json");

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);

  for (const path of candidates) {
    try {
      accessSync(path);
      return path;
    } catch {
      // try next candidate
    }
  }

  throw new Error(
    "Chrome not found. Set CHROME_PATH to your Chrome/Chromium executable.",
  );
}

async function waitForUrl(url, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function getCdpVersion(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json/version`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function waitForCdp(port, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const version = await getCdpVersion(port);
    if (version) return version;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for Chrome CDP on port ${port}`);
}

function writeBrowserInfo(version) {
  mkdirSync(DEV_DIR, { recursive: true });
  writeFileSync(
    BROWSER_INFO,
    JSON.stringify(
      {
        appUrl: APP_URL,
        cdpUrl: `http://127.0.0.1:${DEBUG_PORT}`,
        webSocketDebuggerUrl: version.webSocketDebuggerUrl,
        browser: version.Browser,
        userAgent: version["User-Agent"],
      },
      null,
      2,
    ),
  );
}

async function main() {
  console.log(`Waiting for ${APP_URL} ...`);
  await waitForUrl(APP_URL);

  let version = await getCdpVersion(DEBUG_PORT);

  if (!version) {
    mkdirSync(PROFILE_DIR, { recursive: true });
    const chrome = findChrome();
    console.log(`Launching Chrome with CDP port ${DEBUG_PORT} ...`);

    spawn(
      chrome,
      [
        `--remote-debugging-port=${DEBUG_PORT}`,
        `--user-data-dir=${PROFILE_DIR}`,
        "--no-first-run",
        "--no-default-browser-check",
        APP_URL,
      ],
      { stdio: "ignore", detached: true },
    ).unref();

    version = await waitForCdp(DEBUG_PORT);
  } else {
    console.log(`Reusing Chrome already listening on CDP port ${DEBUG_PORT}`);
    // Ensure the app tab is open
    try {
      await fetch(`${APP_URL}/`);
    } catch {
      // ignore — user may navigate manually
    }
  }

  writeBrowserInfo(version);

  console.log(`App:      ${APP_URL}`);
  console.log(`CDP:      http://127.0.0.1:${DEBUG_PORT}`);
  console.log(`Agent info written to .dev/browser.json`);
  console.log(`Inspect:  npm run inspect`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});

import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const publicDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "client",
  "public",
);
const svg = readFileSync(join(publicDir, "favicon.svg"), "utf8");

const browser = await chromium.launch();
const page = await browser.newPage();

for (const { size, filename } of [
  { size: 32, filename: "favicon-32.png" },
  { size: 192, filename: "logo192.png" },
  { size: 512, filename: "logo512.png" },
]) {
  const sizedSvg = svg
    .replace(/width="[^"]*"/, `width="${size}"`)
    .replace(/height="[^"]*"/, `height="${size}"`);
  await page.setContent(
    `<!DOCTYPE html><html><body style="margin:0;width:${size}px;height:${size}px">${sizedSvg}</body></html>`,
    { waitUntil: "load" },
  );
  await page.setViewportSize({ width: size, height: size });
  const buffer = await page.screenshot({ type: "png" });
  writeFileSync(join(publicDir, filename), buffer);
}

await browser.close();
console.log("Generated favicon PNGs in client/public/");

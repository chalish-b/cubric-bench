import { chromium, type Browser, type Page } from "playwright";
import type { PllCase } from "./pll-cases";

const VIEWPORT = { width: 512, height: 512 };

function buildUrl(
  baseUrl: string,
  cubeState: PllCase["cubeState"],
  cameraPosition: PllCase["cameraPosition"],
): string {
  const params = new URLSearchParams({
    state: JSON.stringify(cubeState),
    ghosts: "off",
    labels: "off",
    noUI: "1",
    cameraX: String(cameraPosition[0]),
    cameraY: String(cameraPosition[1]),
    cameraZ: String(cameraPosition[2]),
  });
  return `${baseUrl}?${params}`;
}

async function waitForReady(page: Page) {
  //@ts-expect-error Global property on window
  await page.waitForFunction(() => window.__CUBRIC_READY === true, null, {
    timeout: 10000,
  });
  // Give the renderer a frame to finish painting
  await page.waitForTimeout(200);
}

export async function captureScreenshots(
  cases: PllCase[],
  outputDir: string,
  port: number,
): Promise<void> {
  const baseUrl = `http://localhost:${port}`;
  const browser: Browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  try {
    for (let i = 0; i < cases.length; i++) {
      const c = cases[i];
      const num = `[${i + 1}/${cases.length}]`;
      console.log(`${num} Capturing ${c.id}...`);

      const url = buildUrl(baseUrl, c.cubeState, c.cameraPosition);
      await page.goto(url);
      await waitForReady(page);
      await page.screenshot({
        path: `${outputDir}/images/${c.id}.png`,
      });
    }
  } finally {
    await browser.close();
  }
}

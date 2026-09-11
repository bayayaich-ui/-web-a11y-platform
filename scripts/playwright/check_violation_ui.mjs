import fs from 'fs';
import { chromium } from 'playwright';

async function run() {
  const url = process.env.VIOLATION_UI_URL || 'http://localhost:3000/scans/1/violations/800ae24b-4df9-4607-8129-59c9a4ec5b29';
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  // wait briefly for SSE updates
  await page.waitForTimeout(1500);
  const screenshotPath = 'violation_detail.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Screenshot saved to', screenshotPath);
  await browser.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

import { Page } from 'playwright';

export async function capturePageScreenshot(page: Page): Promise<Buffer> {
  const screenshot = await page.screenshot({
    fullPage: true,
    type: 'png',
  });

  return screenshot;
}
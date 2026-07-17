import { Page } from 'playwright';
import { capturePageScreenshot } from './capture';
import { uploadScreenshot } from '../storage/s3-client';
import { randomUUID } from 'crypto';

export interface PageScreenshotResult {
  pageId: string;
  scanId: string;
  pageUrl: string;
  screenshotKey: string;
  capturedAt: string;
}

export async function captureAndStoreScreenshot(
  page: Page,
  scanId: string,
  pageUrl: string
): Promise<PageScreenshotResult> {
  const pageId = randomUUID();

  const imageBuffer = await capturePageScreenshot(page);
  const screenshotKey = await uploadScreenshot(scanId, pageId, imageBuffer);

  return {
    pageId,
    scanId,
    pageUrl,
    screenshotKey,
    capturedAt: new Date().toISOString(),
  };
}
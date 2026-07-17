import { describe, it, expect, afterAll } from 'vitest';
import { BrowserPoolManager } from '../browser-pool/pool-manager';
import { captureAndStoreScreenshot } from './screenshot-service';

describe('captureAndStoreScreenshot', () => {
  const pool = new BrowserPoolManager(2);

  afterAll(async () => {
    await pool.shutdown();
  });

  it('devrait capturer et uploader un screenshot vers MinIO', async () => {
    await pool.initialize();
    const { page, context } = await pool.acquirePage();

    await page.goto('https://example.com');

    const result = await captureAndStoreScreenshot(page, 'test-scan-id', 'https://example.com');

    expect(result.screenshotKey).toContain('screenshots/test-scan-id/');
    expect(result.pageId).toBeDefined();

    await pool.releasePage(context);
  }, 15000);
});
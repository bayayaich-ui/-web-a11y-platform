import { describe, it, expect, afterAll } from 'vitest';
import { BrowserPoolManager } from '../browser-pool/pool-manager';
import { crawlSite } from './crawler';

describe('crawlSite', () => {
  const pool = new BrowserPoolManager(2);

  afterAll(async () => {
    await pool.shutdown();
  });

  it('devrait crawler example.com en respectant robots.txt', async () => {
    await pool.initialize();

    const results = await crawlSite('https://example.com', pool, {
      maxDepth: 1,
      maxPages: 5,
    });

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].title).toBe('Example Domain');
  }, 15000);
});
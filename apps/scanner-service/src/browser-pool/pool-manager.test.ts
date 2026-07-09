import { describe, it, expect, afterAll } from 'vitest';
import { BrowserPoolManager } from './pool-manager';

describe('BrowserPoolManager', () => {
  const pool = new BrowserPoolManager(2);

  afterAll(async () => {
    await pool.shutdown();
  });

  it('devrait initialiser le pool sans erreur', async () => {
    await pool.initialize();
    expect(true).toBe(true);
  });

  it('devrait rendre une page simple et récupérer son titre', async () => {
    await pool.initialize();
    const { page, context } = await pool.acquirePage();

    await page.goto('https://example.com');
    const title = await page.title();

    expect(title).toBe('Example Domain');

    await pool.releasePage(context);
  }, 15000);
});
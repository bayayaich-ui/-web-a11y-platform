import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchSites, resolveScanMode } from '../lib/api';

describe('fetchSites', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns an empty list on 401 instead of silently falling back to mock data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Authentification requise.' }),
    }));

    await expect(fetchSites()).resolves.toEqual([]);
  });

  it('defaults the displayed mode to single_page when a scan exists but no explicit mode is stored', () => {
    expect(resolveScanMode({
      scan_mode: null,
      last_scan_mode: null,
      last_scan_score: 87,
      last_scan_date: '2026-08-31T00:00:00.000Z',
    })).toBe('single_page');
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatElapsed, estimateRemaining } from '../lib/scan-utils';

describe('scan-utils', () => {
  const ORIGINAL_DATE_NOW = Date.now;

  beforeEach(() => {
    // Freeze time for deterministic tests
    vi.setSystemTime(new Date('2026-01-01T00:01:05Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('formatElapsed shows minutes for >60s', () => {
    const started = '2026-01-01T00:00:00Z'; // 65s earlier
    const out = formatElapsed(started);
    expect(out).toBe('1 min');
  });

  it('estimateRemaining returns estimated seconds for small durations', () => {
    // started 2s ago, 2 pages scanned, 5 max pages -> avg 1s/page -> remaining 3s
    const now = Date.now();
    const started = new Date(now - 2000).toISOString();
    const out = estimateRemaining(started, 2, 5);
    expect(out).toMatch(/Environ 3 s/);
  });
});

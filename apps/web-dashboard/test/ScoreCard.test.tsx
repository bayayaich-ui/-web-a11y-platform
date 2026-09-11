import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ScoreCard from '../components/ScoreCard';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const baseScan = {
  id: 'scan-1',
  status: 'completed',
  score_global: 88,
};

describe('ScoreCard', () => {
  beforeEach(() => {
    // reset global.fetch mock if present
    // @ts-ignore
    if (global.fetch && global.fetch.mockClear) global.fetch.mockClear();
  });

  it('renders percentage and progress bar when score present', () => {
    render(<ScoreCard scan={baseScan as any} />);
    expect(screen.getByText(/88%/)).toBeInTheDocument();
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '88');
  });

  it('renders N/A when score missing', () => {
    const s = { ...baseScan, score_global: null, status: 'completed' } as any;
    render(<ScoreCard scan={s} />);
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('calls refresh and updates displayed score', async () => {
    const s = { ...baseScan, score_global: 55 } as any;
    // mock fetch to return new score
    // @ts-ignore
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ ...s, score_global: 77 }) })
    );

    render(<ScoreCard scan={s} />);
    const btn = screen.getByRole('button', { name: /Rafraîchir/i });
    fireEvent.click(btn);

    await waitFor(() => expect(screen.getByText(/77%/)).toBeInTheDocument());
  });
});

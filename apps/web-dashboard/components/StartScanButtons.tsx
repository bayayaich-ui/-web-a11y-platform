"use client";
import { useState } from "react";
import { triggerScan } from "../lib/api";

export default function StartScanButtons({ siteId }: { siteId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleScan(mode: 'single_page' | 'full_site') {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await triggerScan(siteId, mode);
      setSuccess(`Scan déclenché (${res.scan_id})`);
      // navigate to scan detail page to show progress
      // client-only navigation using window.location to keep it simple
      window.location.href = `/scans/${res.scan_id}`;
    } catch (err: any) {
      setError(err?.message ?? 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        className="px-3 py-1 rounded bg-surface border border-border text-sm hover:opacity-90"
        onClick={() => handleScan('single_page')}
        disabled={loading}
      >
        Scan page
      </button>

      <button
        className="px-3 py-1 rounded bg-[var(--color-primary)] text-[var(--color-primary-contrast)] text-sm hover:opacity-95"
        onClick={() => handleScan('full_site')}
        disabled={loading}
      >
        Scan site
      </button>

      {loading && <span className="text-mineur text-sm">En cours...</span>}
      {error && <span className="text-bloquant text-sm">{error}</span>}
      {success && <span className="text-success text-sm">{success}</span>}
    </div>
  );
}

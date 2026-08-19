import { fetchSites } from '../../lib/api';
import { ScanList } from '../../components/ScanList';
import { cookies } from 'next/headers';

export default async function ScansPage() {
  const sites = await fetchSites((await cookies()).toString());
  return <div className="space-y-8"><div><p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">Monitoring</p><h1 className="mt-2 font-display text-3xl font-bold text-[#102d4f]">Scans</h1><p className="mt-2 text-[var(--color-muted)]">Un accès rapide au dernier diagnostic de chaque site.</p></div><ScanList sites={sites} /></div>;
}

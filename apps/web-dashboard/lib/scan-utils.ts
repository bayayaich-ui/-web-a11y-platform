export function deriveStepLabel(status: string) { return status === 'completed' ? 'Analyse terminée' : status === 'completed_with_errors' ? 'Analyse terminée avec erreurs' : status === 'failed' ? 'Analyse interrompue' : 'Analyse en cours'; }
export function formatElapsed(startedAt: string | null) { if (!startedAt) return '—'; return `${Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 60000))} min`; }
export function estimateRemaining(startedAt: string | null, pagesScanned = 0, maxPages = 1) {
	if (!startedAt || !pagesScanned) return 'calcul en cours';
	const elapsedSeconds = Math.max(1, (Date.now() - new Date(startedAt).getTime()) / 1000);
	const remainingSeconds = Math.max(0, Math.ceil((elapsedSeconds / pagesScanned) * Math.max(0, maxPages - pagesScanned)));
	return remainingSeconds < 60 ? `Environ ${remainingSeconds} s` : `${Math.ceil(remainingSeconds / 60)} min`;
}
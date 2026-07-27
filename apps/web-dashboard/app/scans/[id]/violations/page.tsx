import { mockViolations } from '../../../../lib/mock-data';
import { PRIORITY_DISPLAY } from '../../../../lib/types';

export default function ViolationsPage() {
  const triees = [...mockViolations].sort((a, b) => {
    const order = { bloquant: 0, majeur: 1, mineur: 2 };
    return order[a.priority] - order[b.priority];
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">Violations détectées</h1>

      <ul className="flex flex-col gap-3">
        {triees.map((v) => {
          const display = PRIORITY_DISPLAY[v.priority];
          return (
            <li
              key={v.id}
              className="bg-white rounded-lg border border-border p-4 flex items-start gap-4"
            >
              <span
                className={`shrink-0 px-2 py-1 rounded text-xs font-semibold border ${display.className}`}
              >
                {display.label}
              </span>
              <div>
                <div className="font-medium">{v.titre}</div>
                <div className="text-sm text-mineur font-mono">
                  {v.rule} · {v.pageUrl}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
import Link from 'next/link';

const navItems = [
  { href: '/sites', label: 'Sites' },
  { href: '/scans', label: 'Scans' },
];

export function Sidebar() {
  return (
    <nav aria-label="Navigation principale" className="w-64 bg-ink text-white p-6 flex flex-col gap-1">
      <div className="font-display font-bold text-lg mb-8">A11y Platform</div>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="px-3 py-2 rounded hover:bg-white/10 transition-colors"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
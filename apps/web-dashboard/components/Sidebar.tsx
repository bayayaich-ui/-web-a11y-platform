"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/sites', label: 'Sites' },
  { href: '/scans', label: 'Scans' },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigation principale" className="w-64 bg-[var(--color-primary)] text-[var(--color-primary-contrast)] p-6 flex flex-col gap-2" role="navigation">
      <div className="font-display font-bold text-lg mb-6">A11y Platform</div>
      <ul className="flex flex-col gap-1" role="list">
        {navItems.map((item) => (
          <li key={item.href} role="listitem">
            <Link
              href={item.href}
              className="block px-3 py-2 rounded-md hover:bg-white/10 focus-ring min-touch"
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useLanguage } from './LanguageSwitcher';

const navItems = [
  { href: '/sites', label: 'Vue d’ensemble', icon: '⌂' },
  { href: '/scans', label: 'Scans', icon: '◌' },
  { href: '/violations', label: 'Violations', icon: '!' },
  { href: '/reports', label: 'Rapports', icon: '▤' },
];

const manageItems = [
  { href: '/team', label: 'Équipe', icon: '♙' },
  { href: '/settings', label: 'Paramètres', icon: '⚙' },
  { href: '/help', label: 'Aide', icon: '?' },
];

export function Sidebar() {
  const pathname = usePathname();
  const english = useLanguage() === 'en';
  return (
    <nav aria-label="Navigation principale" className="hidden w-64 shrink-0 border-r border-[var(--color-border)] bg-[#102d4f] px-4 py-6 text-white lg:flex lg:flex-col" role="navigation">
      <Link href="/sites" className="mb-10 flex items-center gap-3 px-3 focus-ring">
        <Image src="/dashboard-logo.png" alt="A11y AccessIQ" width={48} height={48} className="h-11 w-11 rounded-lg" priority />
        <span><span className="block font-display text-lg font-bold">AccessIQ</span><span className="block text-xs text-[#c6d8e9]">ACCESSIBILITY OS</span></span>
      </Link>
      <p className="px-3 pb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#9eb7cd]">{english ? 'Workspace' : 'Workspace'}</p>
      <ul className="flex flex-col gap-1" role="list">
        {navItems.map((item) => (
          <li key={item.href} role="listitem">
            <Link
              href={item.href}
              className={`flex min-touch items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-ring ${pathname === item.href ? 'bg-white text-[#102d4f]' : 'text-[#d8e6f2] hover:bg-white/10'}`}
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              <span aria-hidden="true" className="w-5 text-center text-lg">{item.icon}</span>{english ? ({ '/sites': 'Overview', '/scans': 'Scans', '/violations': 'Violations', '/reports': 'Reports' }[item.href] ?? item.label) : item.label}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-8 px-3 pb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#9eb7cd]">{english ? 'Manage' : 'Gestion'}</p>
      <ul className="flex flex-col gap-1" role="list">
        {manageItems.map((item) => <li key={item.href}><Link href={item.href} className={`flex min-touch items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-ring ${pathname === item.href ? 'bg-white text-[#102d4f]' : 'text-[#d8e6f2] hover:bg-white/10'}`} aria-current={pathname === item.href ? 'page' : undefined}><span aria-hidden="true" className="w-5 text-center text-lg">{item.icon}</span>{english ? ({ '/team': 'Team', '/settings': 'Settings', '/help': 'Help' }[item.href] ?? item.label) : item.label}</Link></li>)}
      </ul>
      <div className="mt-auto rounded-xl border border-white/15 bg-white/10 p-4 text-sm">
        <p className="font-semibold">{english ? 'Need help?' : 'Besoin d’aide ?'}</p><p className="mt-1 text-xs leading-5 text-[#c6d8e9]">{english ? 'Our WCAG guides support you through every fix.' : 'Nos guides WCAG vous accompagnent dans chaque correction.'}</p>
      </div>
    </nav>
  );
}
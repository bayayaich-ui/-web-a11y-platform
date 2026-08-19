'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/login') return <>{children}</>;
  return <div className="flex min-h-screen"><Sidebar /><div className="min-w-0 flex-1"><Header /><main id="main-content" className="mx-auto w-full max-w-[1440px] p-5 sm:p-8">{children}</main></div></div>;
}
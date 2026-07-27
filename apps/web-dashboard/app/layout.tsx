import './globals.css';
import { Sidebar } from '../components/Sidebar';

export const metadata = {
  title: 'Web Accessibility Platform — Dashboard',
  description: 'Suivi de conformité WCAG en temps réel',
};

import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-brand focus:text-white focus:px-4 focus:py-2 focus:rounded"
        >
          Aller au contenu principal
        </a>
        <div className="flex min-h-screen">
          <Sidebar />
          <main id="main-content" className="flex-1 p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
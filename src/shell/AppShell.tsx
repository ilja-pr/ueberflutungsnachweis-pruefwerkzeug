'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { isActive, TABS } from './tabs';

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <div>
            <div className="title">Überflutungsnachweis</div>
            <div className="subtitle">Prüfwerkzeug · DIN 1986-100 · DWA-A 138-1</div>
          </div>
        </div>
        <nav className="tabs" aria-label="Bereiche">
          {TABS.map((t) => {
            const on = isActive(pathname, t.href);
            return (
              <Link key={t.href} href={t.href} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined}>
                {t.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {children}

      <footer className="foot">
        Prüfwerkzeug und Prototyp, kein Ersatz für die Fachplanung. Beispielwerte sind keine echten KOSTRA-Daten. Formeln: DIN 1986-100 Gl. 20, 21, 22 (Quelle: Merkblätter Stadt Bielefeld 2025 und Gütersloh); Gl. 19 ist noch offen.
      </footer>
    </div>
  );
}

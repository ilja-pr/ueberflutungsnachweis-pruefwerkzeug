import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from '../shell/AppShell';
import { Providers } from '../shell/Providers';
import '../styles/index.css';

export const metadata: Metadata = {
  title: { default: 'Überflutungsnachweis Prüfwerkzeug', template: '%s · Überflutungsnachweis' },
  description: 'Prüfwerkzeug für den Überflutungsnachweis nach DIN 1986-100 (DWA-A 138-1), GRAF VSO',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}

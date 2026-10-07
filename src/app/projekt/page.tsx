import type { Metadata } from 'next';
import { ProjektPage } from '../../features/info/ProjektPage';

export const metadata: Metadata = { title: 'Projekt & Variablen' };

export default function Page() {
  return <ProjektPage />;
}

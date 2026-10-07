import type { Metadata } from 'next';
import { EinbauenPage } from '../../features/info/einbauen/EinbauenPage';

export const metadata: Metadata = { title: 'Einbauen' };

export default function Page() {
  return <EinbauenPage />;
}

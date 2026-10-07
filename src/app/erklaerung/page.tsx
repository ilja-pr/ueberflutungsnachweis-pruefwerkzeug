import type { Metadata } from 'next';
import { ErklaerungPage } from '../../features/info/ErklaerungPage';

export const metadata: Metadata = { title: 'So wird gerechnet' };

export default function Page() {
  return <ErklaerungPage />;
}

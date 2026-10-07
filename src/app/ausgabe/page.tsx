import type { Metadata } from 'next';
import { OutputPage } from '../../features/output/OutputPage';

export const metadata: Metadata = { title: 'Ausgabe' };

export default function Page() {
  return <OutputPage />;
}

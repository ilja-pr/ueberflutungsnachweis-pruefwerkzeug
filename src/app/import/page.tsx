import type { Metadata } from 'next';
import { ImportCheckPage } from '../../features/importCheck/ImportCheckPage';

export const metadata: Metadata = { title: 'VSO-Import & Prüfung' };

export default function Page() {
  return <ImportCheckPage />;
}

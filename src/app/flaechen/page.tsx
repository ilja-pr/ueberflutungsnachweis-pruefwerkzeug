import type { Metadata } from 'next';
import { FlaechenPage } from '../../features/info/FlaechenPage';

export const metadata: Metadata = { title: 'Flächenarten' };

export default function Page() {
  return <FlaechenPage />;
}

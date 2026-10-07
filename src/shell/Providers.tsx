'use client';

import type { ReactNode } from 'react';
import { ImportCheckProvider } from '../features/importCheck/ImportCheckContext';
import { CalculatorProvider } from './CalculatorContext';

/**
 * Der Zustand liegt im Layout und nicht in den Seiten. So bleiben Eingaben und geladene
 * VSO-Daten erhalten, wenn man zwischen den Tabs (Routen) wechselt.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <CalculatorProvider>
      <ImportCheckProvider>{children}</ImportCheckProvider>
    </CalculatorProvider>
  );
}

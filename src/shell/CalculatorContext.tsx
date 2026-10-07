import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { compute } from '../features/calculator/compute';
import { defaultInputs } from '../features/calculator/defaults';
import { sanitizeInputs } from '../features/calculator/sanitize';
import type { Computed, Inputs } from '../features/calculator/types';
import { usePersistentState } from '../shared/hooks/usePersistentState';

interface CalculatorContextValue {
  inp: Inputs;
  computed: Computed;
  /** Eingaben ändern, wie setState mit Funktion */
  update: (fn: (draft: Inputs) => Inputs) => void;
  /** Alle Eingaben ersetzen (z. B. nach Laden einer Datei) */
  replace: (next: Inputs) => void;
  reset: () => void;
}

const Ctx = createContext<CalculatorContextValue | null>(null);
const STORE_KEY = 'ueberflutungsnachweis-pruefwerkzeug-v2';

export function CalculatorProvider({ children }: { children: ReactNode }) {
  const [inp, setInp] = usePersistentState<Inputs>(STORE_KEY, defaultInputs, sanitizeInputs);
  const computed = useMemo(() => compute(inp), [inp]);
  const update = useCallback((fn: (d: Inputs) => Inputs) => setInp((d) => fn(d)), [setInp]);
  const replace = useCallback((next: Inputs) => setInp(next), [setInp]);
  const reset = useCallback(() => setInp(defaultInputs()), [setInp]);
  const value = useMemo(() => ({ inp, computed, update, replace, reset }), [inp, computed, update, replace, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCalculator(): CalculatorContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCalculator braucht einen CalculatorProvider');
  return v;
}

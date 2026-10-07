import { useEffect, useRef, useState } from 'react';

/**
 * useState, das im localStorage gemerkt wird.
 *
 * Next rendert die Seite zuerst auf dem Server (beim Export: beim Build), dort gibt es keinen localStorage.
 * Deshalb startet der Wert immer mit `initial()`; der gespeicherte Wert wird erst nach dem Einhängen im Browser geladen
 * (sonst passt das HTML nicht zu dem, was der Browser rechnet). Gespeichert wird erst danach, damit der Startwert
 * den gemerkten Wert nicht überschreibt. Fehlt der Speicher oder ist er kaputt, bleibt es still beim Startwert.
 *
 * Dritter Rückgabewert: `loaded` ist true, sobald der gemerkte Wert (falls vorhanden) übernommen wurde.
 */
export function usePersistentState<T>(key: string, initial: () => T, revive?: (raw: unknown) => T | null) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  const reviveRef = useRef(revive);
  reviveRef.current = revive;

  useEffect(() => {
    try {
      const s = localStorage.getItem(key);
      if (s) {
        const raw = JSON.parse(s);
        const v = reviveRef.current ? reviveRef.current(raw) : (raw as T);
        if (v !== null) setValue(v);
      }
    } catch {
      /* Speicher nicht verfügbar oder kaputt: Startwert bleibt */
    }
    setLoaded(true);
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignorieren */
    }
  }, [key, value, loaded]);

  return [value, setValue, loaded] as const;
}

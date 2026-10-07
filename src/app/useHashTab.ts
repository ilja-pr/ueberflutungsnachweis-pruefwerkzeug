import { useCallback, useEffect, useState } from 'react';
import { isTabId, type TabId } from './tabs';

/** Aktiver Tab, im URL-Hash gemerkt (#/import). Andere Anker (#step-db) lassen den Tab unverändert. */
export function useHashTab(initial: TabId = 'rechner') {
  const read = (): TabId | null => {
    const m = /^#\/(\w+)/.exec(window.location.hash);
    return m && isTabId(m[1]) ? m[1] : null;
  };
  const [tab, setTabState] = useState<TabId>(() => read() ?? initial);

  useEffect(() => {
    const onHash = () => {
      const t = read();
      if (t) setTabState(t);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const setTab = useCallback((t: TabId) => {
    setTabState(t);
    try {
      window.history.replaceState(null, '', `#/${t}`);
    } catch {
      /* z. B. file:// in manchen Browsern: Tab bleibt trotzdem umgeschaltet */
    }
    window.scrollTo({ top: 0 });
  }, []);

  return [tab, setTab] as const;
}

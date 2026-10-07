export type TabId = 'rechner' | 'ausgabe' | 'import' | 'erklaerung' | 'projekt' | 'einbauen' | 'flaechen';

export const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'rechner', label: 'Rechner' },
  { id: 'ausgabe', label: 'Ausgabe' },
  { id: 'import', label: 'VSO-Import & Prüfung' },
  { id: 'erklaerung', label: 'So wird gerechnet' },
  { id: 'projekt', label: 'Projekt & Variablen' },
  { id: 'einbauen', label: 'Einbauen' },
  { id: 'flaechen', label: 'Flächenarten' },
];

export const isTabId = (s: string): s is TabId => TABS.some((t) => t.id === s);

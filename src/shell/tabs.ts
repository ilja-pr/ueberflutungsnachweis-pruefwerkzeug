export interface Tab {
  /** Pfad der Route, mit abschließendem Schrägstrich (trailingSlash im Export) */
  href: string;
  label: string;
}

/** Reihenfolge der Navigation. Rechner liegt auf „/“, alle anderen auf einer eigenen Route unter src/app/. */
export const TABS: Tab[] = [
  { href: '/', label: 'Rechner' },
  { href: '/ausgabe/', label: 'Ausgabe' },
  { href: '/import/', label: 'VSO-Import & Prüfung' },
  { href: '/erklaerung/', label: 'So wird gerechnet' },
  { href: '/projekt/', label: 'Projekt & Variablen' },
  { href: '/einbauen/', label: 'Einbauen' },
  { href: '/flaechen/', label: 'Flächenarten' },
];

const clean = (p: string) => (p.length > 1 ? p.replace(/\/+$/, '') : p) || '/';

export const isActive = (pathname: string | null, href: string) => clean(pathname ?? '/') === clean(href);

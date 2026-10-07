const nf = (d: number) => new Intl.NumberFormat('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
const cache = new Map<number, Intl.NumberFormat>();

/** Deutsche Zahlenformatierung: Komma, Tausenderpunkt. */
export function fmt(n: number | null | undefined, decimals = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '–';
  let f = cache.get(decimals);
  if (!f) {
    f = nf(decimals);
    cache.set(decimals, f);
  }
  return f.format(n);
}

/** Text → Zahl, akzeptiert "1,5" und "1.5". Leer/ungültig → null. */
export function parseNum(s: string): number | null {
  const t = s.trim().replace(/\s/g, '').replace(',', '.');
  if (t === '' || t === '-' || t === '.') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Zelle für CSV/TSV: Anführungszeichen verdoppeln, wenn nötig quoten. */
export function csvCell(s: string, sep: string): string {
  return /["\n\r]/.test(s) || s.includes(sep) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Tabelle als CSV (Semikolon, mit BOM für Excel) oder TSV (Tab, zum Einfügen). */
export function tableToDelimited(rows: string[][], kind: 'csv' | 'tsv'): string {
  const sep = kind === 'csv' ? ';' : '\t';
  const body = rows.map((r) => r.map((c) => csvCell(c, sep)).join(sep)).join('\r\n');
  return kind === 'csv' ? '﻿' + body : body;
}

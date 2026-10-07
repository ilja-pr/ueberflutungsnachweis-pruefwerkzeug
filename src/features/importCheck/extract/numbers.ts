/** Zahl in deutscher oder englischer Schreibweise lesen. "1.234,56" → 1234.56, "0,95" → 0.95, "1.5" → 1.5 */
export function parseGermanNumber(raw: string): number | null {
  let s = raw.trim().replace(/\s/g, '');
  if (!/^-?[\d.,]+$/.test(s)) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export interface NumberToken {
  value: number;
  unit: string;
  /** Position im Text */
  index: number;
}

const UNIT_ALIASES: Record<string, string> = {
  'm²': 'm2',
  qm: 'm2',
  m2: 'm2',
  'm³': 'm3',
  m3: 'm3',
  cbm: 'm3',
  'l/s': 'l/s',
  ls: 'l/s',
  jahre: 'a',
  jahr: 'a',
  a: 'a',
  m: 'm',
  mm: 'mm',
  min: 'min',
  '%': '%',
};

/** Alle Zahlen mit optionaler Einheit in einem Textstück. */
export function numberTokens(text: string): NumberToken[] {
  const out: NumberToken[] = [];
  const re = /(-?\d[\d.,]*)\s*(m²|m³|m2|m3|qm|cbm|l\s*\/\s*s(?!\s*·)|jahre|jahr|min|mm|%|a\b|m\b)?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const num = parseGermanNumber(m[1].replace(/[.,]+$/, ''));
    if (num === null) continue;
    const unitRaw = (m[2] ?? '').toLowerCase().replace(/\s/g, '');
    out.push({ value: num, unit: UNIT_ALIASES[unitRaw] ?? '', index: m.index });
  }
  return out;
}

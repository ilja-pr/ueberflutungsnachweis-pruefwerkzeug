/*
 * Text aus dem VSO → Fundstücke. Drei Wege, alle rein (ohne Browser-Funktionen) und damit testbar:
 *   1. Strukturiert: JSON oder Formulardaten (configuration[surfaceValue][0][area]=600 …)
 *   2. Beschriftungen: Zeilen wie "Regenhäufigkeit: 5 Jahre" (PDF-Text, kopierte Seite)
 *   3. Eigene Dateien: Eingaben-JSON oder HTML-Bericht dieses Prüfwerkzeugs
 */
import { rainIntensityFromDepth } from '../../../core/floodProof';
import { SURFACE_TYPES } from '../../../core/surfaceTypes';
import { sanitizeInputs } from '../../calculator/sanitize';
import type { Inputs } from '../../calculator/types';
import { INPUT_TAG_ID } from '../../output/htmlReport';
import { areaKey, rainKey, SCALAR_FIELDS } from '../fields';
import type { Finding, FindingSource } from '../types';
import { numberTokens, parseGermanNumber } from './numbers';
import {
  AREA_LIST_KEYS,
  AREA_PROP_ALIASES,
  GAP_RE,
  KNOWN_DURATIONS,
  KNOWN_RETURN_PERIODS,
  LABEL_RULES,
  pickNumber,
  RAIN_KEYS,
  SCALAR_ALIASES,
} from './rules';

export type InputKind = 'tool-json' | 'tool-html' | 'json' | 'form' | 'text' | 'leer';

export interface RawLine {
  n: number;
  text: string;
  /** Feldschlüssel, die aus dieser Zeile gelesen wurden */
  hits: string[];
}

export interface ParseResult {
  kind: InputKind;
  findings: Finding[];
  lines: RawLine[];
  notes: string[];
}

/* ---------- Hilfen ---------- */

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');

const isNumericToken = (t: string) => /^[tTdD]?\d+$/.test(t);
const tokNum = (t: string) => Number(t.replace(/^[tTdD]/, ''));
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

class Collector {
  readonly findings: Finding[] = [];
  private seq = 0;
  private areaCursor: number | null = null;
  constructor(private readonly lines: RawLine[]) {}

  /** Nächster freier Zeilenindex für Flächen, die aus dem Katalog erkannt werden. */
  nextAreaIndex(): number {
    if (this.areaCursor === null) {
      const used = this.findings.map((f) => /^area\[(\d+)\]/.exec(f.field)).filter((m): m is RegExpExecArray => m !== null).map((m) => Number(m[1]));
      this.areaCursor = used.length ? Math.max(...used) + 1 : 0;
    }
    return this.areaCursor++;
  }

  add(field: string, value: string, source: FindingSource, line?: number, context?: string) {
    this.findings.push({ id: `${source}:${field}:${line ?? 0}:${this.seq++}`, field, value, source, line, context: context?.trim().slice(0, 200) });
    if (line !== undefined) this.lines[line - 1]?.hits.push(field);
  }
}

function boolish(v: unknown): string | null {
  if (typeof v === 'boolean') return v ? '1' : '0';
  const s = String(v).trim().toLowerCase();
  if (['1', 'true', 'ja', 'yes', 'on'].includes(s)) return '1';
  if (['0', 'false', 'nein', 'no', 'off', ''].includes(s)) return '0';
  return null;
}

/* ---------- 1. strukturiert ---------- */

type Classified =
  | { kind: 'scalar'; field: string }
  | { kind: 'area'; index: number; prop: string }
  | { kind: 'rain'; T: number; D: number };

function classify(tokens: string[]): Classified | null {
  for (let i = 0; i < tokens.length; i++) {
    const n = norm(tokens[i]);
    const rest = tokens.slice(i + 1);
    if (rest.length === 0 && SCALAR_ALIASES[n]) return { kind: 'scalar', field: SCALAR_ALIASES[n] };
    if (AREA_LIST_KEYS.has(n) && rest.length === 2 && /^\d+$/.test(rest[0])) {
      const prop = AREA_PROP_ALIASES[norm(rest[1])];
      if (prop) return { kind: 'area', index: Number(rest[0]), prop };
    }
    if (RAIN_KEYS.has(n) && rest.length === 2 && isNumericToken(rest[0]) && isNumericToken(rest[1])) {
      return { kind: 'rain', T: tokNum(rest[0]), D: tokNum(rest[1]) };
    }
  }
  return null;
}

function addStructured(col: Collector, tokens: string[], value: unknown, source: FindingSource, line?: number, context?: string): boolean {
  const c = classify(tokens);
  if (!c) return false;
  if (value === null || value === undefined || typeof value === 'object') return false;
  if (c.kind === 'scalar') {
    const def = SCALAR_FIELDS[c.field];
    if (!def) return false;
    if (def.kind === 'text') {
      const s = String(value).trim();
      if (s) col.add(c.field, s, source, line, context);
    } else {
      const n = parseGermanNumber(typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
      if (n === null) return false;
      col.add(c.field, String(n), source, line, context);
    }
    return true;
  }
  if (c.kind === 'rain') {
    const n = parseGermanNumber(String(value));
    if (n === null) return false;
    col.add(rainKey(c.T, c.D), String(n), source, line, context);
    return true;
  }
  const key = areaKey(c.index, c.prop as 'uid' | 'area' | 'name' | 'cs' | 'roof');
  if (c.prop === 'name') {
    const s = String(value).trim();
    if (s) col.add(key, s, source, line, context);
  } else if (c.prop === 'roof') {
    const b = boolish(value);
    if (b !== null) col.add(key, b, source, line, context);
  } else {
    const n = parseGermanNumber(String(value));
    if (n !== null) col.add(key, String(n), source, line, context);
  }
  return true;
}

function flatten(value: unknown, path: string[], out: Array<{ path: string[]; value: unknown }>, depth = 0) {
  if (depth > 8) return;
  if (Array.isArray(value)) value.forEach((v, i) => flatten(v, [...path, String(i)], out, depth + 1));
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) flatten(v, [...path, k], out, depth + 1);
  else out.push({ path, value });
}

const FORM_LINE_RE = /^\s*["']?[\w-]+(?:\[[^\]]*\])+["']?\s*[=:]/;

function safeDecode(x: string): string {
  try {
    return decodeURIComponent(x.replace(/\+/g, ' '));
  } catch {
    return x;
  }
}

const KEY_RE = /^[\w-]+(?:\[[^\]]*\])*$|^[\w.-]+$/;

function parseFormPairs(text: string, lines: RawLine[], col: Collector): Set<number> {
  const used = new Set<number>();
  const oneLine = !text.includes('\n') && text.includes('&');
  const chunks = oneLine ? text.split('&').map((c) => ({ c, n: 0 })) : lines.map((l) => ({ c: l.text, n: l.n }));
  for (const { c, n } of chunks) {
    const m = /^([^=:]+?)\s*[=:]\s*(.*)$/.exec(c.trim());
    if (!m) continue;
    const key = safeDecode(m[1]).replace(/^["']|["']$/g, '').trim();
    const value = safeDecode(m[2]).trim().replace(/,$/, '').replace(/^["']|["']$/g, '');
    if (!KEY_RE.test(key)) continue;
    const tokens = key.match(/[^[\].]+/g) ?? [];
    if (addStructured(col, tokens, value, 'Formularschlüssel', n || undefined, c)) if (n) used.add(n);
  }
  return used;
}

/* ---------- 2. Beschriftungen ---------- */

const TOKEN_RE = /[\p{L}\p{N}]+|[≥≤<>]/gu;
const SEP = '[^\\p{L}\\p{N}≥≤<>]*';
const tokensOf = (name: string) => name.match(TOKEN_RE) ?? [];
const toRegex = (tokens: string[]) => new RegExp(tokens.map(escapeRe).join(SEP), 'iu');

/**
 * Pro Flächenart mehrere Schreibweisen, die im Text vorkommen können:
 * der volle Name, der Name ohne Klammerzusatz am Ende (z. B. "(z. B. Dachpappe)") und der kürzeste eindeutige Anfang.
 * So werden auch Namen erkannt, die in einer PDF-Spalte abgeschnitten oder umgebrochen sind.
 */
const CATALOG = SURFACE_TYPES.map((st) => {
  const tokens = tokensOf(st.name);
  const variants: RegExp[] = [toRegex(tokens)];
  const noParen = st.name.replace(/\s*\([^)]*\)\s*$/, '');
  if (noParen !== st.name && noParen.trim()) variants.push(toRegex(tokensOf(noParen)));
  // kürzester eindeutiger Anfang, mindestens 12 Zeichen lang
  const others = SURFACE_TYPES.filter((o) => o.uid !== st.uid).map((o) => tokensOf(o.name).map((t) => t.toLowerCase()));
  let k = 1;
  while (k < tokens.length && others.some((o) => o.slice(0, k).join(' ') === tokens.slice(0, k).join(' ').toLowerCase())) k++;
  while (k < tokens.length && tokens.slice(0, k).join('').length < 12) k++;
  if (k < tokens.length) variants.push(toRegex(tokens.slice(0, k)));
  return { st, variants };
});

interface CatalogHit {
  uid: number;
  start: number;
  end: number;
}

function catalogHits(s: string): CatalogHit[] {
  const hits: CatalogHit[] = [];
  for (const { st, variants } of CATALOG) {
    let best: CatalogHit | null = null;
    for (const re of variants) {
      const m = re.exec(s);
      if (m && (!best || m[0].length > best.end - best.start)) best = { uid: st.uid, start: m.index, end: m.index + m[0].length };
    }
    if (best) hits.push(best);
  }
  // Treffer, die komplett in einem größeren Treffer liegen, verwerfen
  return hits.filter((h) => !hits.some((o) => o !== h && o.start <= h.start && o.end >= h.end && o.end - o.start > h.end - h.start)).sort((a, b) => a.start - b.start);
}

/** Fläche in der Zeile des Treffers: bevorzugt Zahl mit m², sonst die erste Zahl > 1 hinter dem Namen. */
function areaFromText(s: string, hit: CatalogHit): number | null {
  const toks = numberTokens(s).filter((t) => t.value > 0);
  const m2After = toks.find((t) => t.unit === 'm2' && t.index >= hit.end);
  if (m2After) return m2After.value;
  const m2Before = [...toks].reverse().find((t) => t.unit === 'm2' && t.index < hit.start);
  if (m2Before) return m2Before.value;
  const plain = toks.find((t) => t.unit === '' && t.index >= hit.end && t.value > 1);
  return plain ? plain.value : null;
}

const DIMS_RE = /(?:abmessung(?:en)?|ma(?:ß|ss)e)[^\d\n]{0,25}(\d[\d.,]*)\s*[×xX*]\s*(\d[\d.,]*)\s*[×xX*]\s*(\d[\d.,]*)\s*m\b/i;
/** KOSTRA-Raster als Zeile und Spalte: "Z206 S112" → rcIndex 206112 */
const ZS_RE = /\bZ\s*(\d{1,3})\s*[,;/]?\s*S\s*(\d{1,3})\b/;
const RAIN_R_RE = /\br\s*[([]\s*(\d{1,4})\s*[,;]\s*(\d{1,3})\s*[)\]]\s*[=:]?\s*(-?\d[\d.,]*)/gi;

interface RainTableState {
  orientation: 'T-cols' | 'D-cols';
  keys: number[];
  hN: boolean;
}

function detectRainHeader(line: string, prev: string): RainTableState | null {
  const hN = /\bhN\b|niederschlagsh[öo]he|\bmm\b/i.test(line + ' ' + prev) && !/l\s*\/\s*\(?s/i.test(line + ' ' + prev);
  const ts = [...line.matchAll(/(?:\bT\s*=?\s*|\bn\s*=\s*)(\d{1,3})\b|(\d{1,3})\s*(?:-?\s*j[äa]hr\w*|\ba\b)/gi)]
    .map((m) => Number(m[1] ?? m[2]))
    .filter((t) => KNOWN_RETURN_PERIODS.includes(t));
  const rts = [...line.matchAll(/\br\s*\(\s*D\s*,\s*(\d{1,3})\s*\)/gi)].map((m) => Number(m[1])).filter((t) => KNOWN_RETURN_PERIODS.includes(t));
  const ds = [...line.matchAll(/\bD\s*=?\s*(\d{1,4})\b|(\d{1,4})\s*min\b/gi)].map((m) => Number(m[1] ?? m[2])).filter((d) => KNOWN_DURATIONS.includes(d));
  if (ts.length >= 2 && ts.length >= ds.length) return { orientation: 'T-cols', keys: ts, hN };
  // Spaltenköpfe der Form r(D,2), r(D,30): erste Zahl der Zeile ist D, danach je eine Spalte pro T
  if (rts.length >= 1 && ds.length === 0) return { orientation: 'T-cols', keys: rts, hN };
  if (ds.length >= 2) return { orientation: 'D-cols', keys: ds, hN };
  return null;
}

function parseRainRow(line: string, st: RainTableState): { T: number; D: number; value: number }[] | null {
  const cleaned = line.replace(/\([^)]*\)/g, ' ');
  const lead = st.orientation === 'T-cols' ? /^\s*(?:D\s*=?\s*)?(\d{1,4})\s*(?:min\b)?/i.exec(cleaned) : /^\s*(?:T\s*=?\s*)?(\d{1,3})\s*(?:-?\s*j[äa]hr\w*|a\b)?/i.exec(cleaned);
  if (!lead) return null;
  const head = Number(lead[1]);
  if (!(st.orientation === 'T-cols' ? KNOWN_DURATIONS : KNOWN_RETURN_PERIODS).includes(head)) return null;
  const rest = cleaned.slice(lead[0].length);
  if (/[A-Za-zÄÖÜäöüß]{2,}/.test(rest.replace(/l\s*\/\s*\(?s(?:\s*·\s*ha\)?)?|min/gi, ''))) return null;
  const nums = numberTokens(rest)
    .filter((t) => t.unit === '' || t.unit === 'l/s')
    .map((t) => t.value);
  if (nums.length < st.keys.length) return null;
  return st.keys.map((k, i) => {
    const T = st.orientation === 'T-cols' ? k : head;
    const D = st.orientation === 'T-cols' ? head : k;
    const v = nums[i];
    return { T, D, value: st.hN ? rainIntensityFromDepth(v, D) : v };
  });
}

function parseLabels(lines: RawLine[], col: Collector, skip: Set<number>, notes: string[]) {
  let table = null as RainTableState | null;
  let tableRows = 0;
  let tableSkips = 0;
  let consumedNext = -1;

  for (let i = 0; i < lines.length; i++) {
    const { n, text } = lines[i];
    if (skip.has(n) || n === consumedNext) continue;
    if (!text.trim()) continue;

    // --- Regentabelle ---
    if (table) {
      const row = parseRainRow(text, table);
      if (row) {
        for (const r of row) col.add(rainKey(r.T, r.D), String(Math.round(r.value * 1000) / 1000), 'Beschriftung', n, text);
        tableRows++;
        continue;
      }
      // eine Zeile ohne Zahlen (z. B. Einheitenzeile) direkt unter der Kopfzeile ist erlaubt
      if (tableRows === 0 && tableSkips < 1) tableSkips++;
      else table = null;
    }
    const header: RainTableState | null = table ? null : detectRainHeader(text, lines[i - 1]?.text ?? '');
    if (header) {
      table = header;
      tableRows = 0;
      tableSkips = 0;
      if (header.hN) notes.push(`Zeile ${n}: Regentabelle in Niederschlagshöhe hN [mm] erkannt, in Regenspende r umgerechnet.`);
      continue;
    }

    // --- r(D,T) = Wert ---
    for (const m of text.matchAll(RAIN_R_RE)) {
      const D = Number(m[1]);
      const T = Number(m[2]);
      const v = parseGermanNumber(m[3].replace(/[.,]+$/, ''));
      if (KNOWN_DURATIONS.includes(D) && KNOWN_RETURN_PERIODS.includes(T) && v !== null) col.add(rainKey(T, D), String(v), 'Beschriftung', n, text);
    }

    // --- Sonderfälle: "L × B × H 8,00 × 2,40 × 0,84 m" und Rasterfeld "Z206 S112" ---
    const dims = DIMS_RE.exec(text);
    if (dims) {
      const [L, B, H] = [dims[1], dims[2], dims[3]].map(parseGermanNumber);
      if (L && B && H) {
        col.add('length', String(L), 'Beschriftung', n, text);
        col.add('width', String(B), 'Beschriftung', n, text);
        col.add('height', String(H), 'Beschriftung', n, text);
      }
    }
    const zs = ZS_RE.exec(text);
    if (zs) col.add('rcIndex', `${zs[1].padStart(3, '0')}${zs[2].padStart(3, '0')}`, 'Beschriftung', n, text);

    // --- Beschriftung: Wert ---
    for (const rule of LABEL_RULES) {
      const re = new RegExp(rule.label.source, rule.label.flags.includes('g') ? rule.label.flags : rule.label.flags + 'g');
      for (const m of text.matchAll(re)) {
        let rest = text.slice((m.index ?? 0) + m[0].length);
        const gap = GAP_RE.exec(rest)?.[0] ?? '';
        let after = rest.slice(gap.length);
        let lineNo = n;
        if (!after.trim()) {
          // Wert steht in der nächsten nichtleeren Zeile
          const next = lines.slice(i + 1, i + 3).find((l) => l.text.trim());
          if (next) {
            after = next.text.trim();
            lineNo = next.n;
          }
        }
        let value: string | null = null;
        if (rule.map) {
          value = rule.map(lineNo === n ? text : after);
          if (value === null && lineNo === n) value = rule.map(after);
        } else if (rule.digits) {
          const d = rule.digits.exec(after.trim());
          value = d ? d[0] : null;
        } else {
          const tok = pickNumber(numberTokens(after.trimStart()), rule);
          value = tok ? String(tok.value) : null;
        }
        if (value !== null) {
          col.add(rule.field, value, 'Beschriftung', n, lineNo === n ? text : `${text} / ${after}`);
          break;
        }
      }
    }

    // --- Flächenart aus dem Katalog ---
    let hits = catalogHits(text);
    let basis = text;
    if (hits.length === 0 && lines[i + 1]?.text.trim()) {
      const joined = `${text} ${lines[i + 1].text}`;
      const jh = catalogHits(joined).filter((h) => h.start < text.length && h.end > text.length);
      if (jh.length) {
        hits = jh;
        basis = joined;
        consumedNext = lines[i + 1].n;
      }
    }
    for (const h of hits) {
      const idx = col.nextAreaIndex();
      col.add(areaKey(idx, 'uid'), String(h.uid), 'Beschriftung', n, basis);
      let a = areaFromText(basis, h);
      // Spalte umgebrochen: die Zahl steht in der Zeile darunter (nur wenn dort keine andere Flächenart steht)
      const below = lines[i + 1];
      if (a === null && hits.length === 1 && below && below.n !== consumedNext && below.text.trim() && catalogHits(below.text).length === 0) {
        a = areaFromText(below.text, { uid: h.uid, start: 0, end: 0 });
      }
      if (a !== null) col.add(areaKey(idx, 'area'), String(a), 'Beschriftung', n, basis);
    }
  }
}

/* ---------- 3. eigene Dateien ---------- */

/** Eingaben dieses Prüfwerkzeugs → Fundstücke (damit die Prüfung auch eigene Dateien kennt). */
export function inputsToFindings(inp: Inputs): Finding[] {
  const col = new Collector([]);
  const S: FindingSource = 'Prüfwerkzeug';
  const add = (field: string, v: number | string | null | undefined) => {
    if (v !== null && v !== undefined && v !== '') col.add(field, String(v), S);
  };
  add('country', 1);
  add('newGuideline', 1);
  add('infiltrationType', inp.rigole.infiltrationType);
  add('rainFrequency', inp.rainFrequency);
  add('rcIndex', inp.rcIndex.trim());
  add('qVoll', inp.extras.qVoll);
  inp.areas.forEach((a, i) => {
    add(areaKey(i, 'uid'), a.surfaceUid);
    add(areaKey(i, 'area'), a.area);
    if (a.surfaceUid === 0) {
      add(areaKey(i, 'name'), a.manualName);
      add(areaKey(i, 'cs'), a.csCustom);
      add(areaKey(i, 'roof'), a.isRoofCustom ? 1 : 0);
    }
  });
  for (const [T, row] of Object.entries(inp.rain)) {
    for (const [D, v] of Object.entries(row)) {
      if (v === null || v === undefined) continue;
      add(rainKey(Number(T), Number(D)), inp.rainUnit === 'hN' ? rainIntensityFromDepth(v, Number(D)) : v);
    }
  }
  const r = inp.rigole;
  add('storageCoeff', r.storageCoeff);
  if (r.infiltrationType === 2) add('swaleVolume', r.swaleVolume);
  if (r.mode === 'blocks') {
    add('blocksLength', r.blocksLength);
    add('blocksWidth', r.blocksWidth);
    add('layers', r.layers);
    add('extraBloc', r.extraBloc ? 1 : 0);
    add('blocLength', r.blocLength);
    add('blocWidth', r.blocWidth);
    add('displayBlocHeight', r.displayBlocHeight);
    if (r.extraBloc) add('extraBlocHeight', r.extraBlocHeight);
  } else if (r.mode === 'dims') {
    add('length', r.length);
    add('width', r.width);
    add('height', r.height);
  } else {
    add('volume', r.volumeDirect);
  }
  return col.findings;
}

/* ---------- Einstieg ---------- */

export function splitLines(text: string): RawLine[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((t, i) => ({ n: i + 1, text: t, hits: [] }));
}

export function parseInput(text: string): ParseResult {
  const notes: string[] = [];
  const trimmed = text.trim();
  if (!trimmed) return { kind: 'leer', findings: [], lines: [], notes };
  const lines = splitLines(text);
  const col = new Collector(lines);

  // eigener HTML-Bericht
  if (trimmed.includes(`id="${INPUT_TAG_ID}"`)) {
    const m = trimmed.match(new RegExp(`<script type="application/json" id="${INPUT_TAG_ID}">([\\s\\S]*?)</script>`));
    try {
      const inp = m ? sanitizeInputs(JSON.parse(m[1])) : null;
      if (inp) return { kind: 'tool-html', findings: inputsToFindings(inp), lines, notes: ['Eingaben aus einem Bericht dieses Prüfwerkzeugs gelesen.'] };
    } catch {
      /* weiter mit Textanalyse */
    }
  }

  // JSON
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const json = JSON.parse(trimmed) as unknown;
      const inp = sanitizeInputs(json);
      if (inp) return { kind: 'tool-json', findings: inputsToFindings(inp), lines, notes: ['Eingaben-Datei dieses Prüfwerkzeugs erkannt.'] };
      const flat: Array<{ path: string[]; value: unknown }> = [];
      flatten(json, [], flat);
      let used = 0;
      for (const f of flat) if (addStructured(col, f.path, f.value, 'JSON', undefined, f.path.join('.'))) used++;
      if (used === 0) notes.push('JSON gelesen, aber keine bekannten Feldnamen gefunden (erwartet z. B. surfaceValue, rainFrequency, rcIndex).');
      return { kind: 'json', findings: col.findings, lines, notes };
    } catch {
      /* kein gültiges JSON → als Text weiter */
    }
  }

  // Formulardaten
  const plainKey = (l: string) => {
    const m = /^\s*["']?([\w.-]+)["']?\s*[=:]\s*\S/.exec(l);
    return m !== null && norm(m[1]) in SCALAR_ALIASES;
  };
  const looksLikeForm =
    lines.some((l) => FORM_LINE_RE.test(l.text) || plainKey(l.text)) || (!text.includes('\n') && /\w(?:\[|%5B)[^&]*\]?=/i.test(text));
  let skip = new Set<number>();
  let kind: InputKind = 'text';
  if (looksLikeForm) {
    skip = parseFormPairs(text, lines, col);
    if (col.findings.length) kind = 'form';
  }

  parseLabels(lines, col, skip, notes);
  if (col.findings.length === 0) notes.push('Nichts erkannt. Der Text enthält keine bekannten Beschriftungen oder Feldnamen. Werte lassen sich unten von Hand ergänzen.');
  return { kind, findings: col.findings, lines, notes };
}

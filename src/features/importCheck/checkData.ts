/*
 * Fundstücke zusammenführen: pro Feld gilt der Fund mit der höchsten Priorität.
 * manuell > Prüfwerkzeug > JSON / Formularschlüssel > Beschriftung > Katalog (abgeleitet)
 */
import { getSurfaceType } from '../../core/surfaceTypes';
import { areaKey, parseAreaKey, parseRainKey } from './fields';
import type { AreaFinding, CheckData, Finding, FindingSource } from './types';

export const SOURCE_RANK: Record<FindingSource, number> = {
  manuell: 6,
  Prüfwerkzeug: 5,
  JSON: 4,
  Formularschlüssel: 4,
  Beschriftung: 3,
  Katalog: 1,
};

export interface ResolvedField {
  field: string;
  value: string;
  chosen: Finding;
  alternatives: Finding[];
  /** andere Fundstellen mit abweichendem Wert */
  conflict: boolean;
}

const sameValue = (a: string, b: string) => {
  const x = Number(a);
  const y = Number(b);
  return Number.isFinite(x) && Number.isFinite(y) ? Math.abs(x - y) < 1e-9 : a.trim().toLowerCase() === b.trim().toLowerCase();
};

/** Zu jeder erkannten Flächenart die Katalogwerte (C_s, Dach) ergänzen. */
export function withCatalogFindings(findings: Finding[]): Finding[] {
  const out = [...findings];
  const byIndex = new Map<number, Finding[]>();
  for (const f of findings) {
    const a = parseAreaKey(f.field);
    if (a) byIndex.set(a.index, [...(byIndex.get(a.index) ?? []), f]);
  }
  for (const [index, fs] of byIndex) {
    const uidF = [...fs].filter((f) => parseAreaKey(f.field)?.prop === 'uid').sort((p, q) => SOURCE_RANK[q.source] - SOURCE_RANK[p.source])[0];
    if (!uidF) continue;
    const st = getSurfaceType(Number(uidF.value));
    if (!st) continue;
    const base = { source: 'Katalog' as const, context: `Katalog: UID ${st.uid} · ${st.categoryName} – ${st.name}` };
    out.push({ id: `Katalog:${index}:name`, field: areaKey(index, 'name'), value: `${st.categoryName} – ${st.name}`, ...base });
    out.push({ id: `Katalog:${index}:cs`, field: areaKey(index, 'cs'), value: String(st.cs), ...base });
    out.push({ id: `Katalog:${index}:roof`, field: areaKey(index, 'roof'), value: st.isRoof ? '1' : '0', ...base });
  }
  return out;
}

export function resolveFields(findings: Finding[]): Map<string, ResolvedField> {
  const groups = new Map<string, Finding[]>();
  for (const f of findings) groups.set(f.field, [...(groups.get(f.field) ?? []), f]);
  const out = new Map<string, ResolvedField>();
  for (const [field, fs] of groups) {
    const sorted = [...fs].sort((a, b) => SOURCE_RANK[b.source] - SOURCE_RANK[a.source] || (a.line ?? 0) - (b.line ?? 0));
    const [chosen, ...alternatives] = sorted;
    out.set(field, { field, value: chosen.value, chosen, alternatives, conflict: alternatives.some((a) => a.source !== 'Katalog' && !sameValue(a.value, chosen.value)) });
  }
  return out;
}

const num = (s: string | undefined) => (s === undefined || s === '' || !Number.isFinite(Number(s)) ? undefined : Number(s));

export function buildCheckData(findings: Finding[]): { data: CheckData; resolved: Map<string, ResolvedField>; all: Finding[] } {
  const all = withCatalogFindings(findings);
  const resolved = resolveFields(all);
  const data: CheckData = { scalars: {}, areas: [], rain: {} };
  const areaMap = new Map<number, AreaFinding>();
  for (const [field, r] of resolved) {
    const a = parseAreaKey(field);
    if (a) {
      const row = areaMap.get(a.index) ?? { index: a.index };
      if (a.prop === 'uid') row.uid = num(r.value);
      else if (a.prop === 'area') row.area = num(r.value);
      else if (a.prop === 'name') row.name = r.value;
      else if (a.prop === 'cs') row.cs = num(r.value);
      else if (a.prop === 'roof') row.isRoof = r.value === '1';
      areaMap.set(a.index, row);
      continue;
    }
    const rk = parseRainKey(field);
    if (rk) {
      const v = num(r.value);
      if (v !== undefined) (data.rain[rk.T] ??= {})[rk.D] = v;
      continue;
    }
    data.scalars[field] = r.value;
  }
  data.areas = [...areaMap.values()].sort((x, y) => x.index - y.index);
  return { data, resolved, all };
}

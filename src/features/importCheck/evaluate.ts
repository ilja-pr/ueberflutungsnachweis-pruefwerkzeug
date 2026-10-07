/*
 * Prüft für jede Gleichung (19–22), ob die Eingangsgrößen aus dem VSO-Import vorhanden sind.
 * Reine Logik: CheckData rein, Bericht raus. Welche Gleichung was braucht, steht in core/equations.ts.
 */
import { determineReturnPeriod } from '../../core/floodProof';
import { EQUATIONS, REQUIREMENTS, type RequirementId } from '../../core/equations';
import { getSurfaceType } from '../../core/surfaceTypes';
import { fmt } from '../../shared/lib/format';
import type { AreaFinding, CheckData, EquationReport, EquationVerdict, ReqState, RequirementStatus } from './types';
import { KNOWN_DURATIONS } from './extract/rules';

const SHORT_DURATIONS = [5, 10, 15];

const sc = (d: CheckData, key: string): number | undefined => {
  const v = d.scalars[key];
  return v === undefined || v === '' || !Number.isFinite(Number(v)) ? undefined : Number(v);
};

const rows = (d: CheckData): AreaFinding[] => d.areas.filter((a) => a.uid !== undefined || a.area !== undefined);
const rowName = (a: AreaFinding) => `Fläche ${a.index + 1}`;
const withArea = (d: CheckData) => rows(d).filter((a) => a.area !== undefined && a.area > 0);

interface Check {
  state: ReqState;
  detail: string;
}

type Checker = (d: CheckData) => Check;

const list = (items: string[], max = 6) => (items.length > max ? `${items.slice(0, max).join(', ')} … (+${items.length - max})` : items.join(', '));

function returnPeriod(d: CheckData): { T: number; known: boolean } {
  const f = sc(d, 'rainFrequency');
  return { T: determineReturnPeriod(f ?? null), known: f !== undefined };
}

function rainCheck(d: CheckData, T: number, durations: number[], hintNoFreq?: string): Check {
  const have = durations.filter((D) => d.rain[T]?.[D] !== undefined);
  const miss = durations.filter((D) => d.rain[T]?.[D] === undefined);
  const hint = hintNoFreq ? ` ${hintNoFreq}` : '';
  if (miss.length === 0) return { state: 'ok', detail: `T = ${T}: ${have.map((D) => `r(${D},${T}) = ${fmt(d.rain[T][D], 1)}`).join(' · ')}.${hint}` };
  if (have.length === 0) return { state: 'missing', detail: `Keine Werte für T = ${T} gefunden.${hint}` };
  return { state: 'partial', detail: `T = ${T}: vorhanden ${have.map((D) => `D = ${D}`).join(', ')}, es fehlt ${miss.map((D) => `r(${D},${T})`).join(', ')}.${hint}` };
}

const CHECKERS: Record<RequirementId, Checker> = {
  gating: (d) => {
    const country = sc(d, 'country');
    const guide = sc(d, 'newGuideline');
    const type = sc(d, 'infiltrationType');
    const blocked: string[] = [];
    const missing: string[] = [];
    const found: string[] = [];
    if (country === undefined) missing.push('Objektland');
    else if (country !== 1) blocked.push('Objektland ist nicht Deutschland');
    else found.push('Deutschland');
    if (guide === undefined) missing.push('Richtlinie');
    else if (guide !== 1) blocked.push('Richtlinie ist nicht DWA-A 138-1');
    else found.push('DWA-A 138-1');
    if (type === undefined) missing.push('Entwässerungsart');
    else if (type !== 1 && type !== 2) blocked.push(type === 3 ? 'Zisterne: kein Überflutungsnachweis über die Rigole' : `Entwässerungsart ${type} wird nicht unterstützt`);
    else found.push(type === 1 ? 'Rigole' : 'Mulden-Rigole');
    if (blocked.length) return { state: 'blocked', detail: `${blocked.join('; ')}. Für diesen Fall wird der Nachweis nicht gerechnet.` };
    if (missing.length === 3) return { state: 'missing', detail: 'Land, Richtlinie und Entwässerungsart wurden nicht gefunden.' };
    if (missing.length) return { state: 'partial', detail: `Gefunden: ${found.join(', ')}. Es fehlt: ${missing.join(', ')} (im Text nicht gefunden, unten bei „Wert ergänzen“ nachtragen).` };
    return { state: 'ok', detail: found.join(', ') + '.' };
  },

  areas: (d) => {
    const r = rows(d);
    if (r.length === 0) return { state: 'missing', detail: 'Keine Flächenzeile gefunden.' };
    const problems: string[] = [];
    for (const a of r) {
      if (a.area === undefined || a.area <= 0) problems.push(`${rowName(a)}: Fläche fehlt`);
      if (a.uid === undefined) problems.push(`${rowName(a)}: Flächenart fehlt`);
      else if (a.uid !== 0 && !getSurfaceType(a.uid)) problems.push(`${rowName(a)}: UID ${a.uid} ist nicht im Katalog`);
    }
    const sum = withArea(d).reduce((s, a) => s + (a.area ?? 0), 0);
    let detail = `${r.length} Zeile${r.length === 1 ? '' : 'n'}, Summe ${fmt(sum, 2)} m².`;
    const aGes = sc(d, 'aGes');
    if (aGes !== undefined) detail += Math.abs(aGes - sum) > 0.5 ? ` A_ges laut VSO ${fmt(aGes, 2)} m² weicht von der Summe ab.` : ` A_ges laut VSO stimmt (${fmt(aGes, 2)} m²).`;
    if (sum > 0 && sum <= 800) detail += ' Unter 800 m²: Nachweis nur freiwillig.';
    if (problems.length) return { state: 'partial', detail: `${detail} ${list(problems)}.` };
    return { state: 'ok', detail };
  },

  roofSplit: (d) => {
    const r = withArea(d);
    if (r.length === 0) return { state: 'missing', detail: 'Ohne Flächen keine Zuordnung.' };
    const miss = r.filter((a) => a.isRoof === undefined);
    const roof = r.filter((a) => a.isRoof === true).reduce((s, a) => s + (a.area ?? 0), 0);
    const out = r.filter((a) => a.isRoof === false).reduce((s, a) => s + (a.area ?? 0), 0);
    if (miss.length === r.length) return { state: 'missing', detail: 'Bei keiner Zeile ist bekannt, ob Dach oder außerhalb Gebäude.' };
    if (miss.length) return { state: 'partial', detail: `Es fehlt bei: ${list(miss.map(rowName))} (Manuell: Feld isRoofCustom nötig).` };
    return { state: 'ok', detail: `A_Dach = ${fmt(roof, 2)} m², A_FaG = ${fmt(out, 2)} m² (aus dem Flächenarten-Katalog).` };
  },

  cs: (d) => {
    const r = withArea(d);
    if (r.length === 0) return { state: 'missing', detail: 'Ohne Flächen kein C_s.' };
    const miss = r.filter((a) => a.cs === undefined);
    if (miss.length === r.length) return { state: 'missing', detail: 'Zu keiner Zeile ist C_s bekannt.' };
    if (miss.length) return { state: 'partial', detail: `C_s fehlt bei: ${list(miss.map(rowName))} (Manuell: Feld csCustom nötig).` };
    return { state: 'ok', detail: `C_s für alle ${r.length} Zeilen bekannt (${list([...new Set(r.map((a) => fmt(a.cs, 2)))])}).` };
  },

  cm: (d) => {
    const r = withArea(d);
    if (r.length === 0) return { state: 'missing', detail: 'Ohne Flächen kein C_m.' };
    const cms = r.map((a) => (a.uid ? getSurfaceType(a.uid)?.cm : undefined));
    const miss = r.filter((_, i) => cms[i] === undefined);
    if (miss.length === r.length) return { state: 'missing', detail: 'C_m ist nur über die Flächenart (Katalog) bekannt, und die fehlt.' };
    if (miss.length) return { state: 'partial', detail: `C_m fehlt bei: ${list(miss.map(rowName))} (Manuell hat kein C_m-Feld).` };
    const au = r.reduce((s, a, i) => s + (a.area ?? 0) * (cms[i] ?? 0), 0);
    return { state: 'ok', detail: `A_u = Σ A·C_m = ${fmt(au, 2)} m².` };
  },

  rainFrequency: (d) => {
    const f = sc(d, 'rainFrequency');
    const type = sc(d, 'infiltrationType');
    if (f !== undefined) return { state: 'ok', detail: `${fmt(f, 0)} Jahre → Nachweis mit T = ${determineReturnPeriod(f)}.` };
    if (type === 2) return { state: 'assumed', detail: 'Bei Mulden-Rigole nach DWA-A 138-1 wird sie nicht gesendet (VSO-489), dann gilt T = 30.' };
    return { state: 'missing', detail: 'Nicht gefunden. Ersatzweise würde T = 30 gerechnet, das kann falsch sein, wenn der Kunde mehr als 10 Jahre gewählt hat.' };
  },

  rcIndex: (d) => {
    const v = d.scalars.rcIndex;
    if (!v) return { state: 'missing', detail: 'Rasterfeld nicht gefunden. Ohne Rasterfeld gibt es keine Regendaten.' };
    return { state: 'ok', detail: `Rasterfeld ${v}.` };
  },

  rainT: (d) => {
    const { T, known } = returnPeriod(d);
    const hint = known ? undefined : 'Regenhäufigkeit unbekannt, deshalb T = 30 geprüft. Bei mehr als 10 Jahren wird T = 100 gebraucht.';
    return rainCheck(d, T, SHORT_DURATIONS, hint);
  },

  rain2: (d) => rainCheck(d, 2, SHORT_DURATIONS),

  durations: () => ({ state: 'assumed', detail: 'Feste Annahme: D = 5, 10, 15 min, der größte Wert gilt. Nach DWA-A 118 kann eine einzelne Dauer maßgebend sein (offener Punkt).' }),

  storage: (d) => {
    const type = sc(d, 'infiltrationType');
    const swaleMissing = type === 2 && sc(d, 'swaleVolume') === undefined;
    const swaleNote = swaleMissing ? ' Muldenvolumen fehlt (würde als 0 gerechnet).' : '';
    const vol = sc(d, 'volume');
    const s = sc(d, 'storageCoeff');
    const groups: Array<{ name: string; keys: string[] }> = [
      { name: 'Volumen direkt', keys: ['volume'] },
      { name: 'Länge · Breite · Höhe', keys: ['length', 'width', 'height', 'storageCoeff'] },
      {
        name: 'Blöcke',
        keys: ['blocksLength', 'blocksWidth', 'layers', 'blocLength', 'blocWidth', 'displayBlocHeight', 'storageCoeff', ...(sc(d, 'extraBloc') === 1 ? ['extraBlocHeight'] : [])],
      },
    ];
    for (const g of groups) {
      if (g.keys.every((k) => sc(d, k) !== undefined)) {
        const detail =
          g.name === 'Volumen direkt'
            ? `V_vorh = ${fmt(vol, 3)} m³ (direkt).`
            : g.name === 'Länge · Breite · Höhe'
              ? `V_vorh = ${fmt(sc(d, 'length')! * sc(d, 'width')! * sc(d, 'height')! * (s ?? 1), 3)} m³ aus L·B·H·s_R.`
              : 'Blockdaten vollständig, Volumen wird daraus berechnet.';
        return { state: swaleMissing ? 'partial' : 'ok', detail: detail + swaleNote };
      }
    }
    const best = groups.slice(1).map((g) => ({ g, have: g.keys.filter((k) => sc(d, k) !== undefined), miss: g.keys.filter((k) => sc(d, k) === undefined) })).sort((a, b) => b.have.length - a.have.length)[0];
    if (best.have.length > 0) return { state: 'partial', detail: `${best.g.name}: es fehlt ${best.miss.join(', ')}.${swaleNote}` };
    return { state: 'missing', detail: 'Weder Volumen noch Maße noch Blockdaten gefunden.' };
  },

  qVoll: (d) => {
    const v = sc(d, 'qVoll');
    return v !== undefined ? { state: 'ok', detail: `Q_voll = ${fmt(v, 2)} l/s.` } : { state: 'missing', detail: 'Nicht im VSO. Aus DIN 1986-100 Tabelle A.5 zur geplanten Grundleitung (Nennweite, Gefälle) oder aus der Einleitbeschränkung.' };
  },

  qDr: (d) => {
    const v = sc(d, 'qDr');
    return v !== undefined ? { state: 'ok', detail: `Q_Dr = ${fmt(v, 2)} l/s.` } : { state: 'missing', detail: 'Nicht gefunden. Vermutlich configuration[permittedDischarge], im Code prüfen, oder Einleitbeschränkung der Kommune.' };
  },

  fz: () => ({ state: 'assumed', detail: 'Fest 1,15 (einfaches Verfahren nach DWA-A 117).' }),

  durationsLong: (d) => {
    const { T } = returnPeriod(d);
    const have = KNOWN_DURATIONS.filter((D) => d.rain[T]?.[D] !== undefined);
    const longHave = have.filter((D) => D > 15);
    if (have.length === KNOWN_DURATIONS.length) return { state: 'ok', detail: `T = ${T}: alle ${KNOWN_DURATIONS.length} Dauerstufen von 5 bis 4320 min vorhanden.` };
    if (longHave.length === 0) return { state: 'missing', detail: `T = ${T}: nur D ≤ 15 min vorhanden. Gebraucht werden Dauerstufen bis 4320 min (KOSTRA-DWD-2020 für das Rasterfeld).` };
    const miss = KNOWN_DURATIONS.filter((D) => !have.includes(D));
    return { state: 'partial', detail: `T = ${T}: ${have.length} von ${KNOWN_DURATIONS.length} Dauerstufen, es fehlt ${list(miss.map(String), 8)} min.` };
  },
};

const SOURCE_LABEL = { VSO: 'VSO', 'VSO-Katalog': 'VSO-Katalog', extern: 'extern', Annahme: 'Annahme' } as const;

export function evaluate(data: CheckData): EquationReport[] {
  return EQUATIONS.map((eq) => {
    const requirements: RequirementStatus[] = eq.needs.map((id) => {
      const def = REQUIREMENTS[id];
      const res = CHECKERS[id](data);
      return { id, symbol: def.symbol, label: def.label, unit: def.unit, source: SOURCE_LABEL[def.source], where: def.where, state: res.state, detail: res.detail };
    });
    let verdict: EquationVerdict;
    if (eq.needs.length === 0) verdict = 'unbekannt';
    else if (requirements.some((r) => r.state === 'blocked')) verdict = 'nicht-anwendbar';
    else if (requirements.some((r) => r.state === 'missing' || r.state === 'partial')) verdict = 'unvollstaendig';
    else verdict = 'vollstaendig';
    return { id: eq.id, title: eq.title, formula: eq.formula, statusText: eq.statusText, when: eq.when, verdict, requirements };
  });
}

export const VERDICT_TEXT: Record<EquationVerdict, string> = {
  vollstaendig: 'alle Angaben da',
  unvollstaendig: 'es fehlt etwas',
  'nicht-anwendbar': 'hier nicht anwendbar',
  unbekannt: 'Formel unbekannt',
};

export const STATE_TEXT: Record<ReqState, string> = {
  ok: 'vorhanden',
  partial: 'teilweise',
  missing: 'fehlt',
  assumed: 'Annahme',
  blocked: 'passt nicht',
};

/** Fehlende Angaben als Text, zum Kopieren in eine Mail oder ein Ticket. */
export function missingReport(reports: EquationReport[], title = 'Überflutungsnachweis: fehlende Angaben'): string {
  const out: string[] = [title, ''];
  for (const r of reports) {
    const bad = r.requirements.filter((q) => q.state === 'missing' || q.state === 'partial' || q.state === 'blocked');
    out.push(`${r.title}: ${VERDICT_TEXT[r.verdict]}`);
    if (r.verdict === 'unbekannt') out.push(`  Formel noch nicht hinterlegt.`);
    for (const q of bad) out.push(`  - ${q.symbol} ${q.label}: ${q.detail}  [Quelle: ${q.where}]`);
    out.push('');
  }
  return out.join('\n').trimEnd();
}

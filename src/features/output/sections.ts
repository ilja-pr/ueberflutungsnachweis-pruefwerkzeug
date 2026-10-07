/*
 * Ausgabe-Bausteine. Jeder Baustein kann einzeln als HTML, als Text oder (wenn er eine Tabelle hat)
 * als CSV/TSV ausgegeben werden. Der komplette Bericht ist nur die Summe der gewählten Bausteine.
 */
import { buildSteps } from '../calculator/explain';
import type { Computed, Inputs } from '../calculator/types';
import { CATEGORY_NAMES } from '../../core/surfaceTypes';
import { escapeHtml as e, fmt } from '../../shared/lib/format';

export type SectionId = 'ergebnis' | 'eckdaten' | 'flaechen' | 'regendaten' | 'dauer' | 'vergleich' | 'gl21' | 'rechenweg' | 'abgleich' | 'hinweise' | 'annahmen';

export interface OutputSection {
  id: SectionId;
  title: string;
  /** Kurzbeschreibung für die Auswahlliste */
  hint: string;
  html: string;
  text: string;
  /** Tabelle für CSV/TSV (erste Zeile = Kopf) */
  table?: string[][];
}

export const SECTION_ORDER: SectionId[] = ['ergebnis', 'eckdaten', 'flaechen', 'regendaten', 'dauer', 'vergleich', 'gl21', 'rechenweg', 'abgleich', 'hinweise', 'annahmen'];

function htmlTable(table: string[][], rightFrom = 1, hlRow = -1): string {
  const [head, ...rows] = table;
  const th = head.map((h, i) => `<th class="${i >= rightFrom ? 'r' : ''}">${e(h)}</th>`).join('');
  const body = rows
    .map((r, ri) => `<tr class="${ri === hlRow ? 'hl' : ''}">${r.map((c, i) => `<td class="${i >= rightFrom ? 'r' : ''}">${e(c)}</td>`).join('')}</tr>`)
    .join('');
  return `<table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table>`;
}

const textTable = (table: string[][]) => table.map((r) => r.join('\t')).join('\n');

export function buildSections(inp: Inputs, c: Computed): OutputSection[] {
  const r = c.result;
  const out: OutputSection[] = [];

  const hinweise = c.warnings.length
    ? { html: c.warnings.map((w) => `<div class="warn">${e(w)}</div>`).join(''), text: c.warnings.map((w) => `- ${w}`).join('\n') }
    : null;

  if (!r || !c.volume) {
    const msg = c.errors.length ? c.errors : ['Keine Berechnung möglich.'];
    out.push({
      id: 'ergebnis',
      title: 'Ergebnis',
      hint: 'erfüllt oder nicht erfüllt, drei Zahlen',
      html: `<div class="box bad"><h3>Keine Berechnung möglich</h3><ul>${msg.map((x) => `<li>${e(x)}</li>`).join('')}</ul></div>`,
      text: `Keine Berechnung möglich:\n${msg.map((x) => `- ${x}`).join('\n')}`,
    });
    return out;
  }

  // Ergebnis
  const pct = r.utilization === null ? 0 : Math.min(100, r.utilization * 100);
  const headline = r.passed ? 'Nachweis erfüllt' : 'Nachweis nicht erfüllt';
  const sentence = r.passed
    ? `Die Anlage fasst ${fmt(r.storageVolume, 2)} m³ und braucht ${fmt(r.vRueckMax, 2)} m³. Reserve ${fmt(r.reserve, 2)} m³.`
    : `Die Anlage fasst ${fmt(r.storageVolume, 2)} m³, gebraucht werden ${fmt(r.vRueckMax, 2)} m³. Es fehlen ${fmt(-r.reserve, 2)} m³: Anlage vergrößern.`;
  const util = r.utilization === null ? '–' : `${fmt(r.utilization * 100, 0)} %`;
  out.push({
    id: 'ergebnis',
    title: 'Ergebnis',
    hint: 'erfüllt oder nicht erfüllt, drei Zahlen',
    html: `<div class="box ${r.passed ? 'ok' : 'bad'}"><h3>${r.passed ? '✔' : '✘'} ${headline}</h3><div>${e(sentence)}</div>
<div class="nums"><div class="num"><span>erforderlich V_Rück,max</span><b>${fmt(r.vRueckMax, 2)} m³</b></div><div class="num"><span>vorhanden V_vorh</span><b>${fmt(r.storageVolume, 2)} m³</b></div><div class="num"><span>Auslastung</span><b>${util}</b></div></div>
<div class="bar"><i style="width:${pct}%;background:${r.passed ? 'var(--ok)' : 'var(--bad)'}"></i></div></div>`,
    text: `${headline}\n${sentence}\nerforderlich: ${fmt(r.vRueckMax, 2)} m³ (D = ${r.durationMax} min)\nvorhanden: ${fmt(r.storageVolume, 2)} m³\nAuslastung: ${util}`,
    table: [['Größe', 'Wert'], ['Ergebnis', headline], ['V_Rück,max [m³]', fmt(r.vRueckMax, 3)], ['maßgebende Dauer [min]', String(r.durationMax)], ['V_vorh [m³]', fmt(r.storageVolume, 3)], ['Auslastung', util]],
  });

  // Eckdaten
  const eck = [
    ['Größe', 'Wert'],
    ['Nachweis-Regen', `${r.returnPeriod}-jährlich (${r.returnPeriodReason})`],
    ['Gewählte Regenhäufigkeit', inp.rainFrequency === null ? 'keine (Mulden-Rigole)' : `${inp.rainFrequency} Jahre`],
    ...(inp.rcIndex ? [['Rasterfeld (rcIndex)', inp.rcIndex]] : []),
    ['Befestigte Fläche A_ges', `${fmt(r.aGes, 0)} m²${r.aGesIsOverride ? ' (manuell überschrieben)' : ''}`],
    ['Pflicht', r.mandatory ? 'ja, A_ges > 800 m²' : 'nein, freiwillig (A_ges ≤ 800 m²)'],
    ['Regendauern', `${inp.durations.join(', ')} min`],
    ['Maßgebend', `${fmt(r.vRueckMax, 3)} m³ bei D = ${r.durationMax} min`],
  ];
  out.push({ id: 'eckdaten', title: 'Eckdaten', hint: 'Nachweis-Regen, A_ges, Pflicht, Regendauern', html: htmlTable(eck, 99), text: textTable(eck), table: eck });

  // Flächen
  const fl = [
    ['Bezeichnung', 'Art', 'A [m²]', 'C_s', 'A·C_s [m²]'],
    ...r.areas.map((a) => [a.name, a.group === 'Dach' ? 'Dach' : 'außerhalb Gebäude', fmt(a.area, 0), fmt(a.cs, 2), fmt(a.areaCs, 2)]),
    ['Summe', '', fmt(r.aDach + r.aFaG, 0), '', fmt(r.aDachCs + r.aFaGCs, 2)],
  ];
  out.push({ id: 'flaechen', title: 'Flächen', hint: 'A, C_s und A·C_s je Zeile, Dach / außerhalb', html: htmlTable(fl, 2), text: textTable(fl), table: fl });

  // Regendaten
  const rd = [
    ['Jährlichkeit', ...inp.durations.map((d) => `D = ${d} min`)],
    ...[2, 30, 100].map((T) => [`T = ${T}${T === r.returnPeriod ? ' (Nachweis)' : T === 2 ? ' (Abzug)' : ''}`, ...inp.durations.map((d) => fmt(c.rainTable[T]?.[d], 2))]),
  ];
  out.push({ id: 'regendaten', title: 'Regendaten', hint: 'Regenspenden r(D,T) in l/(s·ha)', html: htmlTable(rd), text: textTable(rd), table: rd });

  // Tabelle je Dauer
  const dau = [
    ['D [min]', 'r(D,2)', `r(D,${r.returnPeriod})`, 'Zufluss [m³]', 'Ableitung [m³]', 'V_Rück [m³]'],
    ...r.rows.map((x) => [String(x.duration), fmt(x.r2, 2), fmt(x.rT, 2), fmt(x.vInflow, 3), fmt(x.vDrain, 3), fmt(x.vRueck, 3)]),
  ];
  const dMaxIdx = r.rows.findIndex((x) => x.duration === r.durationMax);
  out.push({ id: 'dauer', title: 'Rückhaltevolumen je Regendauer', hint: 'Zufluss, Ableitung, V_Rück, maßgebende Zeile', html: htmlTable(dau, 0, dMaxIdx), text: textTable(dau), table: dau });

  // Vergleich
  const ver = [
    ['T', 'V_Rück,max [m³]', 'maßgebende D', 'Auslastung', 'Ergebnis'],
    ...([30, 100] as const).map((T) => {
      const a = c.alt[T];
      return a
        ? [`${T} Jahre`, fmt(a.vRueckMax, 3), `${a.durationMax} min`, a.utilization === null ? '–' : `${fmt(a.utilization * 100, 0)} %`, a.passed ? 'erfüllt' : 'nicht erfüllt']
        : [`${T} Jahre`, '–', '–', '–', 'keine Daten'];
    }),
  ];
  out.push({ id: 'vergleich', title: 'Vergleich T = 30 und T = 100', hint: 'dieselben Eingaben mit beiden Regen', html: htmlTable(ver), text: textTable(ver), table: ver });

  // Gl. 21
  if (c.gl21) {
    const g = c.gl21;
    const governing = Math.max(r.vRueckMax, g.vRueckMax);
    const g21 = [
      ['D [min]', `r(D,${g.returnPeriod})`, 'V_Rück Gl. 21 [m³]'],
      ...g.rows.map((x) => [String(x.duration), fmt(x.rT, 2), fmt(x.vRueck, 3)]),
      ['Gl. 21 max', '', fmt(g.vRueckMax, 3)],
      ['Gl. 20 max', '', fmt(r.vRueckMax, 3)],
      ['maßgebend (größerer Wert)', '', `${fmt(governing, 3)} → ${r.storageVolume >= governing ? 'erfüllt' : 'nicht erfüllt'}`],
    ];
    out.push({ id: 'gl21', title: 'Gleichung 21 (mit Q_voll)', hint: `Q_voll = ${fmt(g.qVoll, 2)} l/s, größerer Wert aus Gl. 20 und 21`, html: htmlTable(g21), text: textTable(g21), table: g21 });
  }

  // Rechenweg
  const steps = buildSteps(inp, c);
  out.push({
    id: 'rechenweg',
    title: 'Rechenweg mit eingesetzten Zahlen',
    hint: 'jede Zeile zum Nachrechnen in der Excel',
    html: steps.map((s) => `<div class="step"><h4>${e(s.title)}</h4><pre>${e(s.lines.join('\n'))}</pre></div>`).join(''),
    text: steps.map((s) => `${s.title}\n${s.lines.join('\n')}`).join('\n\n'),
  });

  // Abgleich mit Excel
  const x = inp.excel;
  if (x.vRueckMax !== null || x.vVorh !== null) {
    const ab: string[][] = [['Größe', 'Excel', 'Prüfwerkzeug', 'Differenz', 'Bewertung']];
    if (x.vRueckMax !== null) ab.push(['V_Rück,max [m³]', fmt(x.vRueckMax, 3), fmt(r.vRueckMax, 3), fmt(r.vRueckMax - x.vRueckMax, 3), Math.abs(r.vRueckMax - x.vRueckMax) <= 0.01 ? 'passt (±0,01)' : 'ABWEICHUNG']);
    if (x.vVorh !== null) ab.push(['V_vorh [m³]', fmt(x.vVorh, 3), fmt(r.storageVolume, 3), fmt(r.storageVolume - x.vVorh, 3), Math.abs(r.storageVolume - x.vVorh) <= 0.01 ? 'passt (±0,01)' : 'ABWEICHUNG']);
    out.push({ id: 'abgleich', title: 'Abgleich mit der Excel', hint: 'Differenz zu den eingetragenen Excel-Werten', html: htmlTable(ab), text: textTable(ab), table: ab });
  }

  if (hinweise) out.push({ id: 'hinweise', title: 'Hinweise', hint: 'Warnungen zu dieser Rechnung', ...hinweise });

  const annahmen = [
    'Rückhaltung ausschließlich in der Anlage, keine Rückstau- oder Überflutungsflächen auf dem Grundstück.',
    'Versickerung während des Regenereignisses wird nicht abgezogen (auf der sicheren Seite).',
    'Die 100-jährige Variante bei Regenhäufigkeit über 10 Jahre ist eine Firmenregel, keine Vorgabe der DIN.',
    'Nicht enthalten: Gleichung 22, die 100-jährige Zusatzprüfung bei über 70 % Dachanteil, Überflutungsflächen.',
    'Regenwerte und Produktdaten stammen aus den Eingaben. Beispielwerte sind keine echten KOSTRA-Daten.',
  ];
  out.push({
    id: 'annahmen',
    title: 'Annahmen und Grenzen',
    hint: 'was nicht berücksichtigt ist',
    html: `<ul>${annahmen.map((a) => `<li>${e(a)}</li>`).join('')}</ul><p class="small">Kategorien: ${Object.entries(CATEGORY_NAMES).map(([k, v]) => `${k} ${e(v)}`).join(' · ')}</p>`,
    text: annahmen.map((a) => `- ${a}`).join('\n'),
  });

  return out;
}

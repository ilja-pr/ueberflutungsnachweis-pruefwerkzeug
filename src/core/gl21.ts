/*
 * DIN 1986-100, Gleichung 21: Überflutungsnachweis mit dem Abfluss der Grundleitung bei Vollfüllung.
 *
 *   V_Rück(D) = [ r(D,T) · A_ges / 10 000 − Q_voll ] · D · 60 / 1000      [m³]
 *
 * r in l/(s·ha) · A_ges in m² · Q_voll in l/s · D in min · negative Werte = 0.
 * Quelle: Merkblätter Stadt Bielefeld und Stadt Gütersloh. Die DIN nennt hier T = 30 Jahre.
 * Im VSO gilt die Projektregel (Regenhäufigkeit > 10 Jahre → T = 100), sie wird hier mit übernommen.
 *
 * Nach den Merkblättern sind ohne Einleitbeschränkung Gl. 20 UND Gl. 21 zu rechnen, der größere
 * Wert ist maßgebend. Das Projekt rechnet im Standard nur Gl. 20, weil Q_voll im VSO nicht vorliegt.
 */
import type { RainTable } from './floodProof';

export interface Gl21Row {
  duration: number;
  rT: number;
  vRueckRaw: number;
  vRueck: number;
}

export interface Gl21Result {
  returnPeriod: number;
  qVoll: number;
  rows: Gl21Row[];
  vRueckMax: number;
  durationMax: number | null;
}

export function calculateGl21(
  rain: RainTable,
  aGes: number,
  qVoll: number,
  returnPeriod: number,
  durations: number[],
): Gl21Result {
  if (qVoll < 0) throw new Error('Q_voll darf nicht negativ sein');
  const rows: Gl21Row[] = [];
  let vMax = 0;
  let dMax: number | null = null;
  for (const d of durations) {
    const rT = rain[returnPeriod]?.[d];
    if (rT === undefined || Number.isNaN(rT)) throw new Error(`Regendaten fehlen für T=${returnPeriod} bei D=${d} min`);
    const raw = ((rT * aGes) / 10000 - qVoll) * d * 60 / 1000;
    const v = Math.max(0, raw);
    rows.push({ duration: d, rT, vRueckRaw: raw, vRueck: v });
    if (dMax === null || v > vMax) {
      vMax = v;
      dMax = d;
    }
  }
  return { returnPeriod, qVoll, rows, vRueckMax: vMax, durationMax: dMax };
}

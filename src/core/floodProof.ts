/*
 * Überflutungsnachweis nach DIN 1986-100 (Gleichung 20) – Rückhaltung ausschließlich in der Anlage.
 *
 * 1:1-Port von FloodProofCalculator.php (Referenzimplementierung für TYPO3).
 * Reine Funktionen, keine Abhängigkeiten. Gleiche Namen, gleiche Ergebnisse.
 */

/** Ab dieser befestigten Fläche ist der Nachweis Pflicht (m²). */
export const MANDATORY_AREA_THRESHOLD = 800;
/** Gewählte Regenhäufigkeit > diesem Wert → Nachweis mit 100-jährlichem Regen, sonst 30-jährlich. */
export const RAIN_FREQUENCY_SWITCH = 10;
/** Bemessungsregen der Entwässerung im Abzugsterm (immer 2-jährlich). */
export const DRAIN_RETURN_PERIOD = 2;
export const DEFAULT_DURATIONS = [5, 10, 15];

/** Regenspenden r(D,T) in l/(s·ha): rain[T][D] */
export type RainTable = Record<number, Record<number, number>>;

export interface AreaInput {
  name: string;
  area: number; // m²
  cs: number; // 0..1
  isRoof: boolean;
}

export interface AreaResultRow {
  name: string;
  group: 'Dach' | 'FaG';
  area: number;
  cs: number;
  areaCs: number;
}

export interface DurationRow {
  duration: number;
  rT: number;
  r2: number;
  vInflow: number; // Zufluss [m³]
  vDrain: number; // Ableitung [m³]
  vRueckRaw: number; // vor "negativ = 0"
  vRueck: number;
}

export interface FloodProofResult {
  returnPeriod: number;
  returnPeriodReason: string;
  areas: AreaResultRow[];
  aDach: number;
  aFaG: number;
  aGes: number;
  aGesSum: number;
  aGesIsOverride: boolean;
  aDachCs: number;
  aFaGCs: number;
  mandatory: boolean;
  rows: DurationRow[];
  vRueckMax: number;
  durationMax: number | null;
  storageVolume: number;
  utilization: number | null;
  reserve: number;
  passed: boolean;
}

/** rainFrequency > 10 → 100, sonst 30. null (z. B. Mulden-Rigole 138-1, VSO-489) → 30. */
export function determineReturnPeriod(rainFrequency: number | null): number {
  return rainFrequency !== null && rainFrequency > RAIN_FREQUENCY_SWITCH ? 100 : 30;
}

/** r [l/(s·ha)] aus Niederschlagshöhe hN [mm] und Dauer D [min]. */
export function rainIntensityFromDepth(depthMm: number, durationMin: number): number {
  return (depthMm * 10000) / (durationMin * 60);
}

/** V_vorh [m³] = L · B · H · s_R + V_M */
export function storageVolume(length: number, width: number, height: number, storageCoeff: number, swaleVolume = 0): number {
  return length * width * height * storageCoeff + swaleVolume;
}

export interface Geometry {
  length: number;
  width: number;
  height: number;
  installHeight: number;
}

/** Rigole aus Blockanzahlen und Produktdaten (gleiche Größen wie im Articletool). */
export function geometryFromBlocks(
  blocksLength: number,
  blocksWidth: number,
  layers: number,
  extraBloc: boolean,
  blocLength: number,
  blocWidth: number,
  displayBlocHeight: number,
  extraBlocHeight = 0,
  basePlateHeight = 0,
): Geometry {
  const height = layers * displayBlocHeight + (extraBloc ? extraBlocHeight : 0);
  return {
    length: blocksLength * blocLength,
    width: blocksWidth * blocWidth,
    height,
    installHeight: height + basePlateHeight,
  };
}

export interface Enlargement {
  additionalRows: number;
  newLength: number;
  fitsAvailableLength: boolean;
}

/** Vorschlag bei "nicht erfüllt": zusätzliche Blockreihen in Länge. null = bereits erfüllt. */
export function enlargementSuggestion(
  missingVolume: number,
  rigoleLength: number,
  rigoleWidth: number,
  rigoleHeight: number,
  storageCoeff: number,
  blocLength: number,
  availableLength: number | null = null,
): Enlargement | null {
  if (missingVolume <= 0) return null;
  const volumePerRow = blocLength * rigoleWidth * rigoleHeight * storageCoeff;
  if (volumePerRow <= 0) throw new Error('Volumen je Blockreihe ist 0');
  const rows = Math.ceil(missingVolume / volumePerRow - 1e-12);
  const newLength = rigoleLength + rows * blocLength;
  return {
    additionalRows: rows,
    newLength,
    fitsAvailableLength: availableLength === null || newLength <= availableLength + 1e-9,
  };
}

/** Hauptberechnung (DIN 1986-100, Gl. 20). */
export function calculate(
  areas: AreaInput[],
  rain: RainTable,
  rainFrequency: number | null,
  storageVol: number,
  totalAreaOverride: number | null = null,
  durations: number[] = DEFAULT_DURATIONS,
  returnPeriodOverride: number | null = null,
): FloodProofResult {
  const returnPeriod = returnPeriodOverride ?? determineReturnPeriod(rainFrequency);

  let aDach = 0;
  let aFaG = 0;
  let aDachCs = 0;
  let aFaGCs = 0;
  const areaRows: AreaResultRow[] = [];

  for (const row of areas) {
    const a = Math.max(0, row.area);
    if (row.cs < 0 || row.cs > 1) throw new Error(`C_s außerhalb 0..1 bei "${row.name}"`);
    if (row.isRoof) {
      aDach += a;
      aDachCs += a * row.cs;
    } else {
      aFaG += a;
      aFaGCs += a * row.cs;
    }
    areaRows.push({ name: row.name, group: row.isRoof ? 'Dach' : 'FaG', area: a, cs: row.cs, areaCs: a * row.cs });
  }

  const aGesSum = aDach + aFaG;
  const aGes = totalAreaOverride !== null && totalAreaOverride > 0 ? totalAreaOverride : aGesSum;

  const rows: DurationRow[] = [];
  let vMax = 0;
  let dMax: number | null = null;

  for (const d of durations) {
    const rT = rain[returnPeriod]?.[d];
    const r2 = rain[DRAIN_RETURN_PERIOD]?.[d];
    if (rT === undefined || r2 === undefined || Number.isNaN(rT) || Number.isNaN(r2)) {
      throw new Error(`Regendaten fehlen für T=${returnPeriod} bzw. T=2 bei D=${d} min`);
    }
    const inflow = rT * aGes;
    const drain = r2 * aDachCs + r2 * aFaGCs;
    const raw = ((inflow - drain) * d * 60) / (10000 * 1000);
    const v = Math.max(0, raw);
    rows.push({
      duration: d,
      rT,
      r2,
      vInflow: (inflow * d * 60) / 1e7,
      vDrain: (drain * d * 60) / 1e7,
      vRueckRaw: raw,
      vRueck: v,
    });
    if (dMax === null || v > vMax) {
      vMax = v;
      dMax = d;
    }
  }

  const reasonBase =
    returnPeriodOverride !== null
      ? `Jährlichkeit manuell auf ${returnPeriodOverride} Jahre gesetzt (Vergleichsrechnung)`
      : rainFrequency === null
        ? 'keine Regenhäufigkeit gewählt (Mulden-Rigole DWA-A 138-1) – Standard 30 Jahre'
        : rainFrequency > RAIN_FREQUENCY_SWITCH
          ? `gewählte Regenhäufigkeit ${rainFrequency} Jahre > ${RAIN_FREQUENCY_SWITCH} Jahre`
          : `gewählte Regenhäufigkeit ${rainFrequency} Jahre ≤ ${RAIN_FREQUENCY_SWITCH} Jahre`;

  return {
    returnPeriod,
    returnPeriodReason: reasonBase,
    areas: areaRows,
    aDach,
    aFaG,
    aGes,
    aGesSum,
    aGesIsOverride: aGes !== aGesSum,
    aDachCs,
    aFaGCs,
    mandatory: aGes > MANDATORY_AREA_THRESHOLD,
    rows,
    vRueckMax: vMax,
    durationMax: dMax,
    storageVolume: storageVol,
    utilization: storageVol > 0 ? vMax / storageVol : null,
    reserve: storageVol - vMax,
    passed: storageVol >= vMax,
  };
}

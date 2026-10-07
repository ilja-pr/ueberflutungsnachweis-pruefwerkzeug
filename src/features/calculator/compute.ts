import {
  calculate,
  DEFAULT_DURATIONS,
  enlargementSuggestion,
  geometryFromBlocks,
  rainIntensityFromDepth,
  storageVolume,
  type AreaInput,
  type FloodProofResult,
  type RainTable,
} from '../../core/floodProof';
import { calculateGl21, type Gl21Result } from '../../core/gl21';
import { getSurfaceType, RAMP_UID } from '../../core/surfaceTypes';
import { fmt } from '../../shared/lib/format';
import type { Computed, Inputs, VolumeInfo } from './types';

const num = (v: number | null | undefined, fallback = 0) => (v === null || v === undefined ? fallback : v);

/** Regentabelle in l/(s·ha). Rechnet hN [mm] bei Bedarf um. */
export function toRainTable(inp: Inputs): { table: RainTable; missing: string[] } {
  const table: RainTable = {};
  const missing: string[] = [];
  for (const T of [2, 30, 100]) {
    table[T] = {};
    for (const d of inp.durations) {
      const raw = inp.rain[String(T)]?.[String(d)];
      if (raw === null || raw === undefined) {
        missing.push(`T=${T}, D=${d} min`);
        continue;
      }
      table[T][d] = inp.rainUnit === 'hN' ? rainIntensityFromDepth(raw, d) : raw;
    }
  }
  return { table, missing };
}

function collectAreas(inp: Inputs, errors: string[]): { areas: AreaInput[]; rampUsed: boolean } {
  const areas: AreaInput[] = [];
  let rampUsed = false;
  for (const [i, row] of inp.areas.entries()) {
    if (!row.area || row.area <= 0) continue;
    if (row.surfaceUid === 0) {
      if (row.csCustom === null) {
        errors.push(`Fläche ${i + 1} (Manuell): C_s fehlt.`);
        continue;
      }
      areas.push({ name: row.manualName || 'Manuelle Fläche', area: row.area, cs: row.csCustom, isRoof: row.isRoofCustom });
      continue;
    }
    const st = getSurfaceType(row.surfaceUid);
    if (!st) {
      errors.push(`Fläche ${i + 1}: unbekannte Flächenart.`);
      continue;
    }
    if (inp.excludeCat7 && st.category === 7) continue;
    if (st.uid === RAMP_UID) rampUsed = true;
    areas.push({ name: `${st.categoryName} – ${st.name}`, area: row.area, cs: st.cs, isRoof: st.isRoof });
  }
  if (areas.length === 0) errors.push('Keine Fläche mit Größe > 0 eingetragen.');
  return { areas, rampUsed };
}

function collectVolume(inp: Inputs, errors: string[]): VolumeInfo | null {
  const r = inp.rigole;
  const s = num(r.storageCoeff, NaN);
  const vM = r.infiltrationType === 2 ? num(r.swaleVolume) : 0;

  if (r.mode === 'volume') {
    if (r.volumeDirect === null) {
      errors.push('Vorhandenes Volumen V_vorh fehlt.');
      return null;
    }
    const total = r.volumeDirect + vM;
    const extra = vM ? ` + V_M ${fmt(vM, 3)} m³ = ${fmt(total, 3)} m³` : '';
    return { volume: total, lines: [`V_vorh = ${fmt(r.volumeDirect, 3)} m³ (direkt eingegeben)${extra}`] };
  }

  const lines: string[] = [];
  let L: number | null = null;
  let B: number | null = null;
  let H: number | null = null;

  if (r.mode === 'blocks') {
    const need = [r.blocksLength, r.blocksWidth, r.layers, r.blocLength, r.blocWidth, r.displayBlocHeight];
    if (need.some((v) => v === null) || (r.extraBloc && r.extraBlocHeight === null)) {
      errors.push('Blockdaten unvollständig.');
    } else {
      const g = geometryFromBlocks(r.blocksLength!, r.blocksWidth!, r.layers!, r.extraBloc, r.blocLength!, r.blocWidth!, r.displayBlocHeight!, num(r.extraBlocHeight));
      L = g.length;
      B = g.width;
      H = g.height;
      lines.push(`L_R = ${r.blocksLength} Blöcke · ${fmt(r.blocLength!, 2)} m = ${fmt(L, 2)} m`);
      lines.push(`B_R = ${r.blocksWidth} Blöcke · ${fmt(r.blocWidth!, 2)} m = ${fmt(B, 2)} m`);
      const half = r.extraBloc ? ` + 1 · ${fmt(num(r.extraBlocHeight), 2)} m (zusätzliche halbe Lage)` : '';
      lines.push(`H_R = ${r.layers} Lagen · ${fmt(r.displayBlocHeight!, 2)} m${half} = ${fmt(H, 2)} m`);
    }
  } else if (r.length === null || r.width === null || r.height === null) {
    errors.push('Länge, Breite und Höhe der Rigole fehlen.');
  } else {
    L = r.length;
    B = r.width;
    H = r.height;
    lines.push(`L_R = ${fmt(L, 2)} m, B_R = ${fmt(B, 2)} m, H_R = ${fmt(H, 2)} m (direkt eingegeben)`);
  }

  if (Number.isNaN(s)) errors.push('Speicherkoeffizient s_R fehlt.');
  else if (s <= 0 || s > 1) errors.push('Speicherkoeffizient s_R muss zwischen 0 und 1 liegen.');

  if (L === null || B === null || H === null || Number.isNaN(s) || s <= 0 || s > 1) return null;
  const v = storageVolume(L, B, H, s, vM);
  lines.push(`V_vorh = ${fmt(L, 2)} · ${fmt(B, 2)} · ${fmt(H, 2)} · ${fmt(s, 2)}${vM ? ` + V_M ${fmt(vM, 3)}` : ''} = ${fmt(v, 2)} m³`);
  return { volume: v, lines, length: L, width: B, height: H, storageCoeff: s, swaleVolume: vM };
}

/** Alles zusammenführen und rechnen. Wirft nicht, Probleme landen in errors/warnings. */
export function compute(inp: Inputs): Computed {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { areas, rampUsed } = collectAreas(inp, errors);
  const { table: rainTable, missing } = toRainTable(inp);
  if (inp.durations.length === 0) errors.push('Mindestens eine Regendauer wählen.');
  if (missing.length) errors.push(`Regendaten fehlen: ${missing.join('; ')}.`);
  const volume = collectVolume(inp, errors);

  let result: FloodProofResult | null = null;
  const alt: Record<number, FloodProofResult | null> = { 30: null, 100: null };
  let gl21: Gl21Result | null = null;

  if (errors.length === 0 && volume) {
    try {
      result = calculate(areas, rainTable, inp.rainFrequency, volume.volume, inp.totalAreaOverride, inp.durations, inp.returnPeriodOverride);
      for (const T of [30, 100]) {
        try {
          alt[T] = calculate(areas, rainTable, inp.rainFrequency, volume.volume, inp.totalAreaOverride, inp.durations, T);
        } catch {
          alt[T] = null;
        }
      }
      if (inp.extras.qVoll !== null) {
        try {
          gl21 = calculateGl21(rainTable, result.aGes, inp.extras.qVoll, result.returnPeriod, inp.durations);
        } catch (e) {
          warnings.push(`Gleichung 21 nicht gerechnet: ${(e as Error).message}`);
        }
      }
    } catch (e) {
      errors.push((e as Error).message);
    }
  }

  if (result) {
    if (result.aGesIsOverride && result.aGes < result.aGesSum) {
      warnings.push(`A_ges (${fmt(result.aGes, 0)} m²) ist kleiner als die Summe der Flächen (${fmt(result.aGesSum, 0)} m²). Das ist ungewöhnlich, bitte prüfen.`);
    }
    if (rampUsed) warnings.push('Rampen mit Neigung zum Gebäude (UID 14): Die DIN verlangt hier eine gesonderte Betrachtung. Wird hier normal gerechnet.');
    if (inp.excludeCat7) warnings.push('Vergleichsmodus: Park/Rasen/Garten (Kat. 7) sind aus A_ges herausgenommen. Im VSO zählen sie zur Fläche.');
    if (inp.returnPeriodOverride !== null) warnings.push(`Vergleichsmodus: Jährlichkeit fest auf ${inp.returnPeriodOverride} Jahre gesetzt. Im VSO entscheidet die Regel (> 10 Jahre → 100).`);
    if (inp.durations.join() !== DEFAULT_DURATIONS.join()) warnings.push(`Regendauern weichen vom Standard ab: ${inp.durations.join(', ')} min (VSO-Standard 5, 10, 15 min).`);
    if (!result.mandatory) warnings.push('A_ges ≤ 800 m²: Der Nachweis ist freiwillig.');
  }

  let suggestion = null;
  if (result && !result.passed && inp.rigole.mode === 'blocks' && volume?.length !== undefined && inp.rigole.blocLength) {
    suggestion = enlargementSuggestion(-result.reserve, volume.length, volume.width!, volume.height!, volume.storageCoeff!, inp.rigole.blocLength, inp.rigole.availableLength);
  }

  return { errors, warnings, areas, rainTable, volume, result, alt, gl21, suggestion, rampUsed };
}

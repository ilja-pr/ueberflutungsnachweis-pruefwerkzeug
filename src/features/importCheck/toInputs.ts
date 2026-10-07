/*
 * Importierte Daten in die Eingaben des Rechners übernehmen.
 * Es wird nur überschrieben, was gefunden wurde. Alles andere bleibt, wie es im Rechner steht.
 */
import { DEFAULT_DURATIONS } from '../../core/floodProof';
import { getSurfaceType } from '../../core/surfaceTypes';
import { newId } from '../calculator/defaults';
import type { AreaRowState, Inputs, RigoleInputs } from '../calculator/types';
import type { CheckData } from './types';

export interface ApplyResult {
  inputs: Inputs;
  /** was übernommen wurde, in Klartext */
  applied: string[];
  /** was nicht übernommen werden konnte */
  skipped: string[];
}

const sc = (d: CheckData, key: string): number | undefined => {
  const v = d.scalars[key];
  return v === undefined || v === '' || !Number.isFinite(Number(v)) ? undefined : Number(v);
};

export function applyToInputs(base: Inputs, data: CheckData): ApplyResult {
  const inp: Inputs = structuredClone(base);
  const applied: string[] = [];
  const skipped: string[] = [];

  // Flächen
  const rowsIn = data.areas.filter((a) => a.area !== undefined && a.area > 0);
  if (rowsIn.length) {
    const rows: AreaRowState[] = [];
    for (const a of rowsIn) {
      if (a.uid === undefined) {
        skipped.push(`Fläche ${a.index + 1}: Flächenart fehlt, Zeile nicht übernommen`);
        continue;
      }
      if (a.uid !== 0 && !getSurfaceType(a.uid)) {
        skipped.push(`Fläche ${a.index + 1}: UID ${a.uid} ist nicht im Katalog, Zeile nicht übernommen`);
        continue;
      }
      if (a.uid === 0 && a.cs === undefined) {
        skipped.push(`Fläche ${a.index + 1} (Manuell): C_s fehlt, Zeile nicht übernommen`);
        continue;
      }
      rows.push({
        id: newId(),
        surfaceUid: a.uid,
        manualName: a.uid === 0 ? (a.name ?? '') : '',
        area: a.area ?? null,
        csCustom: a.uid === 0 ? (a.cs ?? null) : null,
        isRoofCustom: a.uid === 0 ? a.isRoof === true : false,
      });
    }
    if (rows.length) {
      inp.areas = rows;
      applied.push(`${rows.length} Flächenzeile${rows.length === 1 ? '' : 'n'}`);
    }
  }

  // Regenhäufigkeit, Rasterfeld, Entwässerungsart
  const type = sc(data, 'infiltrationType');
  if (type === 1 || type === 2) {
    inp.rigole.infiltrationType = type;
    applied.push(type === 1 ? 'Entwässerungsart Rigole' : 'Entwässerungsart Mulden-Rigole');
  } else if (type !== undefined) skipped.push(`Entwässerungsart ${type} wird im Rechner nicht unterstützt`);

  const f = sc(data, 'rainFrequency');
  if (f !== undefined) {
    inp.rainFrequency = f;
    applied.push(`Regenhäufigkeit ${f} Jahre`);
  } else if (type === 2) {
    inp.rainFrequency = null;
    applied.push('Regenhäufigkeit leer (Mulden-Rigole)');
  }
  if (data.scalars.rcIndex) {
    inp.rcIndex = data.scalars.rcIndex;
    applied.push(`Rasterfeld ${data.scalars.rcIndex}`);
  }

  // Regendaten (nur die Dauern, die der Rechner führt)
  const wanted = new Set([...DEFAULT_DURATIONS, ...inp.durations]);
  let rainCount = 0;
  for (const [T, byD] of Object.entries(data.rain)) {
    for (const [D, v] of Object.entries(byD)) {
      if (!wanted.has(Number(D)) || ![2, 30, 100].includes(Number(T))) continue;
      inp.rain[T] = { ...(inp.rain[T] ?? {}), [D]: v };
      rainCount++;
    }
  }
  if (rainCount) {
    inp.rainUnit = 'r';
    applied.push(`${rainCount} Regenspende${rainCount === 1 ? '' : 'n'} (als r in l/(s·ha))`);
  }

  // Anlage
  const r: RigoleInputs = inp.rigole;
  const s = sc(data, 'storageCoeff');
  if (s !== undefined) r.storageCoeff = s;
  const swale = sc(data, 'swaleVolume');
  if (swale !== undefined) r.swaleVolume = swale;
  const blocks = ['blocksLength', 'blocksWidth', 'layers', 'blocLength', 'blocWidth', 'displayBlocHeight'].every((k) => sc(data, k) !== undefined);
  if (blocks) {
    r.mode = 'blocks';
    r.blocksLength = sc(data, 'blocksLength')!;
    r.blocksWidth = sc(data, 'blocksWidth')!;
    r.layers = sc(data, 'layers')!;
    r.blocLength = sc(data, 'blocLength')!;
    r.blocWidth = sc(data, 'blocWidth')!;
    r.displayBlocHeight = sc(data, 'displayBlocHeight')!;
    r.extraBloc = sc(data, 'extraBloc') === 1;
    const eh = sc(data, 'extraBlocHeight');
    if (eh !== undefined) r.extraBlocHeight = eh;
    applied.push('Blockdaten der Anlage');
  } else if (['length', 'width', 'height'].every((k) => sc(data, k) !== undefined)) {
    r.mode = 'dims';
    r.length = sc(data, 'length')!;
    r.width = sc(data, 'width')!;
    r.height = sc(data, 'height')!;
    applied.push('Länge, Breite, Höhe der Anlage');
  } else if (sc(data, 'volume') !== undefined) {
    r.mode = 'volume';
    r.volumeDirect = sc(data, 'volume')!;
    applied.push(`Volumen ${r.volumeDirect} m³`);
  }
  if (s !== undefined) applied.push(`Speicherkoeffizient ${s}`);
  if (swale !== undefined) applied.push(`Muldenvolumen ${swale} m³`);

  const qv = sc(data, 'qVoll');
  if (qv !== undefined) {
    inp.extras.qVoll = qv;
    applied.push(`Q_voll ${qv} l/s`);
  }
  if (sc(data, 'qDr') !== undefined) skipped.push('Q_Dr (Drosselabfluss) hat im Rechner kein Feld, Gl. 22 wird dort nicht gerechnet');

  if (applied.length === 0) skipped.push('Es gab nichts, was sich übernehmen ließe');
  return { inputs: inp, applied, skipped };
}


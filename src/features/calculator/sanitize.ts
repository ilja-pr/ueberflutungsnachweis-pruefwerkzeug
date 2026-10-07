import { defaultInputs, newId } from './defaults';
import type { AreaRowState, Inputs } from './types';

/** Eingaben aus Datei oder Speicher prüfen und mit Standardwerten auffüllen. Gibt null zurück, wenn es keine Eingaben sind. */
export function sanitizeInputs(raw: unknown): Inputs | null {
  if (!raw || typeof raw !== 'object') return null;
  const base = defaultInputs();
  const o = raw as Partial<Inputs>;
  if (!Array.isArray(o.areas) || !o.rain || !o.rigole || !Array.isArray(o.durations)) return null;
  const areas = (o.areas as Partial<AreaRowState>[]).map((a) => ({
    surfaceUid: a.surfaceUid ?? 0,
    manualName: a.manualName ?? '',
    area: a.area ?? null,
    csCustom: a.csCustom ?? null,
    isRoofCustom: a.isRoofCustom ?? false,
    id: newId(),
  }));
  return {
    ...base,
    ...o,
    areas,
    rigole: { ...base.rigole, ...o.rigole },
    extras: { ...base.extras, ...(o.extras ?? {}) },
    excel: { ...base.excel, ...(o.excel ?? {}) },
  } as Inputs;
}

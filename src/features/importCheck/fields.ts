/** Bekannte Felder, die aus dem VSO kommen können. */
export interface FieldDef {
  label: string;
  unit?: string;
  /** 'text' = Zeichenkette, sonst Zahl */
  kind: 'num' | 'text';
}

export const SCALAR_FIELDS: Record<string, FieldDef> = {
  country: { label: 'Objektland (1 = Deutschland)', kind: 'num' },
  newGuideline: { label: 'Richtlinie (1 = DWA-A 138-1, 0 = alte DWA-A 138)', kind: 'num' },
  infiltrationType: { label: 'Entwässerungsart (1 Rigole, 2 Mulden-Rigole, 3 Zisterne)', kind: 'num' },
  rainFrequency: { label: 'Gewählte Regenhäufigkeit', unit: 'Jahre', kind: 'num' },
  rcIndex: { label: 'KOSTRA-Rasterfeld (rcIndex)', kind: 'text' },
  aGes: { label: 'Befestigte Gesamtfläche A_ges', unit: 'm²', kind: 'num' },
  volume: { label: 'Vorhandenes Speichervolumen V_vorh', unit: 'm³', kind: 'num' },
  length: { label: 'Rigolenlänge L_R', unit: 'm', kind: 'num' },
  width: { label: 'Rigolenbreite B_R', unit: 'm', kind: 'num' },
  height: { label: 'Rigolenhöhe H_R', unit: 'm', kind: 'num' },
  storageCoeff: { label: 'Speicherkoeffizient s_R', kind: 'num' },
  swaleVolume: { label: 'Muldenvolumen V_M', unit: 'm³', kind: 'num' },
  blocksLength: { label: 'Blöcke in der Länge', kind: 'num' },
  blocksWidth: { label: 'Blöcke in der Breite', kind: 'num' },
  layers: { label: 'Lagen', kind: 'num' },
  extraBloc: { label: 'Zusätzliche halbe Lage (0/1)', kind: 'num' },
  blocLength: { label: 'Blocklänge', unit: 'm', kind: 'num' },
  blocWidth: { label: 'Blockbreite', unit: 'm', kind: 'num' },
  displayBlocHeight: { label: 'Blockhöhe je Lage', unit: 'm', kind: 'num' },
  extraBlocHeight: { label: 'Höhe der halben Lage', unit: 'm', kind: 'num' },
  qVoll: { label: 'Q_voll der Grundleitung', unit: 'l/s', kind: 'num' },
  qDr: { label: 'Drosselabfluss / zulässiger Abfluss Q_Dr', unit: 'l/s', kind: 'num' },
};

export const AREA_PROPS = ['uid', 'area', 'name', 'cs', 'roof'] as const;
export type AreaProp = (typeof AREA_PROPS)[number];

const AREA_RE = /^area\[(\d+)\]\.(uid|area|name|cs|roof)$/;
const RAIN_RE = /^rain\[(\d+)\]\[(\d+)\]$/;

export function parseAreaKey(key: string): { index: number; prop: AreaProp } | null {
  const m = AREA_RE.exec(key);
  return m ? { index: Number(m[1]), prop: m[2] as AreaProp } : null;
}

export function parseRainKey(key: string): { T: number; D: number } | null {
  const m = RAIN_RE.exec(key);
  return m ? { T: Number(m[1]), D: Number(m[2]) } : null;
}

export const areaKey = (index: number, prop: AreaProp) => `area[${index}].${prop}`;
export const rainKey = (T: number, D: number) => `rain[${T}][${D}]`;

const AREA_PROP_LABEL: Record<AreaProp, string> = { uid: 'Flächenart (UID)', area: 'Fläche [m²]', name: 'Bezeichnung', cs: 'C_s', roof: 'Dach (1) / außerhalb (0)' };

export function fieldLabel(key: string): string {
  if (SCALAR_FIELDS[key]) return SCALAR_FIELDS[key].label;
  const a = parseAreaKey(key);
  if (a) return `Fläche ${a.index + 1}: ${AREA_PROP_LABEL[a.prop]}`;
  const r = parseRainKey(key);
  if (r) return `Regenspende r(${r.D},${r.T}) [l/(s·ha)]`;
  return key;
}

export function isKnownField(key: string): boolean {
  return key in SCALAR_FIELDS || parseAreaKey(key) !== null || parseRainKey(key) !== null;
}

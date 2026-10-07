import type { Enlargement, FloodProofResult, AreaInput, RainTable } from '../../core/floodProof';
import type { Gl21Result } from '../../core/gl21';

export type RigoleMode = 'blocks' | 'dims' | 'volume';
export type RainUnit = 'r' | 'hN';

export interface AreaRowState {
  id: string;
  /** UID der Flächenart, 0 = Manuell */
  surfaceUid: number;
  manualName: string;
  area: number | null;
  csCustom: number | null;
  isRoofCustom: boolean;
}

export interface RigoleInputs {
  mode: RigoleMode;
  /** 1 Rigole, 2 Mulden-Rigole */
  infiltrationType: 1 | 2;
  blocksLength: number | null;
  blocksWidth: number | null;
  layers: number | null;
  extraBloc: boolean;
  blocLength: number | null;
  blocWidth: number | null;
  displayBlocHeight: number | null;
  extraBlocHeight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  volumeDirect: number | null;
  storageCoeff: number | null;
  swaleVolume: number | null;
  availableLength: number | null;
}

export interface Inputs {
  projectName: string;
  requestNo: string;
  /** KOSTRA-Rasterfeld, nur zur Anzeige */
  rcIndex: string;
  /** gewählte Regenhäufigkeit in Jahren, null = nicht gewählt (Mulden-Rigole 138-1) */
  rainFrequency: number | null;
  /** nur für Vergleichsrechnungen: T fest vorgeben */
  returnPeriodOverride: number | null;
  areas: AreaRowState[];
  totalAreaOverride: number | null;
  /** Park/Rasen/Garten (Kat. 7) nicht in A_ges zählen (Vergleich mit Excel) */
  excludeCat7: boolean;
  durations: number[];
  rainUnit: RainUnit;
  /** rain[T][D] in der gewählten Einheit (r in l/(s·ha) oder hN in mm) */
  rain: Record<string, Record<string, number | null>>;
  rigole: RigoleInputs;
  /** Zusatz für Gleichung 21 */
  extras: { qVoll: number | null };
  excel: { vRueckMax: number | null; vVorh: number | null };
}

export interface VolumeInfo {
  volume: number;
  lines: string[];
  length?: number;
  width?: number;
  height?: number;
  storageCoeff?: number;
  swaleVolume?: number;
}

export interface Computed {
  errors: string[];
  warnings: string[];
  areas: AreaInput[];
  rainTable: RainTable;
  volume: VolumeInfo | null;
  /** Gleichung 20 */
  result: FloodProofResult | null;
  /** Vergleich: dieselbe Rechnung mit T=30 und T=100 */
  alt: Record<number, FloodProofResult | null>;
  /** Gleichung 21, nur wenn Q_voll eingetragen ist */
  gl21: Gl21Result | null;
  suggestion: Enlargement | null;
  rampUsed: boolean;
}

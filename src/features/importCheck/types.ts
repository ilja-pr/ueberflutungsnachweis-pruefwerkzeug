export type FindingSource = 'Prüfwerkzeug' | 'JSON' | 'Formularschlüssel' | 'Katalog' | 'Beschriftung' | 'manuell';

export interface Finding {
  id: string;
  /** Feldschlüssel, siehe fields.ts, z. B. "rainFrequency", "area[0].uid", "rain[30][15]" */
  field: string;
  value: string;
  source: FindingSource;
  /** Zeile im Rohtext (1-basiert), falls aus Text */
  line?: number;
  /** Textstelle, aus der der Wert stammt */
  context?: string;
}

export interface AreaFinding {
  index: number;
  /** UID der Flächenart, 0 = manuell, undefined = nicht erkannt */
  uid?: number;
  name?: string;
  area?: number;
  cs?: number;
  isRoof?: boolean;
}

/** Aus den Fundstücken zusammengeführte Daten (pro Feld gilt der Fund mit der höchsten Priorität). */
export interface CheckData {
  scalars: Record<string, string>;
  areas: AreaFinding[];
  /** rain[T][D] in l/(s·ha) */
  rain: Record<number, Record<number, number>>;
}

export type ReqState = 'ok' | 'partial' | 'missing' | 'assumed' | 'blocked';

export interface RequirementStatus {
  id: string;
  symbol: string;
  label: string;
  unit?: string;
  source: string;
  where: string;
  state: ReqState;
  /** was gefunden wurde bzw. was fehlt */
  detail: string;
}

export type EquationVerdict = 'vollstaendig' | 'unvollstaendig' | 'nicht-anwendbar' | 'unbekannt';

export interface EquationReport {
  id: string;
  title: string;
  formula: string;
  statusText: string;
  when: string;
  verdict: EquationVerdict;
  requirements: RequirementStatus[];
}

/*
 * Erkennungsregeln für Text aus dem VSO (PDF, kopierter Text).
 * Hier sind alle Beschriftungen gesammelt, die wir erwarten. Passt eine Beschriftung im echten
 * VSO-Dokument anders, genügt es, hier einen Eintrag zu ändern oder zu ergänzen.
 */
import type { NumberToken } from './numbers';

/** Erlaubte Zeichen zwischen Beschriftung und Wert: ":", "=", Tab, "|", Gedankenstrich, optional "(m³)" oder "L_R =". */
export const GAP_RE = /^[\s:=|\t·–—-]*(?:\([^)]{0,14}\)[\s:=|\t·–—-]*)?(?:[A-Za-zµ_]{1,6}\s*=\s*)?/;

export interface LabelRule {
  field: string;
  /** Beschriftung (steht direkt vor dem Wert) */
  label: RegExp;
  /** Zahl: erlaubte Einheiten ('' = ohne Einheit). Nicht gesetzt = Text/Mapping. */
  units?: string[];
  /** zusätzlicher Test für die Zahl */
  accept?: (n: number) => boolean;
  /** Zeile → Wert (für Textfelder wie Land, Richtlinie) */
  map?: (line: string) => string | null;
  /** Ziffernfolge (z. B. Rasterfeld) statt Zahl */
  digits?: RegExp;
}

const between = (lo: number, hi: number) => (n: number) => n >= lo && n <= hi;

export const LABEL_RULES: LabelRule[] = [
  {
    field: 'country',
    label: /\b(?:objekt)?land\b/i,
    map: (line) => (/deutschland|germany/i.test(line) ? '1' : /österreich|schweiz|luxemburg|niederlande|frankreich|polen|italien|dänemark|belgien|tschech/i.test(line) ? '0' : null),
  },
  {
    field: 'newGuideline',
    label: /richtlinie|regelwerk|bemessung\s+nach|bemessungsgrundlage|nach\s+dwa|nachweis\s+nach/i,
    map: (line) => (/138\s*[-–]\s*1/.test(line) ? '1' : /138(?!\s*[-–]\s*\d)/.test(line) ? '0' : null),
  },
  {
    field: 'infiltrationType',
    label: /entwässerung(?:sart)?\b|versickerungsart|anlagenart|art\s+der\s+anlage|systemart|anlagentyp|systemauswahl|typ\s+der\s+anlage/i,
    map: (line) => (/mulden[\s-]*rigole/i.test(line) ? '2' : /rigole/i.test(line) ? '1' : /zisterne/i.test(line) ? '3' : null),
  },
  { field: 'rainFrequency', label: /regenh[äa]ufigkeit|j[äa]hrlichkeit|wiederkehrzeit|[üu]berschreitungsh[äa]ufigkeit/i, units: ['', 'a'], accept: between(0.5, 1000) },
  { field: 'rcIndex', label: /rcindex|rasterfeld|rasterzelle|raster[\s-]*id|kostra[\s-]*(?:index|id)/i, digits: /^\d{4,8}\b/ },
  { field: 'aGes', label: /befestigte\s+(?:gesamt)?fl[äa]che|gesamtfl[äa]che|\bA[_\s]?ges\b|abflusswirksame\s+fl[äa]che/i, units: ['', 'm2'], accept: (n) => n > 0 },
  { field: 'volume', label: /speichervolumen|rigolenvolumen|\bV[_\s]?vorh\b|vorhandenes\s+(?:speicher)?volumen|retentionsvolumen|speicherraum/i, units: ['', 'm3'], accept: (n) => n > 0 },
  { field: 'length', label: /rigolenl[äa]nge|l[äa]nge\s+(?:der\s+)?rigole|\bL[_\s]?R\b/i, units: ['', 'm'], accept: (n) => n > 0 },
  { field: 'width', label: /rigolenbreite|breite\s+(?:der\s+)?rigole|\bB[_\s]?R\b/i, units: ['', 'm'], accept: (n) => n > 0 },
  { field: 'height', label: /rigolenh[öo]he|h[öo]he\s+(?:der\s+)?rigole|\bH[_\s]?R\b/i, units: ['', 'm'], accept: (n) => n > 0 },
  { field: 'storageCoeff', label: /speicherkoeffizient|speicherbeiwert|\bs[_\s]?R\b/i, units: [''], accept: between(0.01, 1) },
  { field: 'swaleVolume', label: /muldenvolumen|volumen\s+(?:der\s+)?mulde|\bV[_\s]?M\b/i, units: ['', 'm3'], accept: (n) => n >= 0 },
  { field: 'blocksLength', label: /bl[öo]cke\s+(?:in\s+)?(?:der\s+)?l[äa]nge|anzahl\s+bl[öo]cke\s+l[äa]nge/i, units: [''], accept: (n) => n > 0 },
  { field: 'blocksWidth', label: /bl[öo]cke\s+(?:in\s+)?(?:der\s+)?breite|anzahl\s+bl[öo]cke\s+breite/i, units: [''], accept: (n) => n > 0 },
  { field: 'layers', label: /\blagen\b|anzahl\s+(?:der\s+)?lagen/i, units: [''], accept: (n) => n > 0 },
  { field: 'blocLength', label: /blockl[äa]nge/i, units: ['', 'm'], accept: (n) => n > 0 },
  { field: 'blocWidth', label: /blockbreite/i, units: ['', 'm'], accept: (n) => n > 0 },
  { field: 'displayBlocHeight', label: /blockh[öo]he/i, units: ['', 'm'], accept: (n) => n > 0 },
  { field: 'qVoll', label: /\bQ[_\s]?voll\b|abfluss\s+bei\s+vollf[üu]llung|vollf[üu]llungsabfluss/i, units: ['', 'l/s'], accept: (n) => n > 0 },
  { field: 'qDr', label: /\bQ[_\s]?Dr\b|drosselabfluss|zul[äa]ssiger\s+(?:ab)?fluss|einleitbeschr[äa]nkung|einleitmenge|drosselwert|zul[äa]ssige\s+einleitung/i, units: ['', 'l/s'], accept: (n) => n >= 0 },
];

/** Erlaubte Zahl direkt nach der Beschriftung. */
export function pickNumber(tokens: NumberToken[], rule: LabelRule): NumberToken | null {
  const t = tokens[0];
  if (!t || t.index !== 0) return null;
  if (rule.units && !rule.units.includes(t.unit)) return null;
  if (rule.accept && !rule.accept(t.value)) return null;
  return t;
}

/** Dauerstufen nach DWA-A 118 / KOSTRA, in Minuten. */
export const KNOWN_DURATIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 360, 540, 720, 1080, 1440, 2880, 4320];
/** Jährlichkeiten, die in KOSTRA-Tabellen vorkommen. */
export const KNOWN_RETURN_PERIODS = [1, 2, 3, 5, 10, 20, 30, 50, 100];

/** Aliase für Feldnamen aus Formularen und JSON (kleingeschrieben, nur Buchstaben und Ziffern). */
export const SCALAR_ALIASES: Record<string, string> = {
  country: 'country',
  newguideline: 'newGuideline',
  guideline: 'newGuideline',
  infiltrationtype: 'infiltrationType',
  drainagetype: 'infiltrationType',
  rainfrequency: 'rainFrequency',
  rcindex: 'rcIndex',
  ages: 'aGes',
  totalarea: 'aGes',
  sealedarea: 'aGes',
  volume: 'volume',
  storagevolume: 'volume',
  vvorh: 'volume',
  length: 'length',
  width: 'width',
  height: 'height',
  storagecoeff: 'storageCoeff',
  storagecoefficient: 'storageCoeff',
  swalevolume: 'swaleVolume',
  blockslength: 'blocksLength',
  blockswidth: 'blocksWidth',
  layers: 'layers',
  extrabloc: 'extraBloc',
  bloclength: 'blocLength',
  blocwidth: 'blocWidth',
  displayblocheight: 'displayBlocHeight',
  extrablocheight: 'extraBlocHeight',
  qvoll: 'qVoll',
  qdr: 'qDr',
  permitteddischarge: 'qDr',
  throttleflow: 'qDr',
};

export const AREA_LIST_KEYS = new Set(['surfacevalue', 'surfacevalues', 'areas', 'surfaces', 'flaechen']);
export const AREA_PROP_ALIASES: Record<string, string> = {
  area: 'area',
  areasize: 'area',
  size: 'area',
  flaeche: 'area',
  surfacetype: 'uid',
  surfacetypeuid: 'uid',
  surfacetypeid: 'uid',
  uid: 'uid',
  name: 'name',
  title: 'name',
  label: 'name',
  cs: 'cs',
  csvalue: 'cs',
  cscustom: 'cs',
  roof: 'roof',
  isroof: 'roof',
  isroofcustom: 'roof',
};
export const RAIN_KEYS = new Set(['rain', 'raindata', 'rainintensity', 'regenspende', 'regendaten']);

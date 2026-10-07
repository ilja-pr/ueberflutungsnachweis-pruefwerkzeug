/*
 * Welche Gleichung braucht welche Eingangsgrößen, und woher bekommt man sie?
 * Reine Daten. Der Import-Tab prüft damit, was aus dem VSO fehlt.
 *
 * Belegt aus: Merkblatt Überflutungsnachweis Stadt Bielefeld (2025), Merkblatt Stadt Gütersloh,
 * Fachfolien REHAU zur DIN 1986-100. Gleichung 19 ist in diesen Quellen NICHT enthalten (siehe unten).
 */

export type RequirementId =
  | 'gating'
  | 'areas'
  | 'roofSplit'
  | 'cs'
  | 'cm'
  | 'rainFrequency'
  | 'rcIndex'
  | 'rainT'
  | 'rain2'
  | 'durations'
  | 'storage'
  | 'qVoll'
  | 'qDr'
  | 'fz'
  | 'durationsLong';

export type Source = 'VSO' | 'VSO-Katalog' | 'extern' | 'Annahme';

export interface Requirement {
  id: RequirementId;
  symbol: string;
  label: string;
  unit?: string;
  source: Source;
  /** Wo bekommt man den Wert? */
  where: string;
  /** Standardwert, falls es einen anerkannten gibt */
  fallback?: string;
}

export const REQUIREMENTS: Record<RequirementId, Requirement> = {
  gating: {
    id: 'gating',
    symbol: '–',
    label: 'Voraussetzungen: Deutschland, DWA-A 138-1, Rigole oder Mulden-Rigole',
    source: 'VSO',
    where: 'configuration[country] = 1, [newGuideline] = 1, [infiltrationType] = 1 oder 2',
  },
  areas: {
    id: 'areas',
    symbol: 'A_i',
    label: 'Angeschlossene Flächen je Zeile',
    unit: 'm²',
    source: 'VSO',
    where: 'configuration[surfaceValue][n][area] und [surfacetype] (UID der Flächenart)',
  },
  roofSplit: {
    id: 'roofSplit',
    symbol: 'A_Dach, A_FaG',
    label: 'Zuordnung Dach / außerhalb Gebäude je Fläche',
    source: 'VSO-Katalog',
    where: 'Kategorie der Flächenart (1–3 Dach, 4–7 außerhalb). Bei „Manuell“ neues Feld isRoofCustom',
  },
  cs: {
    id: 'cs',
    symbol: 'C_s',
    label: 'Spitzenabflussbeiwert je Fläche',
    source: 'VSO-Katalog',
    where: 'Flächenart-Stammdaten (cs) über die UID. Das Kundenformular schickt C_s nicht mit. Bei „Manuell“ neues Feld csCustom',
  },
  cm: {
    id: 'cm',
    symbol: 'C_m',
    label: 'Mittlerer Abflussbeiwert je Fläche (für A_u)',
    source: 'VSO-Katalog',
    where: 'Flächenart-Stammdaten (cm) über die UID',
  },
  rainFrequency: {
    id: 'rainFrequency',
    symbol: 'T gewählt',
    label: 'Gewählte Regenhäufigkeit (entscheidet über T = 30 oder 100)',
    unit: 'Jahre',
    source: 'VSO',
    where: 'configuration[rainFrequency]. Bei Mulden-Rigole nach 138-1 wird sie nicht gesendet (VSO-489), dann T = 30',
    fallback: 'T = 30',
  },
  rcIndex: {
    id: 'rcIndex',
    symbol: 'rcIndex',
    label: 'KOSTRA-Rasterfeld des Objekts',
    source: 'VSO',
    where: 'configuration[rcIndex], z. B. 206112. Kommt aus der Postleitzahl (checkWeatherStation)',
  },
  rainT: {
    id: 'rainT',
    symbol: 'r(D,T)',
    label: 'Regenspende für D = 5, 10, 15 min bei T = 30 bzw. 100',
    unit: 'l/(s·ha)',
    source: 'VSO',
    where: 'Regendaten-Tabelle zum Rasterfeld (serverseitig). Alternativ KOSTRA-DWD-2020 für das Rasterfeld',
  },
  rain2: {
    id: 'rain2',
    symbol: 'r(D,2)',
    label: 'Regenspende 2-jährlich für D = 5, 10, 15 min',
    unit: 'l/(s·ha)',
    source: 'VSO',
    where: 'dieselbe Regendaten-Tabelle, T = 2',
  },
  durations: {
    id: 'durations',
    symbol: 'D',
    label: 'Regendauern 5, 10, 15 min (maßgebend: größter Wert)',
    unit: 'min',
    source: 'Annahme',
    where: 'Einstellung floodProof.durations. Nach DWA-A 118 Tab. 4 kann auch eine einzelne Dauer maßgebend sein (offener Punkt 2)',
    fallback: '5, 10, 15 min',
  },
  storage: {
    id: 'storage',
    symbol: 'V_vorh',
    label: 'Vorhandenes Speichervolumen der Anlage',
    unit: 'm³',
    source: 'VSO',
    where: 'finale Bemessung: Volumen, oder Länge, Breite, Höhe und Speicherkoeffizient, oder Blockanzahl, Lagen und Produktdaten. Bei Mulden-Rigole plus Muldenvolumen',
  },
  qVoll: {
    id: 'qVoll',
    symbol: 'Q_voll',
    label: 'Abfluss der Grundleitung bei Vollfüllung (bei Einleitbeschränkung deren Wert)',
    unit: 'l/s',
    source: 'extern',
    where: 'DIN 1986-100 Tabelle A.5 für die geplante Grundleitung (Nennweite, Gefälle). Liegt im VSO nicht vor',
  },
  qDr: {
    id: 'qDr',
    symbol: 'Q_Dr',
    label: 'Drosselabfluss',
    unit: 'l/s',
    source: 'VSO',
    where: 'vermutlich configuration[permittedDischarge] (zulässiger Abfluss), im Code prüfen. Sonst aus der Einleitbeschränkung der Kommune',
  },
  fz: {
    id: 'fz',
    symbol: 'f_Z',
    label: 'Risikozuschlag',
    source: 'Annahme',
    where: 'fest 1,15 (einfaches Verfahren nach DWA-A 117)',
    fallback: '1,15',
  },
  durationsLong: {
    id: 'durationsLong',
    symbol: 'D (5…4320)',
    label: 'Regenspenden für lange Dauerstufen (bis 4320 min)',
    unit: 'l/(s·ha)',
    source: 'extern',
    where: 'KOSTRA-DWD-2020 für das Rasterfeld, Dauerstufen 5 bis 4320 min. Im VSO vermutlich nicht gespeichert',
  },
};

export type EquationStatus = 'implementiert' | 'nur-pruefung' | 'ungeprueft';

export interface EquationDef {
  id: 'gl19' | 'gl20' | 'gl21' | 'gl22';
  title: string;
  formula: string;
  status: EquationStatus;
  statusText: string;
  when: string;
  needs: RequirementId[];
}

export const EQUATIONS: EquationDef[] = [
  {
    id: 'gl19',
    title: 'Gleichung 19',
    formula: 'noch nicht hinterlegt',
    status: 'ungeprueft',
    statusText: 'Formel nicht belegt',
    when:
      'In den geprüften Quellen (Merkblätter Bielefeld, Gütersloh, Oestrich-Winkel, Ibbenbüren, REHAU-Folien) kommt Gleichung 19 nicht vor, dort beginnt die Nummerierung bei 20. Die Norm selbst liegt nicht vor. Wenn die Formel aus der Norm genannt wird, wird sie hier ergänzt (ein Eintrag in src/core/equations.ts). Unklar ist auch, ob Gl. 19 überhaupt zum Überflutungsnachweis gehört.',
    needs: [],
  },
  {
    id: 'gl20',
    title: 'Gleichung 20',
    formula: 'V_Rück = [ r(D,T)·A_ges − r(D,2)·(A_Dach·C_s,Dach + A_FaG·C_s,FaG) ] · D·60 / 10 000 000',
    status: 'implementiert',
    statusText: 'wird gerechnet (Rechner-Tab)',
    when: 'Überflutungsnachweis über die Flächen und die Regenspenden. Pflicht ab befestigter Fläche über 800 m².',
    needs: ['gating', 'areas', 'roofSplit', 'cs', 'rainFrequency', 'rcIndex', 'rainT', 'rain2', 'durations', 'storage'],
  },
  {
    id: 'gl21',
    title: 'Gleichung 21',
    formula: 'V_Rück = [ r(D,T)·A_ges / 10 000 − Q_voll ] · D·60 / 1000',
    status: 'implementiert',
    statusText: 'wird gerechnet, wenn Q_voll bekannt ist',
    when:
      'Zweite Rechnung über den Abfluss der Grundleitung bei Vollfüllung (bei Einleitbeschränkung deren Drosselabfluss). Nur zulässig, wenn die Leitungen nach DWA-A 118 Tab. 4 bemessen sind. Laut Merkblättern werden ohne Einleitbeschränkung Gl. 20 und Gl. 21 gerechnet, der größere Wert ist maßgebend. Das Projekt rechnet im Standard nur Gl. 20.',
    needs: ['gating', 'areas', 'rainFrequency', 'rcIndex', 'rainT', 'durations', 'qVoll', 'storage'],
  },
  {
    id: 'gl22',
    title: 'Gleichung 22',
    formula: 'V_RRR = A_u·r(D,T)/10 000·D·f_Z·0,06 − D·f_Z·Q_Dr·0,06',
    status: 'nur-pruefung',
    statusText: 'nur Prüfung der Eingangswerte, keine Rechnung',
    when: 'Nur bei Einleitbeschränkung der Kommune: Volumen des Regenrückhalteraums. Laut Merkblatt Ibbenbüren gilt das größte Ergebnis aus Gl. 20, 21 und 22.',
    needs: ['gating', 'areas', 'cm', 'rcIndex', 'rainT', 'durationsLong', 'fz', 'qDr'],
  },
];

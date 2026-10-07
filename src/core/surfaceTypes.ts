// Flächenarten aus dem Live-System (versickerung.graf.digital, #areaGuideline1381[data-surface-types-map]).
// Stand 07.10.2026. Quelle der Werte: GRAF VSO. Kategorien 1-3 = Dachfläche, 4-7 = Fläche außerhalb von Gebäuden.

export interface SurfaceType {
  uid: number;
  category: number;
  categoryName: string;
  name: string;
  cm: number;
  cs: number;
  isRoof: boolean;
}

export const CATEGORY_NAMES: Record<number, string> = {"1": "Schrägdach", "2": "Flachdach", "3": "Gründach", "4": "Undurchlässige Verkehrsflächen", "5": "Teildurchlässige Verkehrsflächen", "6": "Sportflächen", "7": "Park, Rasen, Garten"};

export const SURFACE_TYPES: SurfaceType[] = [
  { uid: 1, category: 1, categoryName: "Schrägdach", name: "Metall, Glas, Schiefer, Faserzement", cm: 0.9, cs: 1, isRoof: true },
  { uid: 2, category: 1, categoryName: "Schrägdach", name: "Ziegel, Abdichtungsbahnen (z. B. Dachpappe)", cm: 0.9, cs: 1, isRoof: true },
  { uid: 3, category: 2, categoryName: "Flachdach", name: "Metall, Glas, Faserzement", cm: 0.9, cs: 1, isRoof: true },
  { uid: 4, category: 2, categoryName: "Flachdach", name: "Abdichtungsbahnen (z. B. Dachpappe)", cm: 0.9, cs: 1, isRoof: true },
  { uid: 5, category: 2, categoryName: "Flachdach", name: "Kiesschüttung", cm: 0.8, cs: 0.8, isRoof: true },
  { uid: 6, category: 3, categoryName: "Gründach", name: "Extensivbegrünung (Neigung > 5°)", cm: 0.4, cs: 0.7, isRoof: true },
  { uid: 7, category: 3, categoryName: "Gründach", name: "Intensivbegrünung ≥ 30 cm Aufbaudicke (Neigung ≤ 5°)", cm: 0.1, cs: 0.2, isRoof: true },
  { uid: 8, category: 3, categoryName: "Gründach", name: "Extensivbegrünung ≥ 10 cm Aufbaudicke (Neigung ≤ 5°)", cm: 0.2, cs: 0.4, isRoof: true },
  { uid: 9, category: 3, categoryName: "Gründach", name: "Extensivbegrünung < 10 cm Aufbaudicke (Neigung ≤ 5°)", cm: 0.3, cs: 0.5, isRoof: true },
  { uid: 10, category: 4, categoryName: "Undurchlässige Verkehrsflächen", name: "Betonflächen", cm: 0.9, cs: 1, isRoof: false },
  { uid: 11, category: 4, categoryName: "Undurchlässige Verkehrsflächen", name: "Schwarzdecken (Asphalt)", cm: 0.9, cs: 1, isRoof: false },
  { uid: 12, category: 4, categoryName: "Undurchlässige Verkehrsflächen", name: "Befestigte Flächen mit Fugendichtung, z. B. Pflaster mit Fugenverguss", cm: 0.8, cs: 1, isRoof: false },
  { uid: 13, category: 4, categoryName: "Undurchlässige Verkehrsflächen", name: "Oberirdische Gleisanlage, feste Fahrbahn", cm: 0.9, cs: 1, isRoof: false },
  { uid: 14, category: 4, categoryName: "Undurchlässige Verkehrsflächen", name: "Rampen mit Neigung zum Gebäude, unabhängig von der Neigung und Befestigungsart", cm: 1, cs: 1, isRoof: false },
  { uid: 15, category: 4, categoryName: "Undurchlässige Verkehrsflächen", name: "Kunststoffflächen von Sportplätzen", cm: 0.5, cs: 1, isRoof: false },
  { uid: 16, category: 5, categoryName: "Teildurchlässige Verkehrsflächen", name: "Betonsteinpflaster, in Sand oder Schlacke verlegt, Flächen mit Platten", cm: 0.7, cs: 0.9, isRoof: false },
  { uid: 17, category: 5, categoryName: "Teildurchlässige Verkehrsflächen", name: "Pflasterflächen, mit Fugenanteil > 15 %, z. B. 10 cm × 10 cm und kleiner oder fester Kiesbelag", cm: 0.6, cs: 0.7, isRoof: false },
  { uid: 18, category: 5, categoryName: "Teildurchlässige Verkehrsflächen", name: "Wassergebundene Flächen", cm: 0.7, cs: 0.9, isRoof: false },
  { uid: 19, category: 5, categoryName: "Teildurchlässige Verkehrsflächen", name: "Lockerer Kiesbelag, Schotterrasen (z. B. Kinderspielplätze)", cm: 0.2, cs: 0.3, isRoof: false },
  { uid: 20, category: 5, categoryName: "Teildurchlässige Verkehrsflächen", name: "Verbundsteine mit Sickerfugen, Sicker-/Dränsteine", cm: 0.25, cs: 0.4, isRoof: false },
  { uid: 21, category: 5, categoryName: "Teildurchlässige Verkehrsflächen", name: "Rasengittersteine mit häufigen Verkehrsbelastungen (z. B. Parkplatz)", cm: 0.2, cs: 0.4, isRoof: false },
  { uid: 22, category: 5, categoryName: "Teildurchlässige Verkehrsflächen", name: "Rasengittersteine ohne häufige Verkehrsbelastungen (z. B. Feuerwehrzufahrt)", cm: 0.1, cs: 0.2, isRoof: false },
  { uid: 23, category: 5, categoryName: "Teildurchlässige Verkehrsflächen", name: "Gleisanlage, Schotterbau mit durchlässigem Unterbau", cm: 0.1, cs: 0.2, isRoof: false },
  { uid: 24, category: 5, categoryName: "Teildurchlässige Verkehrsflächen", name: "Gleisanlage, Schotterbau mit schwach durchlässigem Unterbau", cm: 0.4, cs: 0.6, isRoof: false },
  { uid: 25, category: 6, categoryName: "Sportflächen", name: "Kunststoff-Flächen, Kunststoffrasen", cm: 0.1, cs: 0.1, isRoof: false },
  { uid: 26, category: 6, categoryName: "Sportflächen", name: "Tennenflächen (Hart-, Asche(n)-, Schlackeplatz)", cm: 0.3, cs: 0.3, isRoof: false },
  { uid: 27, category: 6, categoryName: "Sportflächen", name: "Rasenflächen", cm: 0.1, cs: 0.1, isRoof: false },
  { uid: 28, category: 7, categoryName: "Park, Rasen, Garten", name: "flaches Gelände", cm: 0.1, cs: 0.2, isRoof: false },
  { uid: 29, category: 7, categoryName: "Park, Rasen, Garten", name: "steiles Gelände", cm: 0.2, cs: 0.3, isRoof: false },
  { uid: 30, category: 7, categoryName: "Park, Rasen, Garten", name: "dauerhaft eingestaute Wasserflächen", cm: 1, cs: 1, isRoof: false },
];

/** UID 14 (Rampen mit Neigung zum Gebäude): die DIN verlangt eine gesonderte Betrachtung. */
export const RAMP_UID = 14;

export const getSurfaceType = (uid: number) => SURFACE_TYPES.find((s) => s.uid === uid);

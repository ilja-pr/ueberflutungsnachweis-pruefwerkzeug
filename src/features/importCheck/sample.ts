/** Beispieltexte für den Import-Tab. Erfundene Werte, keine echten Kundendaten. */

/** Was das Kundenformular vermutlich schickt: Regenspenden und C_s fehlen darin. */
export const SAMPLE_FORM = `configuration[country]=1
configuration[newGuideline]=1
configuration[infiltrationType]=1
configuration[rainFrequency]=20
configuration[rcIndex]=206112
configuration[surfaceValue][0][area]=600
configuration[surfaceValue][0][surfacetype]=2
configuration[surfaceValue][1][area]=350
configuration[surfaceValue][1][surfacetype]=16
configuration[blocksLength]=10
configuration[blocksWidth]=3
configuration[layers]=2
configuration[blocLength]=0,8
configuration[blocWidth]=0,8
configuration[displayBlocHeight]=0,42
configuration[storageCoeff]=0,95`;

/** So könnte ein Text aus einem Ausdruck oder einer kopierten Seite aussehen. */
export const SAMPLE_TEXT = `Versickerungsanlage – Ergebnis
Objektland: Deutschland
Richtlinie: DWA-A 138-1
Entwässerungsart: Rigole
Regenhäufigkeit: 5 Jahre
KOSTRA-Rasterfeld: 206112

Flächenart\tFläche
Schrägdach – Ziegel, Abdichtungsbahnen (z. B. Dachpappe)\t600,00 m²
Betonsteinpflaster, in Sand oder Schlacke verlegt, Flächen mit Platten\t350,00 m²

Rigolenlänge: 8,00 m
Rigolenbreite: 2,40 m
Rigolenhöhe: 0,84 m
Speicherkoeffizient s_R: 0,95

D [min]\tT = 2 a\tT = 30 a\tT = 100 a
5\t255,0\t480,0\t590,0
10\t175,0\t340,0\t415,0
15\t138,0\t270,0\t330,0`;

# Überflutungsnachweis nach DIN 1986-100 im Versickerungs-Konfigurator

**Extension:** `ig_graf_infiltration` (TYPO3, Extbase)  ·  **Stand:** 07.10.2026  ·  **Gilt nur für:** DWA-A 138-1

---

## 0. Kurzfassung

Bisher berechnet der Mitarbeiter im Admin-Bereich die finale Anlage. Danach überträgt er die Werte von Hand in eine Excel-Datei und rechnet dort den Überflutungsnachweis.

**Neu:** Der Nachweis wird direkt nach der finalen Berechnung **automatisch im System** gerechnet. Dabei entsteht eine **zweite PDF** („Überflutungsnachweis“) im gleichen Stil wie die Bemessungs-PDF.

Die **Rückhaltung muss vollständig in der Anlage** passieren, zusätzliche Überflutungs- bzw. Rückstauflächen auf dem Grundstück werden nicht angesetzt.

```
Kunde füllt Formular aus (Flächen, k_i, PLZ → rcIndex, Regenhäufigkeit)
        │  (keine Änderung für den Kunden, außer bei "Manuell"-Flächen, siehe 9.)
        ▼
Mitarbeiter: finale Berechnung im Admin-Plugin (Länge, Breite, Lagen, Produkt)
        │
        ├─► Bemessungs-PDF                (wie bisher)
        │
        └─► FloodProofService             (NEU, nur wenn Bedingungen aus 1. erfüllt)
              1. Flächen → A_Dach, A_FaG, A_ges, Σ A·C_s
              2. Jährlichkeit: rainFrequency > 10 → T = 100, sonst T = 30
              3. Regendaten r(D,2) + r(D,T) aus DB (rcIndex)
              4. V_Rück(D) je Dauerstufe → Maximum
              5. V_vorh = L · B · H · s_R (+ Mulde)
              6. erfüllt, wenn V_vorh ≥ max V_Rück
              7. Ergebnis speichern + PDF „Überflutungsnachweis“ erzeugen
```

Im Paket liegen dazu:
- `Classes/Service/FloodProof/FloodProofCalculator.php` – die fertige Rechenklasse, getestet.
- `tests/example.php` – Abnahmetests mit Handrechnung.
- `Muster_Ueberflutungsnachweis_T30.pdf` und `…_T100.pdf` – Layout-Vorlage für das PDF-Template.

---

## 1. WANN wird der Nachweis gerechnet? (Gating)

Alle Bedingungen müssen erfüllt sein:

| # | Bedingung | Variable (Formular-Namespace `tx_iggrafinfiltration_configurator[configuration][…]`) | Wert |
|---|---|---|---|
| 1 | Objektland Deutschland | `country` | `1` |
| 2 | Richtlinie DWA-A 138-1 | `newGuideline` | `1` (`0` = alte DWA-A 138 → **kein** Nachweis) |
| 3 | Entwässerungsart Rigole oder Mulden-Rigole | `infiltrationType` | `1` = Rigole, `2` = Mulden-Rigole (`3` = Retentionszisterne → **kein** Nachweis) |
| 4 | Checkbox im Admin aktiv | **NEU** `floodProofEnabled` | `1` |

Für die Checkbox (Nr. 4) gilt:
- Sie wird im Admin **vorbelegt**: an, wenn `A_ges > 800 m²`, sonst aus.
- Der Mitarbeiter kann sie immer manuell setzen.
- Ab 800 m² ist der Nachweis nach DIN 1986-100 Pflicht. In dem Fall erscheint ein Warnhinweis, wenn er abgewählt wird.

**Zeitpunkt:** Gerechnet wird **nach** der finalen Berechnung im Admin, also wenn Länge, Breite, Höhe und Produkt feststehen, und **vor** der PDF-Erzeugung. Neu gerechnet wird bei jeder neuen Berechnung bzw. jedem Speichern im Admin.

---

## 2. WO kommen die Werte her? (Datenfluss je Variable)

### 2.1 Aus dem Kunden-Formular (existiert schon)

| Variable im Formular | Bedeutung | Nutzung im Nachweis |
|---|---|---|
| `country` | Objektland (1 = DE, 3 = CH, 4 = BE, 5 = NL, 6 = LU) | Gating |
| `newGuideline` | 1 = DWA-A 138-1, 0 = DWA-A 138 | Gating |
| `infiltrationType` | 1 = Rigole, 2 = Mulden-Rigole, 3 = Retentionszisterne | Gating, Muldenvolumen |
| `products[]` | gewähltes Produkt (z. B. EcoBloc Inspect 420) | Speicherkoeffizient s_R, Blockhöhe |
| `surfaceValue[n][surfacetype]` | UID der Flächenart (siehe 2.2) | **C_s** und Dach/FaG-Zuordnung |
| `surfaceValue[n][area]` | Fläche in m² | A_i |
| `surfaceValue[n][cmCustom]` | C_m bei „Manuell“ | (nicht für den Nachweis) |
| `surfaceValue[n][surfaceCustom]` | Bezeichnung bei „Manuell“ | Name in der PDF |
| `surfaceValue[n][areacategorization]` | Belastungskategorie I/II/III | nicht nötig |
| `surfaceCategory[n]` | Kategorie 1–7 / `manual` – **liegt außerhalb `configuration`, wird evtl. nicht gespeichert** | → Kategorie serverseitig über die surfacetype-UID ermitteln (2.2) |
| `ki` | bemessungsrelevante Infiltrationsrate [m/s] | nur PDF-Info (Versickerung wird im Nachweis nicht abgezogen, siehe 10.) |
| `rainFrequency` | gewählte Regenhäufigkeit in Jahren: 1, 2, 3, 5, 10, 15, 20, 30, 50, 100 | **Entscheidet T = 30 oder T = 100** (Regel 3.1) |
| `rcIndex` | KOSTRA-Rasterfeld, z. B. `206112` = Zeile 206, Spalte 112 | Regendaten-Lookup |
| `propertyName`, `street`, `propertyZip`, `propertyCity` | Objektdaten | PDF-Kopf |
| `availableLength`, `availableWidth` | **verfügbare** Fläche des Kunden | nur Plausibilität. Für die Rechnung zählt die **finale** Geometrie (2.4). |

### 2.2 Flächenarten → C_s und Dach/FaG (existiert schon im Frontend)

C_s ist schon vorhanden. Die Daten kommen aus der DB und werden als `data-surface-types-map` an `#areaGuideline1381` gerendert. Die Werte unten sind 1:1 aus dem Live-System ausgelesen.

**Zuordnung:** Kategorie 1–3 → **Dach (A_Dach)**. Kategorie 4–7 → **außerhalb von Gebäuden (A_FaG)**.

| Kat. | Kategorie | UID | Flächenart | C_m | **C_s** | Gruppe |
|---|---|---|---|---|---|---|
| 1 | Dachflächen (Schrägdach) | 1 | Metall, Glas, Schiefer, Faserzement | 0,9 | 1,0 | Dach |
| 1 | | 2 | Ziegel, Abdichtungsbahnen | 0,9 | 1,0 | Dach |
| 2 | Flachdach (≤ 3° / 5 %) | 3 | Metall, Glas, Faserzement | 0,9 | 1,0 | Dach |
| 2 | | 4 | Abdichtungsbahnen | 0,9 | 1,0 | Dach |
| 2 | | 5 | Kiesschüttung | 0,8 | 0,8 | Dach |
| 3 | Dachflächen (begrünt) | 6 | Extensivbegrünung (> 5°) | 0,4 | 0,7 | Dach |
| 3 | | 7 | Intensivbegrünung ≥ 30 cm | 0,1 | 0,2 | Dach |
| 3 | | 8 | Extensivbegrünung ≥ 10 cm (≤ 5°) | 0,2 | 0,4 | Dach |
| 3 | | 9 | Extensivbegrünung < 10 cm (≤ 5°) | 0,3 | 0,5 | Dach |
| 4 | Undurchlässige Verkehrsflächen | 10 | Betonflächen | 0,9 | 1,0 | FaG |
| 4 | | 11 | Schwarzdecken (Asphalt) | 0,9 | 1,0 | FaG |
| 4 | | 12 | Pflaster mit Fugendichtung | 0,8 | 1,0 | FaG |
| 4 | | 13 | Gleisanlage, feste Fahrbahn | 0,9 | 1,0 | FaG |
| 4 | | 14 | Rampen mit Neigung zum Gebäude | 1,0 | 1,0 | FaG ⚠ siehe 10. |
| 4 | | 15 | Kunststoffflächen Sportplätze | 0,5 | 1,0 | FaG |
| 5 | Teildurchlässige Verkehrsflächen | 16 | Betonsteinpflaster in Sand/Schlacke, Platten | 0,7 | 0,9 | FaG |
| 5 | | 17 | Pflaster Fugenanteil > 15 %, fester Kiesbelag | 0,6 | 0,7 | FaG |
| 5 | | 18 | Wassergebundene Flächen | 0,7 | 0,9 | FaG |
| 5 | | 19 | Lockerer Kiesbelag, Schotterrasen | 0,2 | 0,3 | FaG |
| 5 | | 20 | Verbundsteine mit Sickerfugen, Sickersteine | 0,25 | 0,4 | FaG |
| 5 | | 21 | Rasengitter, häufig befahren | 0,2 | 0,4 | FaG |
| 5 | | 22 | Rasengitter, selten befahren | 0,1 | 0,2 | FaG |
| 5 | | 23 | Gleis, Schotter, durchlässiger Unterbau | 0,1 | 0,2 | FaG |
| 5 | | 24 | Gleis, Schotter, schwach durchlässig | 0,4 | 0,6 | FaG |
| 6 | Sportflächen mit Dränung | 25 | Kunststoff-Flächen, Kunststoffrasen | 0,1 | 0,1 | FaG |
| 6 | | 26 | Tennenflächen | 0,3 | 0,3 | FaG |
| 6 | | 27 | Rasenflächen | 0,1 | 0,1 | FaG |
| 7 | Parkanlagen, Rasen, Gärten | 28 | flaches Gelände | 0,1 | 0,2 | FaG |
| 7 | | 29 | steiles Gelände | 0,2 | 0,3 | FaG |
| 7 | | 30 | dauerhaft eingestaute Wasserflächen | 1,0 | 1,0 | FaG |
| manual | Manuell | – | freie Eingabe | `cmCustom` | **fehlt → NEU `csCustom`** | **NEU `isRoofCustom`** |

**Implementierung:**
- Serverseitig **nicht** die Tabelle oben hart codieren, sondern das gleiche Repository nutzen, das die `surfaceTypesMap` rendert. Dort steht `cs` schon.
- Die Kategorie einer Zeile über die surfacetype-UID → Kategorie ermitteln. Dach heißt Kategorie ∈ {1, 2, 3}, siehe `FloodProofCalculator::ROOF_CATEGORIES`.

### 2.3 Regendaten (existiert schon, nur erweitern)

- `checkWeatherStation` (Ajax, typeNum 3500) liefert für die PLZ den `rcIndex`. Beispiel: 79098 → `206112`.
- Die Regenwerte selbst liegen **nur in der DB**. Im Frontend gibt es nur die Rastergeometrie (`KOSTRADWD2020Raster_1.js`).
- **Benötigt:** r(D,T) in l/(s·ha) für das Rasterfeld `rcIndex`, mit
  - T = **2** (immer, für den Abzugsterm),
  - T = **30** oder **100** (je nach Regel 3.1),
  - D = Dauerstufen aus 3.3 (Standard 5, 10, 15 min).
- Weil man im Konfigurator schon 1 bis 100 Jahre auswählen kann, sollten T = 2/30/100 in der Tabelle vorhanden sein. **Bitte prüfen.**
- Falls die DB die Niederschlagshöhe hN in mm speichert statt rN: umrechnen mit `r = hN · 10000 / (D · 60)`. Fertig als `FloodProofCalculator::rainIntensityFromDepth()`.
- Übergabeformat an den Rechner: `$rain[T][D] = r` (float).

### 2.4 Finale Geometrie (Admin, nach der Berechnung durch den Mitarbeiter)

**Achtung, zwei verschiedene Längen/Breiten:**

| Variable | Bedeutung | Für den Nachweis |
|---|---|---|
| `configuration[availableLength]` / `[availableWidth]` | **verfügbarer Platz** auf dem Grundstück (Kundeneingabe, Obergrenze). Validierung im JS: Länge ≥ Breite | ❌ **nicht** zum Rechnen. Nur als Grenze für den Vergrößerungsvorschlag |
| L_R / B_R | **tatsächliche Rigole** aus der finalen Bemessung | ✅ damit wird V_vorh gerechnet |

Die Rigole wird in **Blöcken** gebaut. Das Articletool (`Articletool.js` → Ajax `Articletool->calculate`) zeigt, welche Größen es im Backend gibt. Die finale Bemessung arbeitet sehr wahrscheinlich mit denselben Größen, **im PHP-Code prüfen**:

| Größe | Herkunft | Einheit |
|---|---|---|
| `blocksLength` | Anzahl Blöcke in Länge (Ergebnis der Bemessung) | Stück |
| `blocksWidth` | Anzahl Blöcke in Breite (Ergebnis der Bemessung) | Stück |
| `layers` | Anzahl Lagen (Ergebnis der Bemessung) | Stück |
| `extraBloc` | zusätzliche halbe Lage, 0/1 | – |
| `blocLength` | Produktdatensatz (`articletooldata[uid]`) | m |
| `blocWidth` | Produktdatensatz | m |
| `displayBlocHeight` | Produktdatensatz, Höhe je Lage | m |
| `extraBlocHeight` | Produktdatensatz, Höhe halbe Lage | m |
| `basePlateHeight` | Produktdatensatz, Bodenplatte | m |
| `maxLayers`, `isTunnel`, `hasExtraBloc` | Produktdatensatz | – |

Daraus ergibt sich die Geometrie der Rigole:

```
L_R = blocksLength · blocLength                                   [m]
B_R = blocksWidth  · blocWidth                                    [m]
H_R = layers · displayBlocHeight + extraBloc · extraBlocHeight    [m]   (ohne Bodenplatte = Speicherhöhe)
H_Einbau = H_R + basePlateHeight                                  [m]   (nur Anzeige in der PDF)
V_vorh = L_R · B_R · H_R · s_R  +  V_M                            [m³]
```

| Symbol | Bedeutung | Quelle |
|---|---|---|
| s_R | Speicherkoeffizient [-] | Produktdatensatz (EcoBloc ≈ 0,95) |
| V_M | Muldenvolumen [m³] | nur bei `infiltrationType = 2`, aus der Mulden-Berechnung |

**Reihenfolge, woher V_vorh kommt:**
1. Wenn die finale Bemessung schon ein **vorhandenes Speichervolumen** liefert, **dieses verwenden**. Dann stimmt die Zahl in beiden PDFs überein.
2. Sonst aus den Blöcken mit der Formel oben rechnen.
3. **Sicker-Tunnel (`isTunnel`)** ist kein Quader. Hier gilt Anzahl Tunnel × Nettovolumen je Tunnel aus dem Produktdatensatz statt L·B·H·s_R.

**Vergrößerungsvorschlag bei „nicht erfüllt“ (optional, hilft dem Vertrieb):**

```
Fehlmenge     = max V_Rück − V_vorh
V_je_Reihe    = blocLength · B_R · H_R · s_R          (eine zusätzliche Blockreihe in Länge)
zusätzl_Reihen = ceil(Fehlmenge / V_je_Reihe)
neue Länge    = L_R + zusätzl_Reihen · blocLength      → nur vorschlagen, wenn ≤ availableLength
                sonst: eine Lage mehr prüfen (layers + 1 ≤ maxLayers), sonst Hinweis „Rücksprache Technik“
```

Für die PDF und das JSON zusätzlich speichern: `rigoleLength`, `rigoleWidth`, `rigoleHeight`, `blocksLength`, `blocksWidth`, `layers`, `extraBloc`, `storageCoefficient`, `storageVolume`.

---

## 3. Regeln

### 3.1 Jährlichkeit des Nachweis-Regens (wichtig)

```
WENN rainFrequency > 10   → T = 100  (100-jährlicher Regen)
SONST                     → T = 30   (30-jährlicher Regen)
```

| gewählt (`rainFrequency`) | 1 | 2 | 3 | 5 | 10 | 15 | 20 | 30 | 50 | 100 |
|---|---|---|---|---|---|---|---|---|---|---|
| Nachweis mit T = | 30 | 30 | 30 | 30 | 30 | **100** | **100** | **100** | **100** | **100** |

Der Abzugsterm verwendet **immer** r(D,2). Die Regel ist umgesetzt in `FloodProofCalculator::determineReturnPeriod()`.

> ⚠ **Sonderfall Mulden-Rigole (VSO-489):**
> - Bei DE + Mulden-Rigole + 138-1 ist `#rainFrequency` im Formular **gesperrt** und wird **nicht gesendet**. Die MuRi-138-1-Bemessung rechnet laut Code-Kommentar mit festen Regenhäufigkeiten.
> - Ohne Wert gilt im Nachweis der Fallback **T = 30**: `determineReturnPeriod(null)` liefert 30.
> - **Klären:** Mit welcher Jährlichkeit rechnet die MuRi-138-1-Bemessung intern? Liegt sie über 10 Jahren, muss dieser Wert übergeben werden statt `null`.

### 3.2 Flächen

- **A_Dach** = Σ Flächen der Kategorien 1–3, plus Manuell mit `isRoofCustom = 1`.
- **A_FaG** = Σ aller anderen angeschlossenen Flächen.
- **A_ges** = A_Dach + A_FaG. Der Mitarbeiter kann den Wert im Admin überschreiben (**NEU** `floodProofTotalArea`), z. B. wenn es auf dem Grundstück weitere befestigte Flächen gibt, die nicht an die Rigole angeschlossen sind.
- **Pflicht** ab A_ges > 800 m² (`FloodProofCalculator::MANDATORY_AREA_THRESHOLD`).

### 3.3 Dauerstufen

Standard sind **D = 5, 10, 15 min** (DIN 1986-100). Die Liste wird über TypoScript/Settings konfigurierbar gemacht:

```typoscript
plugin.tx_iggrafinfiltration.settings.floodProof.durations = 5,10,15
```

Maßgebend ist das **Maximum** über alle D.

---

## 4. Formel (DIN 1986-100, Gl. 20)

```
V_Rück(D) = [ r(D,T) · A_ges − r(D,2) · (A_Dach · C_s,Dach + A_FaG · C_s,FaG) ] · D · 60 / 10 000 000      [m³]

  r  in l/(s·ha)   ·   A in m²   ·   D in min
  A_Dach · C_s,Dach  =  Σ (A_i · C_s,i)  über alle Dachzeilen
  A_FaG  · C_s,FaG   =  Σ (A_i · C_s,i)  über alle anderen Zeilen
  negative Werte → 0

max V_Rück = Maximum über alle D       →   maßgebende Dauer D_max
Nachweis erfüllt  ⇔  V_vorh ≥ max V_Rück
Auslastung        =  max V_Rück / V_vorh
Reserve/Fehlmenge =  V_vorh − max V_Rück
```

### Weitere Gleichungen der DIN 1986-100 (nicht Teil dieser Umsetzung)

| Gl. | Formel | Stand |
|---|---|---|
| 19 | **unbekannt** | In den geprüften Quellen (Merkblätter Bielefeld, Gütersloh, Oestrich-Winkel, Ibbenbüren, REHAU-Folien) nicht enthalten, dort beginnt die Nummerierung bei Gl. 20. Die Norm selbst lag nicht vor. Formel bitte aus der Norm nennen (offener Punkt 10) |
| 21 | `V_Rück = [ r(D,T)·A_ges / 10 000 − Q_voll ] · D·60 / 1000` | Q_voll = Abfluss der Grundleitung bei Vollfüllung (DIN 1986-100 Tab. A.5), liegt im VSO nicht vor. Laut Merkblättern werden ohne Einleitbeschränkung Gl. 20 **und** 21 gerechnet, der größere Wert gilt (offener Punkt 11). Merkblatt Ibbenbüren: größtes Ergebnis aus Gl. 20, 21 und 22; Gl. 21 nur bei Leitungen nach DWA-A 118 Tab. 4. Das Prüfwerkzeug rechnet Gl. 21 optional mit |
| 22 | `V_RRR = A_u·r(D,T)/10 000·D·f_Z·0,06 − D·f_Z·Q_Dr·0,06` | Nur bei Einleitbeschränkung (Regenrückhalteraum), A_u = Σ A·C_m, f_Z = 1,15, D bis 4320 min. Das Prüfwerkzeug prüft nur die Eingangsgrößen (offener Punkt 12) |


### Rechenbeispiel (Beispielwerte, keine echten KOSTRA-Daten)

Eingaben:
- 600 m² Schrägdach Ziegel (C_s 1,0) und 350 m² Betonsteinpflaster in Sand (C_s 0,9).
- A_ges = 950 m², Σ A·C_s = 915 m².
- Rigole 8,0 × 2,4 × 0,84 m, s_R 0,95 → V_vorh = 15,32 m³.

| rainFrequency | T | D | r(D,2) | r(D,T) | V_Rück |
|---|---|---|---|---|---|
| 5 | 30 | 5 | 255 | 480 | 6,68 m³ |
| 5 | 30 | 10 | 175 | 340 | 9,77 m³ |
| 5 | 30 | **15** | 138 | 270 | **11,72 m³ → erfüllt (76 %)** |
| 20 | 100 | **15** | 138 | 330 | **16,85 m³ → nicht erfüllt (110 %)** |

Handrechnung für D = 15, T = 30: `(270 · 950 − 138 · 915) · 900 / 10⁷ = 11,72 m³`

---

## 5. Neue Felder / Datenbank

Tabellennamen im Code prüfen. Vermutlich ist es `tx_iggrafinfiltration_domain_model_configuration`, und die Flächenzeilen liegen dort, wo heute `cmCustom` gespeichert wird.

```sql
-- ext_tables.sql
CREATE TABLE tx_iggrafinfiltration_domain_model_configuration (
    flood_proof_enabled       tinyint(1) unsigned DEFAULT '0' NOT NULL,
    flood_proof_total_area    double(11,2) DEFAULT NULL,           -- A_ges Override, NULL = Summe
    flood_proof_return_period smallint(5) unsigned DEFAULT '0' NOT NULL, -- 30 | 100 (berechnet)
    flood_proof_volume_req    double(11,3) DEFAULT '0' NOT NULL,    -- max V_Rück [m³]
    flood_proof_volume_avail  double(11,3) DEFAULT '0' NOT NULL,    -- V_vorh [m³]
    flood_proof_passed        tinyint(1) unsigned DEFAULT '0' NOT NULL,
    flood_proof_result        mediumtext,                           -- komplettes Ergebnis-Array als JSON (für PDF)
    flood_proof_calculated_at int(11) unsigned DEFAULT '0' NOT NULL
);

-- Flächenzeilen (nur für Kategorie "manual")
--   cs_custom       double(4,2) DEFAULT NULL
--   is_roof_custom  tinyint(1) unsigned DEFAULT '0' NOT NULL
```

Außerdem nötig:
- **Model:** Getter und Setter für die Felder oben, plus TCA-Einträge, damit der Mitarbeiter sie im Backend sieht.
- **Validierung:** `floodProofTotalArea` ≥ Σ angeschlossene Flächen. Ist er kleiner, Warnung anzeigen.

---

## 6. Admin-Plugin (Mitarbeiter, typeNum 3510)

Im Bereich der finalen Berechnung kommt ein neuer Block **„Überflutungsnachweis DIN 1986-100“** dazu. Er ist nur sichtbar, wenn die Bedingungen 1–3 aus Abschnitt 1 erfüllt sind.

| Element | Typ | Verhalten |
|---|---|---|
| Überflutungsnachweis erstellen | Checkbox `floodProofEnabled` | vorbelegt mit `A_ges > 800` |
| Hinweis „Pflicht ab 800 m²“ | Text | rot, wenn A_ges > 800 und die Checkbox aus ist |
| Befestigte Gesamtfläche A_ges | Zahl `floodProofTotalArea` | Placeholder = Summe der Flächen |
| Nachweis-Regen | nur Anzeige | „30-jährlich“ / „100-jährlich (Regenhäufigkeit > 10 Jahre)“ |
| Ergebnis | nur Anzeige nach dem Rechnen | erforderlich / vorhanden / erfüllt-Badge |
| PDF Überflutungsnachweis | Link | wie der Link zur Bemessungs-PDF |

Wenn der Nachweis **nicht erfüllt** ist:
- deutlichen roten Hinweis anzeigen: „Rigole vergrößern“.
- Die PDF wird trotzdem erzeugt, mit dem Status „nicht erfüllt“, damit der Vertrieb das sieht.

---

## 7. Service und Integration

```
Classes/Service/FloodProof/FloodProofCalculator.php   ← fertig (reine Mathematik, im Paket)
Classes/Service/FloodProof/FloodProofService.php      ← NEU (TYPO3-Glue: Daten holen, rechnen, speichern)
```

```php
// FloodProofService::process(Configuration $c, FinalCalculationResult $final): ?array
if (!$this->isApplicable($c) || !$c->isFloodProofEnabled()) {
    return null;                                   // Gating aus Abschnitt 1
}

$areas = [];
foreach ($c->getSurfaceValues() as $sv) {          // Flächenzeilen
    $type  = $this->surfaceTypeRepository->findByUid($sv->getSurfacetype()); // liefert cs + Kategorie
    $areas[] = [
        'name'   => $sv->isManual() ? $sv->getSurfaceCustom() : $type->getCategoryName() . ' – ' . $type->getName(),
        'area'   => (float)$sv->getArea(),
        'cs'     => $sv->isManual() ? (float)$sv->getCsCustom() : (float)$type->getCs(),
        'isRoof' => $sv->isManual() ? $sv->isRoofCustom() : in_array($type->getCategory(), [1, 2, 3], true),
    ];
}

$T     = FloodProofCalculator::determineReturnPeriod((int)$c->getRainFrequency());
$rain  = $this->rainDataRepository->findRainIntensities(   // bestehendes Regendaten-Repo erweitern
    $c->getRcIndex(), [2, $T], $this->settings['floodProof']['durations']
);                                                          // → [T => [D => r]]

$vAvail = $final->getStorageVolume()                        // wenn vorhanden, sonst:
    ?? FloodProofCalculator::storageVolume($final->getLength(), $final->getWidth(),
                                           $final->getHeight(), $product->getStorageCoefficient(),
                                           $final->getSwaleVolume() ?? 0.0);

$result = (new FloodProofCalculator())->calculate(
    $areas, $rain, (int)$c->getRainFrequency(), $vAvail, $c->getFloodProofTotalArea(), $durations
);

$c->setFloodProofReturnPeriod($result['returnPeriod']);
$c->setFloodProofVolumeReq($result['vRueckMax']);
$c->setFloodProofVolumeAvail($result['storageVolume']);
$c->setFloodProofPassed($result['passed']);
$c->setFloodProofResult(json_encode($result));
$c->setFloodProofCalculatedAt(time());
// persistieren → danach PDF erzeugen (Abschnitt 8)
return $result;
```

**Aufruf:** Im Admin-Controller direkt nach der bestehenden finalen Berechnung und **vor** dem Bauen der PDFs. Den Service per DI injizieren (`Configuration/Services.yaml`).

**Fehlerfälle** (wirft der Rechner als Exception):
- Regendaten fehlen für T/D → Meldung im Admin: „Regendaten für Rasterfeld X unvollständig“. Es wird keine PDF erzeugt.
- C_s außerhalb von 0 bis 1 → Validierungsfehler.

---

## 8. PDF „Überflutungsnachweis“

**Technik:**
- Gleiche Library, gleiches Layout, gleicher Header und Footer wie die bestehende Bemessungs-PDF. Am besten ein neues Fluid-Template, das die bestehenden Partials benutzt.
- **Dateiname:** `Ueberflutungsnachweis_<Anfragenummer>.pdf`
- **Versand/Ablage:** genau dort, wo heute die Bemessungs-PDF hingeht (Admin-Link, Mail an den Vertrieb). Als **zusätzliche** Datei, die Bemessungs-PDF bleibt unverändert.

**Inhalt** (Vorlage: `Muster_Ueberflutungsnachweis_T30.pdf` / `_T100.pdf`; Ziel: der Vertrieb sieht in 5 Sekunden, ob es passt):

1. **Ergebnisbox oben:**
   - ✓ erfüllt (grün) oder ✗ nicht erfüllt (rot).
   - Ein Satz Klartext. Bei „nicht erfüllt“ steht dort die Fehlmenge in m³ und „Anlage vergrößern“.
   - Drei große Zahlen: erforderlich / vorhanden / Auslastung %.
   - Auslastungsbalken.
2. **Eckdaten** (zwei Spalten):
   - links: Entwässerungsart, Produkt, L × B × H, s_R
   - rechts: Regendaten (KOSTRA-DWD-2020 + Rasterfeld), gewählte Regenhäufigkeit, Nachweis-Regen (30/100), A_ges
   - darunter klein die Begründung der Jährlichkeit und Pflicht ja/nein (800 m²)
3. **Flächentabelle:** Fläche, Dach / außerhalb Gebäude, A, C_s, A·C_s, Summe
4. **Tabelle je Regendauer:** D, r(D,2), r(D,T), Zufluss, Ableitung, V_Rück. Die maßgebende Zeile ist gelb hinterlegt.
5. **Rechenweg** (Formel in einer Zeile) und Hinweis: „keine zusätzlichen Überflutungsflächen angesetzt“, „Versickerung während des Ereignisses nicht berücksichtigt“, Haftungshinweis wie in der Bemessungs-PDF.
6. **Bearbeiter und Datum.**

Alle Werte stehen im JSON aus `flood_proof_result`, die Keys sind die gleichen wie im Rückgabe-Array von `calculate()`. Zahlen deutsch formatieren: Komma, 2 Nachkommastellen für m³, 0 für m².

---

## 9. Kunden-Frontend (minimal)

Nur bei Flächenkategorie **„Manuell“** im 138-1-Block (`#areaGuideline1381`) kommen zwei Felder dazu:
- `surfaceValue[n][csCustom]`: Select 0,1 … 1,0, Label „Spitzenabflussbeiwert C_s“
- `surfaceValue[n][isRoofCustom]`: Checkbox „Dachfläche“

Was dafür zu tun ist:
- **JS** (`AreaManagerNew`): Die Felder nur bei `manual` einblenden, analog zu `cmCustom`. Validierung: `cs ≥ cm`.
- Alles andere bleibt für den Kunden unverändert. Der Nachweis ist reine Mitarbeiter-/Vertriebssache.

---

## 10. Offene Punkte – mit der Excel abgleichen, bevor live geschaltet wird

1. **Vergleichsvolumen:** Umgesetzt ist `V_vorh` (Gesamtvolumen der Anlage) ≥ max V_Rück. Falls die Excel stattdessen nur die **Reserve** gegen V_Rück prüft (`V_vorh − V_erf,Bemessung`), muss Zeile `$passed = …` in `FloodProofCalculator::calculate()` angepasst werden.
2. **Dauerstufen:** Rechnet die Excel nur 5/10/15 min oder mehr? Die Werte gehören in die Settings (3.3).
3. **Grünflächen (Kategorie 7):** Sie zählen aktuell zu A_FaG bzw. A_ges, das ist konservativ. Falls die Excel sie rauslässt: Kategorie 7 bei A_ges ausnehmen.
4. **Rampen zum Gebäude (UID 14):** Laut DIN gesondert zu betrachten. Aktuell nur normal mitgerechnet. Vorschlag: Hinweiszeile in der PDF, wenn UID 14 vorkommt.
5. **Versickerung während des Ereignisses:** Wird bewusst nicht abgezogen, das liegt auf der sicheren Seite. Falls die Excel sie abzieht: `k_i` ist vorhanden, der Abzug lässt sich ergänzen.
6. **Zusätzliche Regel nach DIN** (> 70 % Dach bzw. nicht schadlos überflutbare Flächen → 100-jährlich): Ist **nicht** umgesetzt. Es gilt nur die Regel aus 3.1. Bei Bedarf als zusätzliche ODER-Bedingung in `determineReturnPeriod()` ergänzen.
7. **Mulden-Rigole ohne `rainFrequency`** (VSO-489): Welche Jährlichkeit nutzt die MuRi-138-1-Bemessung? Siehe Hinweis in 3.1.
8. **C_s kommt nicht vom Client:** Das Frontend lädt C_s zwar (`surfaceTypesMap`), schickt es aber nicht mit (Code in `AreaManagerNew.js` auskommentiert). Der Server muss C_s über die `surfacetype`-UID aus der DB lesen.
9. **Gleichung 19:** Wie lautet die Formel, und gehört sie zum Nachweis? Siehe Abschnitt 4 (weitere Gleichungen).
10. **Gl. 20 und Gl. 21:** Laut Merkblättern Bielefeld und Gütersloh werden ohne Einleitbeschränkung beide gerechnet, der größere V_Rück gilt. Macht die Excel das auch? Dieses Ticket rechnet nur Gl. 20. Q_voll liegt im VSO nicht vor.
11. **Gleichung 22:** nur bei Einleitbeschränkung, braucht Q_Dr (vermutlich `permittedDischarge`), A_u und Regenspenden bis 4320 min. Nicht Teil des Tickets.

**Vorgehen:** 2–3 echte Altfälle durch Excel **und** System rechnen. Die Ergebnisse müssen auf ±0,01 m³ übereinstimmen.

---

## 11. Abnahmetests

| # | Fall | Erwartung |
|---|---|---|
| 1 | `newGuideline = 0` | kein Block im Admin, keine PDF |
| 2 | `infiltrationType = 3` | kein Block im Admin, keine PDF |
| 3 | `country ≠ 1` | kein Block im Admin, keine PDF |
| 4 | A_ges = 750 m² | Checkbox aus, Nachweis aktivierbar, PDF zeigt „freiwillig“ |
| 5 | A_ges = 950 m², `rainFrequency = 10` | T = 30 |
| 6 | dito, `rainFrequency = 15` | **T = 100** |
| 7 | Beispiel aus Abschnitt 4 | 11,72 m³ / 15,32 m³ / erfüllt / 76 % |
| 8 | dito mit `rainFrequency = 20` | 16,85 m³ / nicht erfüllt / Fehlmenge 1,53 m³ |
| 9 | Fläche „Manuell“ ohne `csCustom` | Validierungsfehler |
| 10 | Rasterfeld ohne T = 100 | Fehlermeldung im Admin, keine PDF |
| 11 | Mulden-Rigole | V_vorh enthält das Muldenvolumen |

Fälle 7 und 8 sind in `tests/example.php` automatisiert (`php tests/example.php` → „OK (11 Checks)“).

---

## Quellen

- DIN 1986-100, Gl. 20/21, Grenzwert 800 m², Dauerstufen 5/10/15 min: [Merkblatt Stadt Bielefeld zum Überflutungsnachweis (2025)](https://www.bielefeld.de/sites/default/files/datei/2025/Merkblatt-zum-Ueberflutungsnachweis-nach-DIN-1986-100_2025.pdf)
- Variablen, Flächenarten mit C_m/C_s, Ajax-Endpunkte: ausgelesen aus dem Live-System [versickerung.graf.digital](https://versickerung.graf.digital/) am 07.10.2026

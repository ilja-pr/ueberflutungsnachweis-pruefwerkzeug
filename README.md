# Überflutungsnachweis · Prüfwerkzeug

Next.js-Projekt (App Router, React, TypeScript) zum Überflutungsnachweis nach DIN 1986-100 für den GRAF-Versickerungskonfigurator (VSO).
Es rechnet genau so, wie der Nachweis später im VSO rechnen soll, damit man die Excel der Fachabteilung dagegenprüfen kann, bevor entwickelt wird.

Gilt nur für: Deutschland, DWA-A 138-1, Rigole und Mulden-Rigole, Rückhaltung ausschließlich in der Rigole.

## Starten

```bash
npm install
npm run dev            # Entwicklung, http://localhost:3000
npm test               # 82 Unit-Tests (Rechenkern, Import, Prüfung)
npm run typecheck      # TypeScript inkl. ungenutzter Variablen
npm run build          # statischer Export nach out/ (auf jeden Webserver legen)
npm run serve          # out/ lokal ansehen: http://127.0.0.1:4173/
npm run e2e            # Rauchtest im echten Browser (siehe unten)
```

Node 20.9 oder neuer. Es gibt keinen Next-Server und keine API: `next.config.ts` stellt auf `output: 'export'`. Alles (auch das Lesen der PDF) läuft im Browser, nichts wird hochgeladen. Liegt die Seite in einem Unterpfad, vor dem Build `NEXT_PUBLIC_BASE_PATH=/pfad` setzen. Eine einzelne HTML-Datei zum Doppelklicken gibt es in dieser Version nicht mehr: `out/` braucht einen Webserver (`npm run serve` reicht).

## Die Tabs

| Tab | Was man damit macht |
|---|---|
| **Rechner** (`/`) | Flächen, Regendaten und Rigole eingeben. Ergebnis (erfüllt / nicht erfüllt), Tabelle je Regendauer, Vergleich T = 30 / 100, Rechenweg mit Zahlen, Abgleich mit der Excel (±0,01 m³). Optional Gleichung 21 über das Feld Q_voll |
| **Ausgabe** (`/ausgabe`) | Einzelne Teile ausgeben: Ergebnisbox, Eckdaten, Flächen, Regendaten, Rückhaltevolumen je Dauer, Vergleich, Rechenweg, Annahmen. Je Baustein als HTML, Text, „Für Excel“ (einfügen) oder CSV. Auswahl als ein HTML-Bericht (enthält die Eingaben unsichtbar, im Rechner wieder ladbar). Rohdaten als JSON |
| **VSO-Import & Prüfung** (`/import`) | Das laden, was aus dem VSO kommt (PDF, JSON, Formulardaten, kopierter Text). Das Werkzeug erkennt die Werte und prüft pro Gleichung 19 / 20 / 21 / 22, was fehlt und woher man es bekommt. Werte lassen sich korrigieren und ergänzen. „In den Rechner übernehmen“ rechnet damit weiter. „Fehlende Angaben kopieren“ liefert eine Liste für Mail oder Ticket |
| **So wird gerechnet** (`/erklaerung`) | Formeln und Regeln in Worten |
| **Projekt & Variablen** (`/projekt`) | Worum es geht, welche VSO-Variable was bringt, was neu gebaut werden muss, offene Punkte |
| **Einbauen** (`/einbauen`) | Acht Schritte für den Einbau in die TYPO3-Extension, mit Code zum Kopieren |
| **Flächenarten** (`/flaechen`) | Die 30 Flächenarten mit C_m und C_s |

## Der Import-Tab

Er versteht diese Eingaben:

1. **PDF** (wird im Browser gelesen, nichts wird hochgeladen).
2. **Formulardaten**: `configuration[surfaceValue][0][area]=600` zeilenweise, mit `&` getrennt (auch URL-codiert) oder als `Schlüssel: Wert` (DevTools-Ansicht).
3. **JSON** mit den VSO-Feldnamen (`surfaceValue`, `rainFrequency`, `rcIndex` …).
4. **Text mit Beschriftungen**, z. B. `Regenhäufigkeit: 5 Jahre`, `Rigolenlänge: 8,00 m`, Flächenarten über ihren Namen aus dem Katalog, Regentabellen (T oder D in den Spalten, auch Spaltenköpfe `r(D,2)`, auch Niederschlagshöhe hN in mm).
5. **Eigene Dateien** dieses Werkzeugs (Eingaben-JSON, HTML-Bericht).

Pro Feld gilt der Fund mit der höchsten Priorität: manuell > Prüfwerkzeug > JSON / Formularschlüssel > Beschriftung > Katalog. Widersprüchliche Funde werden angezeigt. C_s und „Dach / außerhalb Gebäude“ kommen aus dem Flächenarten-Katalog, weil das Kundenformular sie nicht mitschickt.

**Wichtig:** Wie ein echter Export aus dem VSO aussieht, ist nicht bekannt. Die Beschriftungen sind begründete Annahmen und mit dem Muster-PDF getestet, nicht mit einem echten VSO-Dokument. Sobald eine echte Datei vorliegt, lassen sich die Regeln in einer Datei anpassen: `src/features/importCheck/extract/rules.ts`. Der Bereich „Gelesener Text“ am Ende der Seite zeigt, welche Zeilen erkannt wurden.

### Gleichungen

| Gl. | Stand |
|---|---|
| 19 | **Formel unbekannt.** In den geprüften Quellen nicht enthalten (Merkblätter Bielefeld, Gütersloh, Oestrich-Winkel, Ibbenbüren, REHAU-Folien), die Norm selbst lag nicht vor. Die Prüfung zeigt „Formel unbekannt“. Zum Ergänzen: Eingangsgrößen in `src/core/equations.ts`, Rechnung in `src/core/` |
| 20 | wird gerechnet (Rechner) |
| 21 | wird gerechnet, wenn Q_voll eingetragen ist. Q_voll steht nicht im VSO (DIN 1986-100 Tab. A.5, Grundleitung) |
| 22 | nur Prüfung der Eingangsgrößen (Q_Dr, A_u, Regenspenden bis 4320 min), keine Rechnung |

## Aufbau

```
src/
  core/                  Rechenkern ohne Oberfläche
    floodProof.ts        Gl. 20, 1:1-Port von FloodProofCalculator.php (+ Tests)
    gl21.ts              Gl. 21 (+ Tests)
    equations.ts         Welche Gleichung braucht welche Größe, woher kommt sie (reine Daten)
    surfaceTypes.ts      die 30 Flächenarten mit C_s, C_m
  features/
    calculator/          Rechner-Tab (compute.ts, explain.ts, inputs/, result/)
    output/              Ausgabe-Tab (sections.ts, htmlReport.ts)
    importCheck/         Import-Tab
      extract/           PDF-Text, Parser, Regeln (rules.ts)
      checkData.ts       Fundstellen zusammenführen (Priorität)
      evaluate.ts        Prüfung je Gleichung
      toInputs.ts        Übernahme in den Rechner
      components/        Oberfläche
    info/                Textseiten (Erklärung, Projekt, Einbauen, Flächenarten)
  shared/                Eingabefelder, Tabellen, Hilfsfunktionen
  app/                   Next.js-Routen: layout.tsx und pro Tab ein Ordner mit page.tsx
  shell/                 Rahmen (Navigation), Tabs, Providers, Zustand (Context)
  styles/                CSS, nach Bereichen getrennt
docs/                    Gesamtdokumentation mit Ticket (PDF), Spezifikation, Überblick,
                         PHP-Referenzklasse mit Tests (php docs/php/tests/example.php), Muster-PDFs
tests-data/              Muster-PDF und daraus gelesener Text (Testdaten für den Import)
scripts/serve.mjs        kleiner Server für out/ (npm run serve)
e2e/smoke.mjs            Rauchtest im Browser
```

Regeln für den Rechenkern: keine Abhängigkeit von React oder dem Browser, gleiche Funktionsnamen und Ergebnis-Schlüssel wie die PHP-Klasse. Was dort geändert wird, gehört auch in `docs/php`.

## Browser-Test (e2e)

```bash
npm run build
CHROMIUM_PATH=/pfad/zu/chrome npm run e2e          # startet out/ selbst; ohne CHROMIUM_PATH wird der installierte Chrome genutzt
npm run e2e -- http://localhost:3000/              # gegen npm run dev (localhost, nicht 127.0.0.1)
```

Der Test lädt das Muster-PDF, ergänzt und korrigiert Werte, übernimmt sie in den Rechner, lädt CSV und HTML-Bericht, prüft, dass die Eingaben nach dem Neuladen noch da sind, ruft alle Routen auf (auch mit 390 px Breite) und meldet Konsolenfehler, z. B. Hydration-Fehler.

Hinweis zum Aufbau: Der Zustand (Rechner-Eingaben, Import) liegt im Layout, nicht in den Seiten, und bleibt beim Wechsel der Tabs erhalten. Gemerkte Eingaben werden erst nach dem Laden im Browser eingelesen (`usePersistentState`), weil die Seite vorab ohne localStorage gerendert wird.

## Grenzen

- Beispielwerte (Regendaten, Produktmaße) sind erfunden, keine echten KOSTRA- oder Produktdaten.
- Offene Fachfragen stehen im Tab „Projekt & Variablen“ und in `docs/` (u. a. Gl. 19, ob die Excel Gl. 20 und 21 beide rechnet, Vergleichsvolumen, Regendauern).
- Prototyp und Prüfwerkzeug, kein Ersatz für die Fachplanung. Quellen der Formeln: Merkblätter der Städte Bielefeld (2025) und Gütersloh, Merkblatt Ibbenbüren, Fachfolien REHAU.

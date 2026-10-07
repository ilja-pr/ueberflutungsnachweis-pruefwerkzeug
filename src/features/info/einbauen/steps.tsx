import type { ReactNode } from 'react';
import { CALC, CONF, CTRL, FLUID, JS, MODEL, PDF, RAIN, SERVICE, SQL } from './snippets';

export interface StepDef {
  id: string;
  title: string;
  goal: string;
  todo: ReactNode;
  code?: { lang: string; title: string; code: string }[];
  done: string;
}

export const STEPS: StepDef[] = [
  {
    id: 'db',
    title: 'Datenbank, Model und TCA',
    goal: 'Die Felder anlegen, in denen das Ergebnis liegt.',
    todo: (
      <ul>
        <li>8 Spalten an der Anfrage, 2 Spalten an der Flächenzeile.</li>
        <li>Model: Properties, Getter und Setter. TCA: Spalten ergänzen.</li>
        <li>Datenbankschema aktualisieren (Installtool „Datenbank analysieren“ oder <code>typo3 database:updateschema</code>), Caches leeren.</li>
      </ul>
    ),
    code: [
      { lang: 'sql', title: 'ext_tables.sql', code: SQL },
      { lang: 'php', title: 'Model und TCA', code: MODEL },
    ],
    done: 'Die Felder sind im TYPO3-Backend sichtbar, das Schema-Update läuft ohne Fehler.',
  },
  {
    id: 'calc',
    title: 'Rechenklasse übernehmen',
    goal: 'Die fertige und getestete Mathematik ins Projekt holen.',
    todo: <p>Die Datei <code>FloodProofCalculator.php</code> liegt in <code>docs/php</code> im Paket. Sie hat keine TYPO3-Abhängigkeit. Nur den Namespace anpassen. Die gleiche Logik steht als <code>src/core/floodProof.ts</code> in diesem Tool, mit denselben Funktionsnamen.</p>,
    code: [{ lang: 'bash', title: 'Terminal', code: CALC }],
    done: 'php tests/example.php meldet „OK (18 Checks)“.',
  },
  {
    id: 'rain',
    title: 'Regendaten abfragen',
    goal: 'Zum Rasterfeld (rcIndex) die Regenspenden für T = 2, 30 und 100 und D = 5, 10, 15 min liefern.',
    todo: (
      <ul>
        <li>Zuerst in der Datenbank nachsehen, wie die Regendaten gespeichert sind (offener Punkt 6): als r in l/(s·ha) oder als hN in mm.</li>
        <li>Die Methode im bestehenden Regendaten-Repository ergänzen.</li>
      </ul>
    ),
    code: [{ lang: 'php', title: 'Regendaten-Repository', code: RAIN }],
    done: 'Für 79098 Freiburg (rcIndex 206112) kommen alle 9 Werte zurück.',
  },
  {
    id: 'service',
    title: 'FloodProofService bauen',
    goal: 'Daten sammeln, rechnen, Ergebnis speichern. Das ist der Kleber zwischen VSO und Rechenklasse.',
    todo: (
      <ul>
        <li>Namen der Klassen und Getter im echten Code gegen die Skizze abgleichen. Besonders: wo die finale Bemessung Länge, Breite, Höhe oder das Volumen ausgibt (offener Punkt 5).</li>
        <li>C_s immer über die UID der Flächenart aus der Datenbank holen. Das Kundenformular schickt C_s nicht mit.</li>
        <li>Setting <code>floodProof.durations</code> anlegen.</li>
      </ul>
    ),
    code: [
      { lang: 'php', title: 'FloodProofService.php', code: SERVICE },
      { lang: 'yaml', title: 'Services.yaml und TypoScript', code: CONF },
    ],
    done: 'Ein Unit-Test mit den Beispielflächen ergibt 11,72 m³ (T 30) und 16,85 m³ (T 100).',
  },
  {
    id: 'admin',
    title: 'Mitarbeiter-Bereich anbinden',
    goal: 'Der Nachweis wird nach jeder finalen Berechnung neu gerechnet. Haken, Anzeige und PDF-Link kommen ins Admin-Formular.',
    todo: (
      <ul>
        <li>Service im Admin-Controller direkt nach der finalen Berechnung und vor dem Bauen der PDFs aufrufen.</li>
        <li>Block im Template nur zeigen, wenn Land, Richtlinie und Entwässerungsart passen. Haken vorbelegen, wenn A_ges über 800 m² liegt.</li>
        <li>Fehler (fehlende Regendaten, ungültiges C_s) als verständliche Meldung zeigen, dann keine zweite PDF.</li>
      </ul>
    ),
    code: [
      { lang: 'php', title: 'Administration-Controller', code: CTRL },
      { lang: 'html', title: 'Fluid-Template', code: FLUID },
    ],
    done: 'Der Block erscheint nur bei passendem Gating, das Ergebnis steht nach jeder Berechnung aktuell in der Datenbank.',
  },
  {
    id: 'pdf',
    title: 'PDF „Überflutungsnachweis“',
    goal: 'Zweite PDF im Stil der Bemessungs-PDF, nur aus dem gespeicherten Ergebnis.',
    todo: (
      <ul>
        <li>Neues Template mit den vorhandenen Partials für Kopf und Fuß.</li>
        <li>Inhalt: Ergebnisbox, Eckdaten, Flächentabelle, Tabelle je Regendauer, Rechenweg, Hinweise. Vorlage sind die Muster-PDFs in <code>docs/muster</code> und der HTML-Bericht dieses Tools.</li>
        <li>Dateiname <code>Ueberflutungsnachweis_&lt;Anfragenummer&gt;.pdf</code>, Ablage und Versand wie die Bemessungs-PDF.</li>
      </ul>
    ),
    code: [{ lang: 'html', title: 'Templates/Pdf/FloodProof.html (Skelett)', code: PDF }],
    done: 'Die PDF entspricht den Mustern, die Zahlen stimmen mit der Anzeige im Admin überein.',
  },
  {
    id: 'front',
    title: 'Kundenformular: zwei Felder bei „Manuell“',
    goal: 'Nur bei der Flächenart „Manuell“ braucht der Server C_s und die Dach-Zuordnung.',
    todo: (
      <ul>
        <li>Felder <code>csCustom</code> und <code>isRoofCustom</code> im Fluid-Template der Flächenzeile und im Model ergänzen.</li>
        <li>In <code>AreaManagerNew.js</code> nur bei „Manuell“ einblenden, analog zu <code>cmCustom</code>. Der Original-Quellcode liegt im früheren Paket „VSO_Code_und_Funktionsweise“.</li>
      </ul>
    ),
    code: [{ lang: 'js', title: 'AreaManagerNew.js und Template', code: JS }],
    done: 'Die Felder sind nur bei „Manuell“ sichtbar, die Pflichtprüfung greift, sonst bleibt das Formular unverändert.',
  },
  {
    id: 'accept',
    title: 'Abnahme mit der Excel',
    goal: 'Beweisen, dass der VSO dasselbe rechnet wie die Excel.',
    todo: (
      <ol>
        <li>2 bis 3 echte Altfälle aus der Excel nehmen (Flächen, Regendaten, Rigolenmaße, Excel-Ergebnis).</li>
        <li>Jeden Fall in diesem Tool eingeben und mit dem Excel-Wert vergleichen. Abweichungen mit den Vergleichsmodi klären.</li>
        <li>Denselben Fall im VSO anlegen und das Ergebnis mit dem Tool vergleichen. Toleranz ±0,01 m³.</li>
        <li>Die 12 Abnahmetests aus der Gesamtdokumentation durchgehen.</li>
      </ol>
    ),
    done: 'Alle Altfälle liegen innerhalb ±0,01 m³, alle Abnahmetests bestehen.',
  },
];

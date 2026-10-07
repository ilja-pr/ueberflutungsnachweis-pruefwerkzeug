import type { ReactNode } from 'react';

function T({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="tablewrap">
      <table className="data">
        <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

const code = (s: string) => <code>{s}</code>;

export function ProjektPage() {
  return (
    <main className="page">
      <h1>Das Projekt: Überflutungsnachweis im VSO</h1>
      <p className="lead">
        Der VSO ist der Versickerungs-Konfigurator von GRAF (versickerung.graf.digital, TYPO3-Extension {code('ig_graf_infiltration')}). Er bemisst Rigolen. Dazu kommt jetzt ein automatischer Überflutungsnachweis nach DIN 1986-100.
      </p>

      <section className="panel">
        <h2>Worum geht es?</h2>
        <div className="two">
          <div className="before"><h3>Heute</h3><p>Der Mitarbeiter bekommt die finale Berechnung, tippt Länge, Breite, Spitzenwerte und die 30-jährigen Regendaten in eine Excel und rechnet den Nachweis von Hand.</p></div>
          <div className="after"><h3>Künftig</h3><p>Der Nachweis läuft automatisch im Konfigurator mit und kommt als <b>zusätzliche PDF im Stil der Bemessungs-PDF</b> heraus. Gilt nur für DWA-A 138-1, Rückhaltung nur in der Rigole.</p></div>
        </div>
        <p className="note"><b>Was ist dieses Tool?</b> Ein Prüfwerkzeug und Prototyp. Es rechnet exakt nach den Regeln, die später im VSO umgesetzt werden. Damit lässt sich die Excel gegenprüfen, bevor der Programmierer anfängt. Es ist <b>nicht</b> der VSO und speichert nichts auf einem Server.</p>
      </section>

      <section className="panel">
        <h2>Was kann das Werkzeug?</h2>
        <T head={['Tab', 'Zweck']} rows={[
          [<b key="r">Rechner</b>, 'Eingaben, Ergebnis, Rechenweg mit Zahlen, Abgleich mit der Excel (Gleichung 20, optional 21)'],
          [<b key="a">Ausgabe</b>, 'Einzelne Teile ausgeben: Ergebnisbox, Flächentabelle, Regendaten, Rechenweg … als HTML, Text, CSV oder zum Einfügen in Excel'],
          [<b key="i">VSO-Import &amp; Prüfung</b>, 'VSO-Daten laden (PDF, JSON, Formulardaten, Text), erkennen was da ist, prüfen was für Gl. 19, 20, 21, 22 fehlt, in den Rechner übernehmen'],
          [<b key="e">So wird gerechnet</b>, 'Formeln und Regeln in Worten'],
          [<b key="p">Projekt &amp; Variablen</b>, 'diese Seite'],
          [<b key="b">Einbauen</b>, 'Schritt-für-Schritt-Anleitung für den Einbau in den VSO'],
          [<b key="f">Flächenarten</b>, 'die 30 Flächenarten mit C_m und C_s'],
        ]} />
      </section>

      <section className="panel">
        <h2>Gesamtablauf im VSO</h2>
        <div className="flow">
          <div><b>1 Kunde</b>füllt das Formular aus. Keine Änderung, außer 2 Felder bei Flächenart „Manuell“.</div>
          <div><b>2 Anfrage</b>wird gespeichert. Noch keine Nachweisrechnung.</div>
          <div><b>3 Mitarbeiter</b>macht die finale Berechnung (Blöcke, Lagen, Produkt).</div>
          <div className="new"><b>4 NEU Nachweis</b>wird automatisch gerechnet und gespeichert.</div>
          <div className="new"><b>5 Zwei PDFs</b>Bemessung + NEU Überflutungsnachweis.</div>
        </div>
        <p className="hint">Der Kunde merkt vom Nachweis nichts. Er ist reine Mitarbeiter- und Vertriebssache.</p>
      </section>

      <section className="panel">
        <h2>Wann wird gerechnet?</h2>
        <T head={['Bedingung', 'Variable', 'Wert']} rows={[
          ['Deutschland', code('country'), '1'],
          ['Richtlinie DWA-A 138-1', code('newGuideline'), '1 (0 = alte Richtlinie → kein Nachweis)'],
          ['Rigole oder Mulden-Rigole', code('infiltrationType'), '1 oder 2 (3 = Retentionszisterne → kein Nachweis)'],
          ['Haken im Mitarbeiter-Bereich', code('floodProofEnabled'), '1 (NEU, vorbelegt wenn A_ges > 800 m²)'],
        ]} />
      </section>

      <section className="panel">
        <h2>Welche Variable bringt was? (bestehend, wird nur gelesen)</h2>
        <T head={['Variable', 'Bedeutung', 'Verwendung im Nachweis']} rows={[
          [code('surfaceValue[n][surfacetype]'), 'UID der Flächenart', 'C_s und Kategorie (Dach / Gelände) aus der Datenbank. Das Formular schickt C_s nicht mit'],
          [code('surfaceValue[n][area]'), 'Fläche in m²', 'A_i'],
          [code('rainFrequency'), 'Regenhäufigkeit in Jahren', '> 10 → T = 100, sonst T = 30'],
          [code('rcIndex'), 'KOSTRA-Rasterfeld, z. B. 206112', 'Regendaten abfragen'],
          [code('permittedDischarge'), 'zulässiger Abfluss (vermutlich Q_Dr)', 'nur Gl. 22, im Code zu prüfen'],
          [code('products[]'), 'gewähltes Produkt', 'Speicherkoeffizient s_R, Blockmaße'],
          [code('availableLength / availableWidth'), 'verfügbarer Platz des Kunden', 'nur Obergrenze für den Vergrößerungsvorschlag, nicht zum Rechnen'],
          ['Ergebnis der finalen Bemessung', 'Blockanzahl, Lagen, ggf. Volumen', 'L_R, B_R, H_R und V_vorh. Das ist die tatsächliche Rigole'],
        ]} />
        <p className="hint">Wichtig: {code('availableLength')} ist der Platz, den der Kunde hat. L<sub>R</sub> und B<sub>R</sub> sind die Maße der tatsächlich bemessenen Rigole. Nur diese zählen für V<sub>vorh</sub>.</p>
      </section>

      <section className="panel">
        <h2>Was ist NEU? (muss gebaut werden)</h2>
        <T head={['Wo', 'Was', 'Zweck']} rows={[
          ['Kundenformular, Flächenart „Manuell“', <>{code('csCustom')}, {code('isRoofCustom')}</>, 'C_s und Dach-Zuordnung der manuellen Fläche'],
          ['Mitarbeiter-Bereich', <>{code('floodProofEnabled')}, {code('floodProofTotalArea')}</>, 'Haken „Nachweis erstellen“, optional A_ges überschreiben, Anzeige Ergebnis und PDF-Link'],
          ['Datenbank, Anfrage', <>{code('flood_proof_*')} (8 Spalten)</>, 'enabled, total_area, return_period, volume_req, volume_avail, passed, result (JSON), calculated_at'],
          ['Datenbank, Flächenzeile', <>{code('cs_custom')}, {code('is_roof_custom')}</>, 'Werte der manuellen Fläche'],
          ['Server', code('FloodProofCalculator.php'), 'reine Rechenklasse, fertig und getestet (hier als TypeScript portiert)'],
          ['Server', code('FloodProofService.php'), 'Flächen, C_s, Regendaten, Geometrie sammeln, rechnen, speichern, PDF anstoßen'],
          ['Server', 'Regendaten-Repository erweitern', 'findRainIntensities(rcIndex, [T], [D])'],
          ['PDF', 'Vorlage „Überflutungsnachweis“', 'gleiche Kopf- und Fußteile wie die Bemessungs-PDF'],
        ]} />
      </section>

      <section className="panel">
        <h2>Die PDF „Überflutungsnachweis“</h2>
        <ol className="plain">
          <li><b>Ergebnisbox</b> grün „erfüllt“ oder rot „nicht erfüllt“ mit drei Zahlen: erforderlich, vorhanden, Auslastung, dazu ein Balken.</li>
          <li><b>Eckdaten:</b> Anlage, Abmessung, Regen (Raster, gewählte Häufigkeit, Nachweis-Regen 30/100), A_ges, Pflicht oder freiwillig.</li>
          <li><b>Flächentabelle</b> mit A, C_s und A·C_s je Zeile.</li>
          <li><b>Tabelle je Regendauer</b> mit Zufluss, Ableitung, V_Rück. Maßgebende Zeile gelb.</li>
          <li><b>Rechenweg</b> und <b>Hinweise</b> (keine Rückstauflächen, Versickerung nicht abgezogen).</li>
        </ol>
        <p className="hint">Den Bericht dieses Tools (Tab „Ausgabe“) kannst du als Vorlage für die PDF nehmen.</p>
      </section>

      <section className="panel">
        <h2>Offene Punkte (vor dem Livegang klären)</h2>
        <T head={['#', 'Frage', 'Wirkung']} rows={[
          ['1', 'Prüft die Excel das gesamte Anlagenvolumen (V_vorh ≥ V_Rück) oder nur die Reserve über der Bemessung?', 'eine Zeile in calculate()'],
          ['2', 'Welche Regendauern rechnet die Excel (nur 5/10/15 min oder nach DWA-A 118 eine einzelne)?', 'Einstellung durations'],
          ['3', 'Zählen Grünflächen (Kat. 7) und Wasserflächen zur befestigten Gesamtfläche?', 'A_ges'],
          ['4', 'Mulden-Rigole 138-1: mit welcher Jährlichkeit rechnet die Bemessung intern? (VSO-489)', 'Wahl von T, bis dahin 30'],
          ['5', 'Wo gibt die finale Bemessung Blockanzahl, Lagen, Volumen aus?', 'Geometrie, V_vorh'],
          ['6', 'Liegen r(D,2), r(D,30), r(D,100) je Rasterfeld in der DB, oder nur hN in mm?', 'Regendaten-Repository'],
          ['7', 'Tatsächliche Tabellen-, Klassen- und Namespace-Namen der Extension', 'Dokumentation nutzt Vermutungen'],
          ['8', 'Zieht die Excel die Versickerung während des Ereignisses ab? (hier bewusst nicht)', 'optional später'],
          ['9', <b key="9">Gleichung 19: Wie lautet die Formel? In den geprüften Quellen kommt sie nicht vor.</b>, 'neue Rechnung in src/core, Eingangsgrößen in equations.ts'],
          ['10', 'Rechnet die Excel Gl. 20 und Gl. 21 und nimmt den größeren Wert (so stehen die Merkblätter Bielefeld und Gütersloh)? Der frühere Stand der Dokumentation sagte „Gl. 21 nicht verwendet“.', 'Ergebnis V_Rück,max, Q_voll wird gebraucht'],
          ['11', 'Woher kommt Q_voll (DIN 1986-100 Tab. A.5 zur Grundleitung)? Das VSO kennt die Grundleitung nicht.', 'Eingabefeld im VSO oder Annahme'],
          ['12', 'Wie sieht ein echter Export aus dem VSO aus (PDF, JSON, Formulardaten)? Der Import-Tab rät die Beschriftungen und lässt sich mit einer echten Datei genau einstellen.', 'src/features/importCheck/extract/rules.ts'],
        ]} />
      </section>

      <section className="panel">
        <h2>So passt dieses Paket zusammen</h2>
        <T head={['Datei / Ordner', 'Was ist das']} rows={[
          [code('src/core/'), <>Rechenkern ohne Oberfläche: {code('floodProof.ts')} (Gl. 20, 1:1-Port von {code('FloodProofCalculator.php')}), {code('gl21.ts')}, {code('equations.ts')} (was braucht welche Gleichung), {code('surfaceTypes.ts')} (30 Flächenarten). Dazu die Tests</>],
          [code('src/features/calculator/'), 'Rechner-Tab: Eingaben → Rechenkern (compute.ts), Rechenweg (explain.ts), Eingabekarten und Ergebnisanzeige'],
          [code('src/features/output/'), 'Ausgabe-Tab: Bausteine (sections.ts) und HTML-/Text-Bericht (htmlReport.ts)'],
          [code('src/features/importCheck/'), <>Import-Tab: {code('extract/')} (PDF, JSON, Text → Fundstellen), {code('checkData.ts')}, {code('evaluate.ts')} (Prüfung je Gleichung), {code('toInputs.ts')}</>],
          [code('src/features/info/'), 'Textseiten: So wird gerechnet, Projekt, Einbauen, Flächenarten'],
          [code('src/shared/'), 'wiederverwendbare Bausteine (Eingabefelder, Tabellen, Hilfsfunktionen)'],
          [code('docs/'), 'Gesamtdokumentation mit Ticket (PDF), Spezifikation, PHP-Referenzimplementierung mit Tests, Muster-PDFs'],
          [code('src/app/'), 'Next.js-Routen: pro Tab eine Seite (page.tsx), dazu layout.tsx. Die Seiten selbst liegen in src/features/'],
          [code('src/shell/'), 'Rahmen mit Navigation, gemeinsamer Zustand (Rechner-Eingaben, Import-Daten) im Layout'],
          [code('npm run build'), <>erzeugt den statischen Export in {code('out/')}: auf jeden Webserver legen, lokal mit {code('npm run serve')}</>],
        ]} />
      </section>
    </main>
  );
}

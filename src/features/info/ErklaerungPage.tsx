'use client';

import { useCalculator } from '../../shell/CalculatorContext';
import { EQUATIONS } from '../../core/equations';
import { determineReturnPeriod } from '../../core/floodProof';

const FREQ = [1, 2, 3, 5, 10, 15, 20, 30, 50, 100];

export function ErklaerungPage() {
  const { inp } = useCalculator();
  return (
    <main className="page">
      <h1>So wird gerechnet</h1>
      <p className="lead">
        Der Überflutungsnachweis beantwortet eine Frage: <b>Reicht das Speichervolumen der Rigole, um den Regen aufzunehmen, der bei einem seltenen Starkregen auf die Flächen fällt und nicht normal abgeleitet werden kann?</b>
      </p>

      <section className="panel">
        <h2>Die Formel (DIN 1986-100, Gleichung 20)</h2>
        <div className="formula">
          V<sub>Rück</sub>(D) = [ r(D,T) · A<sub>ges</sub> − r(D,2) · ( A<sub>Dach</sub> · C<sub>s,Dach</sub> + A<sub>FaG</sub> · C<sub>s,FaG</sub> ) ] · D · 60 / 10 000 000 &nbsp;[m³]
        </div>
        <div className="tablewrap">
          <table className="data">
            <thead><tr><th>Symbol</th><th>Bedeutung</th><th>Einheit</th><th>Woher im VSO</th></tr></thead>
            <tbody>
              <tr><td>r(D,T)</td><td>Regenspende der Dauer D, Jährlichkeit T (30 oder 100)</td><td>l/(s·ha)</td><td>Regendaten-Tabelle zum Rasterfeld (rcIndex)</td></tr>
              <tr><td>r(D,2)</td><td>Regenspende derselben Dauer, 2-jährlich = Bemessungsregen der normalen Entwässerung</td><td>l/(s·ha)</td><td>dieselbe Tabelle</td></tr>
              <tr><td>A<sub>ges</sub></td><td>gesamte befestigte Fläche = A<sub>Dach</sub> + A<sub>FaG</sub></td><td>m²</td><td>surfaceValue[n][area]</td></tr>
              <tr><td>A<sub>Dach</sub> / A<sub>FaG</sub></td><td>Dachflächen (Kat. 1–3) / Flächen außerhalb von Gebäuden (Kat. 4–7)</td><td>m²</td><td>Flächenart → Kategorie</td></tr>
              <tr><td>C<sub>s</sub></td><td>Spitzenabflussbeiwert je Flächenart (0 bis 1)</td><td>–</td><td>Flächenart-Stammdaten (cs)</td></tr>
              <tr><td>D</td><td>Regendauer: 5, 10 und 15 min</td><td>min</td><td>Einstellung, Standard 5/10/15</td></tr>
              <tr><td>V<sub>vorh</sub></td><td>Speichervolumen der Rigole = L · B · H · s<sub>R</sub> (+ V<sub>M</sub>)</td><td>m³</td><td>finale Bemessung</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>In Worten</h2>
        <ol className="plain">
          <li><b>Zufluss:</b> Bei seltenem Starkregen fließt von allen befestigten Flächen Wasser ab: r(D,T) · A<sub>ges</sub>.</li>
          <li><b>Ableitung:</b> Ein Teil davon schafft die normale Entwässerung noch, sie ist auf den 2-jährlichen Regen ausgelegt: r(D,2) · Σ(A · C<sub>s</sub>).</li>
          <li><b>Rückhaltung:</b> Der Rest muss gespeichert werden. Mal Dauer ergibt das Volumen V<sub>Rück</sub> in m³.</li>
          <li><b>Ungünstigste Dauer:</b> Man weiß nicht, welche Regendauer am schlimmsten ist. Deshalb rechnet man D = 5, 10 und 15 min und nimmt den größten Wert. Negative Werte zählen als 0.</li>
          <li><b>Nachweis:</b> erfüllt, wenn V<sub>vorh</sub> ≥ größtes V<sub>Rück</sub>. Es gibt keine Rückstauflächen: die ganze Rückhaltung muss in der Rigole passieren.</li>
        </ol>
      </section>

      <section className="panel">
        <h2>Die anderen Gleichungen: 19, 21, 22</h2>
        <p>Jede Gleichung hat andere Eingangsgrößen. Was jeweils gebraucht wird, prüft der Tab „VSO-Import &amp; Prüfung“ an echten Daten. Hier der Stand:</p>
        <div className="tablewrap">
          <table className="data">
            <thead><tr><th>Gleichung</th><th>Formel</th><th>Stand im Werkzeug</th></tr></thead>
            <tbody>
              {EQUATIONS.map((e) => (
                <tr key={e.id}>
                  <td><b>{e.title.replace('Gleichung', 'Gl.')}</b></td>
                  <td><code>{e.formula}</code></td>
                  <td><b>{e.statusText}.</b> {e.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note warn">
          <b>Gleichung 19 fehlt.</b> In den geprüften Quellen (Merkblätter Bielefeld, Gütersloh, Oestrich-Winkel, Ibbenbüren, REHAU-Folien zur DIN 1986-100) kommt sie nicht vor, dort beginnt die Nummerierung bei Gl. 20. Die Norm selbst liegt nicht vor, und ob Gl. 19 überhaupt zum Überflutungsnachweis gehört, ist offen.
          Die Formel muss aus der Norm genannt werden. Sie lässt sich dann in <code>src/core/equations.ts</code> (Eingangsgrößen) und <code>src/core/</code> (Rechnung) ergänzen.
        </p>
      </section>

      <section className="panel">
        <h2>Welcher Regen? Unsere Regel für T</h2>
        <p>
          Die DIN rechnet Gleichung 20 mit dem 30-jährlichen Regen. Wählt der Kunde für die Bemessung eine seltenere Regenhäufigkeit als 10 Jahre, wird zusätzlich strenger geprüft:{' '}
          <b>über 10 Jahre → 100-jährlicher Regen</b>. Das ist eine Firmenregel, keine Vorgabe der DIN.
        </p>
        <div className="tablewrap">
          <table className="data freq">
            <thead>
              <tr>
                <th>gewählt (Jahre)</th>
                {FREQ.map((f) => <th key={f} className={inp.rainFrequency === f ? 'cur' : ''}>{f}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Nachweis mit T =</th>
                {FREQ.map((f) => (
                  <td key={f} className={`${determineReturnPeriod(f) === 100 ? 'hund' : ''} ${inp.rainFrequency === f ? 'cur' : ''}`}>{determineReturnPeriod(f)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="hint">Genau 10 Jahre bleibt bei 30. Keine Regenhäufigkeit (Mulden-Rigole nach DWA-A 138-1, VSO-489) → 30. Die aktuell im Rechner gewählte Spalte ist hervorgehoben.</p>
      </section>

      <section className="panel">
        <h2>Annahmen und Grenzen</h2>
        <ul className="plain">
          <li>Nur DWA-A 138-1, Deutschland, Rigole und Mulden-Rigole.</li>
          <li>Pflicht ab A<sub>ges</sub> &gt; 800 m². Darunter freiwillig, wird aber gerechnet.</li>
          <li>Versickerung während des Regens wird nicht abgezogen. Das ist sicher.</li>
          <li>Gleichung 21 rechnet der Rechner mit, sobald im Feld „Q_voll“ ein Wert steht. Laut den Merkblättern werden ohne Einleitbeschränkung Gl. 20 und Gl. 21 gerechnet, der größere Wert ist maßgebend. Ob die Excel das auch so macht, ist offen (Projekt &amp; Variablen).</li>
          <li>Gleichung 22 wird nur im Import-Tab auf ihre Eingangsgrößen geprüft, nicht gerechnet. Die 70-%-Dachregel ist nicht enthalten.</li>
          <li>Rampen mit Neigung zum Gebäude (UID 14) verlangen in der DIN eine gesonderte Betrachtung. Hier nur Hinweis.</li>
          <li>Quelle der Formeln: Merkblatt Überflutungsnachweis der Stadt Bielefeld (2025), Merkblatt der Stadt Gütersloh. Das Prüfwerkzeug ersetzt keine Fachplanung.</li>
        </ul>
      </section>
    </main>
  );
}

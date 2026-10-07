'use client';

import { CodeBlock } from '../../../shared/components/CodeBlock';
import { usePersistentState } from '../../../shared/hooks/usePersistentState';
import { STEPS } from './steps';

const STORE = 'ueberflutungsnachweis-einbau-v1';

const revive = (raw: unknown): Record<string, boolean> | null => (raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, boolean>) : null);

const MAPPING: Array<[string, string]> = [
  ['src/core/floodProof.ts', 'FloodProofCalculator.php, gleiche Funktionen und Ergebnis-Schlüssel'],
  ['src/core/gl21.ts', 'optional, wenn Gleichung 21 im VSO gebraucht wird (Q_voll muss dann erst beschafft werden)'],
  ['src/features/calculator/compute.ts', 'FloodProofService.php: Flächen, Regendaten und Rigole einsammeln, Prüfungen'],
  ['src/core/surfaceTypes.ts', 'Nicht kopieren. Der Server liest C_s aus dem Repository der Flächenarten'],
  ['src/features/output, explain.ts', 'Vorlage für die PDF „Überflutungsnachweis“'],
  ['src/core/equations.ts', 'Liste, welche Gleichung welche Eingangsgrößen braucht. Hilfe für die Frage, was der VSO noch liefern muss'],
  ['Tab „Rechner“', 'Entspricht dem Kundenformular plus Admin-Block. Im VSO kommen die Werte aus der Datenbank, nicht aus Eingabefeldern'],
  ['Tab „VSO-Import & Prüfung“', 'Zeigt an echten Daten aus dem VSO, was für Gl. 19 bis 22 noch fehlt'],
  ['Abgleich mit der Excel', 'Bleibt als Prüfwerkzeug für die Abnahme und für spätere Änderungen'],
];

export function EinbauenPage() {
  const [done, setDone] = usePersistentState<Record<string, boolean>>(STORE, () => ({}), revive);
  const toggle = (id: string) => setDone((d) => ({ ...d, [id]: !d[id] }));
  const count = STEPS.filter((s) => done[s.id]).length;

  return (
    <main className="page">
      <h1>Einbauen</h1>
      <p className="lead">So kommt der Nachweis in den VSO. Acht Schritte in fester Reihenfolge, jeder mit Code zum Kopieren und einem Satz, woran man erkennt, dass er fertig ist.</p>

      <section className="plain-sec">
        <h2>Vorher klären</h2>
        <ul className="plain">
          <li><b>Zugang:</b> Git-Repository der Extension <code>ig_graf_infiltration</code> und ein Datenbank-Dump, zum Beispiel in einer lokalen DDEV-Instanz. Ohne Backend-Zugriff lässt sich der Einbau nicht abschließen.</li>
          <li><b>Excel:</b> zwei bis drei echte Altfälle mit Eingaben und Ergebnis.</li>
          <li><b>Fachfragen 1 bis 3</b> aus „Projekt &amp; Variablen“: Volumenvergleich, Regendauern, Grünflächen. Sie entscheiden nur über eine Zeile im Rechner, sollten aber vor dem Livegang stehen.</li>
          <li><b>Gleichung 19:</b> Die Formel fehlt noch (siehe „So wird gerechnet“). Sie muss vor dem Einbau genannt werden, falls sie Teil des Nachweises sein soll.</li>
          <li><b>Hinweis:</b> Tabellen-, Klassen- und Getter-Namen unten sind begründete Annahmen, im echten Code abgleichen.</li>
        </ul>
      </section>

      <section className="plain-sec">
        <h2>Ablauf</h2>
        <div className="steps-overview">
          {STEPS.map((s, i) => (
            <a key={s.id} href={`#step-${s.id}`} className={done[s.id] ? 'done' : ''}>
              <span>{i + 1}</span>
              {s.title}
            </a>
          ))}
        </div>
        <p className="hint">{count} von {STEPS.length} erledigt. Der Haken wird nur in diesem Browser gemerkt.</p>
      </section>

      {STEPS.map((s, i) => (
        <section className="stepcard" id={`step-${s.id}`} key={s.id}>
          <header>
            <h2><span className="num-plain">{i + 1}</span> {s.title}</h2>
            <label className="check"><input type="checkbox" checked={!!done[s.id]} onChange={() => toggle(s.id)} /> erledigt</label>
          </header>
          <p className="goal">{s.goal}</p>
          <div className="todo">{s.todo}</div>
          {s.code?.map((c) => <CodeBlock key={c.title} lang={c.lang} title={c.title} code={c.code} />)}
          <p className="fertig"><b>Fertig, wenn:</b> {s.done}</p>
        </section>
      ))}

      <section className="plain-sec">
        <h2>Was aus diesem Tool wohin wandert</h2>
        <div className="tablewrap">
          <table className="data">
            <thead><tr><th>Im Tool</th><th>Im VSO</th></tr></thead>
            <tbody>
              {MAPPING.map(([a, b]) => (
                <tr key={a}><td><code>{a}</code></td><td>{b}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="plain-sec">
        <h2>Stolpersteine</h2>
        <ul className="plain">
          <li><b>C_s kommt nicht vom Formular.</b> Das Frontend lädt C_s, schickt es aber nicht mit. Der Server muss es über die UID der Flächenart nachschlagen.</li>
          <li><b>Zwei verschiedene Längen.</b> <code>availableLength</code> ist der Platz des Kunden. Für V_vorh zählt nur die bemessene Rigole aus der finalen Berechnung.</li>
          <li><b>Mulden-Rigole nach 138-1</b> sendet keine <code>rainFrequency</code> (VSO-489). Der Rechner nimmt dann 30 Jahre. Dazu ist <code>null</code> zu übergeben, nicht 0.</li>
          <li><b>Rampen (UID 14)</b> verlangen in der DIN eine gesonderte Betrachtung. Wird normal gerechnet, die PDF zeigt nur einen Hinweis.</li>
          <li><b>Nach Änderungen</b> an Model und Services: Schema-Update, Cache leeren, Dependency-Injection-Cache neu bauen.</li>
          <li><b>Nicht Teil des Tickets:</b> alte Richtlinie 138, Retentionszisterne, Überflutungsflächen, Gleichung 22, die 70-%-Dachregel. Gleichung 21 rechnet das Prüfwerkzeug optional mit, im VSO fehlt dafür Q_voll.</li>
        </ul>
      </section>

      <section className="plain-sec">
        <h2>Zweiter Weg: Tool nur intern bereitstellen</h2>
        <p>Wer vorerst keinen Einbau will, baut mit <code>npm run build</code> den Ordner <code>dist</code> und legt ihn hinter einem Login auf einen internen Webserver oder ins Intranet. Die Seite läuft ohne Server-Logik und speichert nichts außer den letzten Eingaben im Browser. Das ersetzt den Einbau nicht: Es gibt dann keine automatische Berechnung und keine zweite PDF im Konfigurator.</p>
      </section>
    </main>
  );
}

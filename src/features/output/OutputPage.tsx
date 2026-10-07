'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCalculator } from '../../shell/CalculatorContext';
import { CopyButton } from '../../shared/components/CopyButton';
import { downloadFile, safeFileName } from '../../shared/lib/files';
import { tableToDelimited } from '../../shared/lib/format';
import { buildHtmlDocument, buildPlainText } from './htmlReport';
import { buildSections, SECTION_ORDER, type SectionId } from './sections';

export function OutputPage() {
  const { inp, computed } = useCalculator();
  const sections = useMemo(() => buildSections(inp, computed), [inp, computed]);
  const [selected, setSelected] = useState<Set<SectionId>>(() => new Set(SECTION_ORDER.filter((id) => id !== 'rechenweg' && id !== 'annahmen')));

  const available = sections.map((s) => s.id);
  const chosen = SECTION_ORDER.filter((id) => selected.has(id) && available.includes(id));
  const base = `Ueberflutungsnachweis${inp.requestNo ? '_' + safeFileName(inp.requestNo) : ''}`;

  const toggle = (id: SectionId) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  // Der Bericht trägt einen Zeitstempel: Vorschau erst im Browser aufbauen, sonst passt sie nicht zum vorgerenderten HTML.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const previewHtml = useMemo(() => buildHtmlDocument(inp, computed, { include: chosen, embedInputs: false }), [inp, computed, chosen.join()]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="page wide">
      <h1>Ausgabe</h1>
      <p className="lead">Alles oder nur einzelne Teile ausgeben: als HTML-Bericht, als Text zum Einfügen oder als Tabelle für die Excel.</p>

      <div className="outcols">
        <div>
          <div className="outhead">
            <h2>Bausteine</h2>
            <span>
              <button className="linkbtn" onClick={() => setSelected(new Set(SECTION_ORDER))}>alle</button> ·{' '}
              <button className="linkbtn" onClick={() => setSelected(new Set())}>keine</button>
            </span>
          </div>
          <ul className="seclist">
            {sections.map((s) => (
              <li key={s.id}>
                <label className="check">
                  <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                  <span>
                    <b>{s.title}</b>
                    <small>{s.hint}</small>
                  </span>
                </label>
                <span className="secactions">
                  <button className="linkbtn" onClick={() => downloadFile(`${base}_${s.id}.html`, 'text/html', buildHtmlDocument(inp, computed, { include: [s.id], embedInputs: false }))}>HTML</button>
                  <CopyButton label="Text" text={s.text} />
                  {s.table && (
                    <>
                      <CopyButton label="Für Excel" text={() => tableToDelimited(s.table!, 'tsv')} />
                      <button className="linkbtn" onClick={() => downloadFile(`${base}_${s.id}.csv`, 'text/csv', tableToDelimited(s.table!, 'csv'))}>CSV</button>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>

          <div className="outbuttons">
            <button className="btn primary" disabled={!chosen.length} onClick={() => downloadFile(`${base}.html`, 'text/html', buildHtmlDocument(inp, computed, { include: chosen }))}>
              Auswahl als HTML speichern
            </button>
            <CopyButton className="btn" label="Auswahl als Text kopieren" text={() => buildPlainText(inp, computed, chosen)} />
          </div>
          <p className="hint">Der HTML-Bericht enthält die Eingaben unsichtbar. Im Rechner-Tab lässt er sich über „Eingaben laden“ wieder öffnen.</p>

          <h2 className="mt">Rohdaten</h2>
          <ul className="seclist">
            <li>
              <span>
                <b>Ergebnis als JSON</b>
                <small>genau das Array, aus dem später die PDF im VSO gebaut wird</small>
              </span>
              <span className="secactions">
                <button className="linkbtn" disabled={!computed.result} onClick={() => downloadFile(`${base}_ergebnis.json`, 'application/json', JSON.stringify(computed.result, null, 2))}>Speichern</button>
                <CopyButton text={() => JSON.stringify(computed.result, null, 2)} />
              </span>
            </li>
            <li>
              <span>
                <b>Eingaben als JSON</b>
                <small>alle Eingaben dieses Falls, wieder ladbar</small>
              </span>
              <span className="secactions">
                <button className="linkbtn" onClick={() => downloadFile(`${base}_eingaben.json`, 'application/json', JSON.stringify(inp, null, 2))}>Speichern</button>
                <CopyButton text={() => JSON.stringify(inp, null, 2)} />
              </span>
            </li>
          </ul>
        </div>

        <div>
          <div className="outhead">
            <h2>Vorschau</h2>
            <span className="hint">{chosen.length} von {sections.length} Bausteinen</span>
          </div>
          <iframe title="Vorschau" className="preview" srcDoc={mounted ? previewHtml : ""} sandbox="" />
        </div>
      </div>
    </main>
  );
}

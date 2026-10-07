import { useState } from 'react';
import { Section } from '../../../shared/components/Field';
import { fieldLabel } from '../fields';
import { useImportCheck } from '../ImportCheckContext';

const LIMIT = 400;

export function RawText() {
  const ic = useImportCheck();
  const [all, setAll] = useState(false);
  const lines = ic.parsed.lines;
  if (lines.length === 0) return null;
  const shown = all ? lines : lines.slice(0, LIMIT);
  const hitLines = lines.filter((l) => l.hits.length).length;
  return (
    <Section title="Gelesener Text" sub={`${lines.length} Zeilen, aus ${hitLines} wurde etwas erkannt`}>
      <p className="hint">So sieht das Werkzeug den Text. Zeilen mit erkannten Werten sind markiert. Steht ein Wert im VSO-Dokument anders, als hier erwartet, lässt sich die Regel in <code>src/features/importCheck/extract/rules.ts</code> anpassen.</p>
      <div className="rawtext" role="region" aria-label="Gelesener Text">
        {shown.map((l) => (
          <div key={l.n} className={`rawline ${l.hits.length ? 'hit' : ''}`}>
            <span className="rawno">{l.n}</span>
            <span className="rawtxt">{l.text || ' '}</span>
            {l.hits.length > 0 && <span className="rawhits">{[...new Set(l.hits)].map((h) => fieldLabel(h)).join(' · ')}</span>}
          </div>
        ))}
      </div>
      {!all && lines.length > LIMIT && (
        <button className="linkbtn" onClick={() => setAll(true)}>Alle {lines.length} Zeilen anzeigen</button>
      )}
    </Section>
  );
}

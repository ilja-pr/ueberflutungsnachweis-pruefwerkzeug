'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { useCalculator } from '../../shell/CalculatorContext';
import { downloadFile, safeFileName } from '../../shared/lib/files';
import { buildHtmlDocument, extractInputsFromHtml } from '../output/htmlReport';
import { AdvancedCard } from './inputs/AdvancedCard';
import { AreasCard } from './inputs/AreasCard';
import { ProjectCard } from './inputs/ProjectCard';
import { RainDataCard } from './inputs/RainDataCard';
import { RainRuleCard } from './inputs/RainRuleCard';
import { RigoleCard } from './inputs/RigoleCard';
import { ResultPanel } from './result/ResultPanel';
import { sanitizeInputs } from './sanitize';

export function CalculatorPage() {
  const { inp, computed, replace, reset } = useCalculator();
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const base = `Ueberflutungsnachweis${inp.requestNo ? '_' + safeFileName(inp.requestNo) : ''}`;

  async function onFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    let raw: unknown = null;
    try {
      raw = file.name.toLowerCase().endsWith('.json') ? JSON.parse(text) : extractInputsFromHtml(text);
    } catch {
      raw = null;
    }
    const next = sanitizeInputs(raw);
    setMsg(next ? `Eingaben aus „${file.name}“ geladen.` : 'Datei konnte nicht gelesen werden (erwartet: JSON oder ein hier erzeugter HTML-Bericht).');
    if (next) replace(next);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <main className="rechner">
      <div className="toolbar">
        <button className="btn primary" disabled={!computed.result} onClick={() => downloadFile(`${base}.html`, 'text/html', buildHtmlDocument(inp, computed))}>
          Bericht speichern
        </button>
        <Link className="linkbtn" href="/ausgabe/">Einzelne Teile ausgeben</Link>
        <button className="linkbtn" onClick={() => downloadFile(`${base}_Eingaben.json`, 'application/json', JSON.stringify(inp, null, 2))}>Eingaben speichern</button>
        <button className="linkbtn" onClick={() => fileRef.current?.click()}>Eingaben laden</button>
        <input ref={fileRef} type="file" accept=".json,.html" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        <button className="linkbtn" onClick={() => window.print()}>Drucken</button>
        <button className="linkbtn" onClick={() => { reset(); setMsg('Auf Beispielwerte zurückgesetzt.'); }}>Zurücksetzen</button>
      </div>
      {msg && (
        <div className="note" role="status">
          {msg} <button className="icon sm" aria-label="Meldung schließen" onClick={() => setMsg(null)}>✕</button>
        </div>
      )}
      <div className="cols">
        <div className="inputs">
          <ProjectCard />
          <RainRuleCard />
          <AreasCard />
          <RainDataCard />
          <RigoleCard />
          <AdvancedCard />
        </div>
        <ResultPanel />
      </div>
    </main>
  );
}

import { useRef, useState } from 'react';
import { Card } from '../../../shared/components/Field';
import { useImportCheck } from '../ImportCheckContext';
import { SAMPLE_FORM, SAMPLE_TEXT } from '../sample';

const KIND_TEXT = {
  'tool-json': 'Eingaben-Datei dieses Prüfwerkzeugs',
  'tool-html': 'Bericht dieses Prüfwerkzeugs',
  json: 'JSON',
  form: 'Formulardaten (Schlüssel=Wert)',
  text: 'Text mit Beschriftungen',
  leer: '',
} as const;

export function LoadCard() {
  const ic = useImportCheck();
  const fileRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const onFiles = (files: FileList | null | undefined) => {
    const f = files?.[0];
    if (f) void ic.loadFile(f);
    if (fileRef.current) fileRef.current.value = '';
  };

  const count = ic.parsed.findings.length;
  return (
    <Card n={1} title="Daten aus dem VSO laden" sub="PDF, JSON, Formulardaten oder kopierten Text. Alles bleibt im Browser, nichts wird hochgeladen.">
      <div
        className={`drop ${over ? 'over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          onFiles(e.dataTransfer.files);
        }}
      >
        <button className="btn primary" onClick={() => fileRef.current?.click()} disabled={ic.busy}>
          {ic.busy ? 'Lese Datei …' : 'Datei auswählen'}
        </button>
        <span className="dropnote">oder hierher ziehen · .pdf .json .txt .html .csv</span>
        <input ref={fileRef} type="file" accept=".pdf,.json,.txt,.html,.htm,.csv,.log,text/*,application/pdf,application/json" hidden onChange={(e) => onFiles(e.target.files)} />
      </div>

      <label className="field" style={{ marginTop: 12 }}>
        <span className="flabel">Oder Text einfügen</span>
        <textarea
          className="paste"
          rows={6}
          spellCheck={false}
          placeholder={'z. B. configuration[rainFrequency]=5 … oder Zeilen wie „Regenhäufigkeit: 5 Jahre“'}
          value={ic.text}
          onChange={(e) => ic.setText(e.target.value, null)}
        />
      </label>

      <div className="rowactions">
        <button className="linkbtn" onClick={() => ic.setText(SAMPLE_FORM, null)}>Beispiel: Formulardaten</button>
        <button className="linkbtn" onClick={() => ic.setText(SAMPLE_TEXT, null)}>Beispiel: Text mit Beschriftungen</button>
        <button className="linkbtn" onClick={ic.clear} disabled={!ic.text && ic.manualCount === 0}>Alles leeren</button>
      </div>

      {ic.error && <div className="note warn" role="alert">{ic.error}</div>}
      {ic.text.trim() && !ic.error && (
        <p className="loadstate" role="status">
          {ic.fileName ? <b>{ic.fileName}</b> : <b>Eingefügter Text</b>}
          {ic.fileType && ic.fileName ? ` (${ic.fileType})` : ''}: {ic.parsed.kind !== 'leer' ? KIND_TEXT[ic.parsed.kind] : ''}, <b>{count}</b> Fundstelle{count === 1 ? '' : 'n'} erkannt.
        </p>
      )}
      {ic.parsed.notes.map((n) => (
        <p className="hint" key={n}>{n}</p>
      ))}
    </Card>
  );
}

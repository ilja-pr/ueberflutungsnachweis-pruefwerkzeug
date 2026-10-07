import { useState } from 'react';
import { CATEGORY_NAMES, SURFACE_TYPES } from '../../../core/surfaceTypes';
import { NumInput } from '../../../shared/components/NumInput';
import { areaKey, rainKey, SCALAR_FIELDS } from '../fields';
import { KNOWN_DURATIONS } from '../extract/rules';
import { useImportCheck } from '../ImportCheckContext';

type Kind = 'scalar' | 'area' | 'rain';

export function ManualAdd() {
  const ic = useImportCheck();
  const [kind, setKind] = useState<Kind>('scalar');
  const [field, setField] = useState('rainFrequency');
  const [value, setValue] = useState<number | null>(null);
  const [textValue, setTextValue] = useState('');
  const [row, setRow] = useState(1);
  const [uid, setUid] = useState(2);
  const [T, setT] = useState(30);
  const [D, setD] = useState(5);
  const [done, setDone] = useState<string | null>(null);

  const def = SCALAR_FIELDS[field];
  const maxRow = Math.max(0, ...ic.data.areas.map((a) => a.index + 1));

  function add() {
    if (kind === 'scalar') {
      if (def.kind === 'text') {
        if (!textValue.trim()) return;
        ic.setManual(field, textValue.trim());
      } else {
        if (value === null) return;
        ic.setManual(field, String(value));
      }
      setDone(`${def.label} ergänzt.`);
    } else if (kind === 'area') {
      if (value === null || value <= 0) return;
      ic.setManual(areaKey(row - 1, 'uid'), String(uid));
      ic.setManual(areaKey(row - 1, 'area'), String(value));
      setDone(`Fläche ${row} ergänzt.`);
    } else {
      if (value === null) return;
      ic.setManual(rainKey(T, D), String(value));
      setDone(`r(${D},${T}) ergänzt.`);
    }
    setValue(null);
    setTextValue('');
  }

  return (
    <details className="manual-add">
      <summary>Wert ergänzen</summary>
      <div className="manualbody">
        <div className="seg" role="group" aria-label="Art des Werts">
          {([['scalar', 'Allgemein / Anlage'], ['area', 'Fläche'], ['rain', 'Regenspende']] as const).map(([k, l]) => (
            <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{l}</button>
          ))}
        </div>

        <div className="manualrow">
          {kind === 'scalar' && (
            <>
              <select aria-label="Feld" value={field} onChange={(e) => setField(e.target.value)}>
                {Object.entries(SCALAR_FIELDS).map(([k, d]) => (
                  <option key={k} value={k}>{d.label}</option>
                ))}
              </select>
              {def.kind === 'text' ? (
                <input type="text" aria-label="Wert" value={textValue} onChange={(e) => setTextValue(e.target.value)} />
              ) : (
                <NumInput ariaLabel="Wert" value={value} onChange={setValue} unit={def.unit} />
              )}
            </>
          )}
          {kind === 'area' && (
            <>
              <select aria-label="Zeile" value={row} onChange={(e) => setRow(Number(e.target.value))}>
                {Array.from({ length: maxRow + 1 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>Fläche {n}{n > maxRow ? ' (neu)' : ''}</option>
                ))}
              </select>
              <select aria-label="Flächenart" value={uid} onChange={(e) => setUid(Number(e.target.value))}>
                {Object.entries(CATEGORY_NAMES).map(([c, name]) => (
                  <optgroup key={c} label={name}>
                    {SURFACE_TYPES.filter((s) => s.category === Number(c)).map((s) => (
                      <option key={s.uid} value={s.uid}>{s.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <NumInput ariaLabel="Fläche" value={value} onChange={setValue} unit="m²" />
            </>
          )}
          {kind === 'rain' && (
            <>
              <select aria-label="Jährlichkeit" value={T} onChange={(e) => setT(Number(e.target.value))}>
                {[2, 30, 100].map((t) => <option key={t} value={t}>T = {t} Jahre</option>)}
              </select>
              <select aria-label="Regendauer" value={D} onChange={(e) => setD(Number(e.target.value))}>
                {KNOWN_DURATIONS.map((d) => <option key={d} value={d}>D = {d} min</option>)}
              </select>
              <NumInput ariaLabel="Regenspende" value={value} onChange={setValue} unit="l/(s·ha)" />
            </>
          )}
          <button className="btn" onClick={add}>Ergänzen</button>
        </div>
        {done && <p className="hint" role="status">{done}</p>}
      </div>
    </details>
  );
}

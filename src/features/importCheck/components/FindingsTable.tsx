import { useState } from 'react';
import { getSurfaceType } from '../../../core/surfaceTypes';
import { Card } from '../../../shared/components/Field';
import { parseNum } from '../../../shared/lib/format';
import type { ResolvedField } from '../checkData';
import { AREA_PROPS, fieldLabel, parseAreaKey, parseRainKey, SCALAR_FIELDS } from '../fields';
import { useImportCheck } from '../ImportCheckContext';
import { ManualAdd } from './ManualAdd';

const SCALAR_ORDER = Object.keys(SCALAR_FIELDS);

interface Group {
  title: string;
  rows: ResolvedField[];
}

function sortGroups(resolved: Map<string, ResolvedField>): Group[] {
  const scalar: ResolvedField[] = [];
  const areas: ResolvedField[] = [];
  const rain: ResolvedField[] = [];
  for (const r of resolved.values()) {
    if (parseAreaKey(r.field)) areas.push(r);
    else if (parseRainKey(r.field)) rain.push(r);
    else scalar.push(r);
  }
  scalar.sort((a, b) => SCALAR_ORDER.indexOf(a.field) - SCALAR_ORDER.indexOf(b.field));
  areas.sort((a, b) => {
    const x = parseAreaKey(a.field)!;
    const y = parseAreaKey(b.field)!;
    return x.index - y.index || AREA_PROPS.indexOf(x.prop) - AREA_PROPS.indexOf(y.prop);
  });
  rain.sort((a, b) => {
    const x = parseRainKey(a.field)!;
    const y = parseRainKey(b.field)!;
    return x.T - y.T || x.D - y.D;
  });
  return [
    { title: 'Allgemein und Anlage', rows: scalar },
    { title: 'Flächen', rows: areas },
    { title: 'Regenspenden r(D,T)', rows: rain },
  ].filter((g) => g.rows.length > 0);
}

const isTextField = (field: string) => SCALAR_FIELDS[field]?.kind === 'text' || parseAreaKey(field)?.prop === 'name';

function show(field: string, value: string): string {
  if (isTextField(field)) return value;
  const n = Number(value);
  return Number.isFinite(n) ? String(n).replace('.', ',') : value;
}

function ValueCell({ r }: { r: ResolvedField }) {
  const ic = useImportCheck();
  const [bad, setBad] = useState(false);
  const shown = show(r.field, r.value);
  const commit = (raw: string) => {
    if (raw === shown) return setBad(false);
    if (isTextField(r.field)) {
      if (raw.trim()) ic.setManual(r.field, raw.trim());
      return;
    }
    const n = parseNum(raw);
    if (n === null) return setBad(true);
    setBad(false);
    ic.setManual(r.field, String(n));
  };
  const uid = parseAreaKey(r.field)?.prop === 'uid' ? getSurfaceType(Number(r.value)) : undefined;
  return (
    <>
      <input
        type="text"
        key={`${r.value}|${r.chosen.source}`}
        defaultValue={shown}
        aria-label={`Wert für ${fieldLabel(r.field)}`}
        aria-invalid={bad}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
      />
      {uid && <small className="uidname">{uid.categoryName} – {uid.name}</small>}
      {r.field.endsWith('.uid') && r.value === '0' && <small className="uidname">Manuell</small>}
    </>
  );
}

export function FindingsTable() {
  const ic = useImportCheck();
  const groups = sortGroups(ic.resolved);

  return (
    <Card n={3} title="Erkannte Werte" sub="Hier kannst du Werte korrigieren oder ergänzen. Eigene Eingaben („manuell“) gehen vor allem anderen.">
      {groups.length === 0 && <p className="hint">Noch nichts erkannt.</p>}
      {groups.map((g) => (
        <div key={g.title} className="fgroup">
          <h3>{g.title}</h3>
          <div className="tablewrap">
            <table className="data findings">
              <thead>
                <tr><th>Feld</th><th>Wert</th><th>Quelle</th><th aria-label="Aktionen" /></tr>
              </thead>
              <tbody>
                {g.rows.map((r) => {
                  const f = r.chosen;
                  return (
                    <tr key={r.field}>
                      <td>
                        {fieldLabel(r.field)}
                        {r.conflict && (
                          <div className="conflict" title={r.alternatives.map((a) => `${show(a.field, a.value)} (${a.source}${a.line ? `, Zeile ${a.line}` : ''})`).join('\n')}>
                            ⚠ Widerspruch: {r.alternatives.filter((a) => a.source !== 'Katalog').map((a) => `${show(a.field, a.value)} (${a.source}${a.line ? `, Z. ${a.line}` : ''})`).join('; ')}
                          </div>
                        )}
                      </td>
                      <td className="valcell"><ValueCell r={r} /></td>
                      <td>
                        <span className={`src ${f.source}`} title={f.context}>{f.source}</span>
                        {f.line ? <small> Zeile {f.line}</small> : null}
                      </td>
                      <td>
                        {f.source !== 'Katalog' && (
                          <button className="icon" aria-label={`${fieldLabel(r.field)} entfernen`} title={f.source === 'manuell' ? 'Eigenen Wert löschen' : 'Fundstelle entfernen'} onClick={() => ic.removeFinding(f)}>
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      {ic.removedCount > 0 && (
        <p className="hint">
          {ic.removedCount} Fundstelle{ic.removedCount === 1 ? '' : 'n'} entfernt. <button className="linkbtn" onClick={ic.restoreRemoved}>Wieder einblenden</button>
        </p>
      )}
      <ManualAdd />
    </Card>
  );
}

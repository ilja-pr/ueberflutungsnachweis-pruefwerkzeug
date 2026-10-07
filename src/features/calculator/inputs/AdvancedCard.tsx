import { useState } from 'react';
import { useCalculator } from '../../../shell/CalculatorContext';
import { DEFAULT_DURATIONS } from '../../../core/floodProof';
import { Field } from '../../../shared/components/Field';
import { NumInput } from '../../../shared/components/NumInput';

/** Eingeklappt: Zusatzgleichung 21 und Vergleichsmodi für den Excel-Abgleich. */
export function AdvancedCard() {
  const { inp, update } = useCalculator();
  const [newDur, setNewDur] = useState<number | null>(null);

  return (
    <details className="card adv">
      <summary>
        <h2>Weitere Gleichung und Vergleichsmodi</h2>
        <p className="cardsub">Gleichung 21 (mit Q_voll) und Einstellungen für den Excel-Abgleich. Im VSO gelten immer die Standardregeln.</p>
      </summary>
      <div className="advbody">
        <Field label="Gleichung 21: Q_voll der Grundleitung (optional)" hint="Abfluss bei Vollfüllung nach DIN 1986-100 Tab. A.5, bei Einleitbeschränkung deren Wert. Leer = Gl. 21 wird nicht gerechnet.">
          <NumInput value={inp.extras.qVoll} unit="l/s" onChange={(v) => update((d) => ({ ...d, extras: { ...d.extras, qVoll: v } }))} />
        </Field>

        <Field label="Jährlichkeit fest setzen">
          <select
            value={inp.returnPeriodOverride === null ? '' : String(inp.returnPeriodOverride)}
            onChange={(e) => update((d) => ({ ...d, returnPeriodOverride: e.target.value === '' ? null : Number(e.target.value) }))}
          >
            <option value="">Regel anwenden (Standard)</option>
            <option value="30">immer 30 Jahre</option>
            <option value="100">immer 100 Jahre</option>
          </select>
        </Field>

        <label className="check">
          <input type="checkbox" checked={inp.excludeCat7} onChange={(e) => update((d) => ({ ...d, excludeCat7: e.target.checked }))} />
          <span>Park, Rasen, Garten (Kat. 7) nicht in A_ges zählen</span>
        </label>

        <div className="durs">
          <span className="flabel">Regendauern</span>
          <div className="chips">
            {inp.durations.map((d) => (
              <span className="chip" key={d}>
                {d} min
                {inp.durations.length > 1 && (
                  <button aria-label={`Dauer ${d} min entfernen`} onClick={() => update((x) => ({ ...x, durations: x.durations.filter((v) => v !== d) }))}>
                    ✕
                  </button>
                )}
              </span>
            ))}
          </div>
          <span className="addDur">
            <NumInput value={newDur} unit="min" placeholder="z. B. 20" onChange={setNewDur} />
            <button
              className="btn"
              disabled={!newDur || newDur <= 0 || inp.durations.includes(newDur)}
              onClick={() => {
                if (!newDur) return;
                update((x) => ({ ...x, durations: [...x.durations, newDur].sort((a, b) => a - b) }));
                setNewDur(null);
              }}
            >
              hinzufügen
            </button>
            {inp.durations.join() !== DEFAULT_DURATIONS.join() && (
              <button className="btn ghost" onClick={() => update((x) => ({ ...x, durations: [...DEFAULT_DURATIONS] }))}>
                Standard 5 / 10 / 15
              </button>
            )}
          </span>
        </div>
      </div>
    </details>
  );
}

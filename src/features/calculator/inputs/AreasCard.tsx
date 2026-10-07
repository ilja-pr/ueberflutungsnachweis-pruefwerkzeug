import { useCalculator } from '../../../shell/CalculatorContext';
import { CATEGORY_NAMES, getSurfaceType, SURFACE_TYPES } from '../../../core/surfaceTypes';
import { Card, Field } from '../../../shared/components/Field';
import { NumInput } from '../../../shared/components/NumInput';
import { fmt } from '../../../shared/lib/format';
import { newId } from '../defaults';
import type { AreaRowState } from '../types';

export function AreasCard() {
  const { inp, update } = useCalculator();
  const patchRow = (id: string, patch: Partial<AreaRowState>) =>
    update((d) => ({ ...d, areas: d.areas.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
  const sumArea = inp.areas.reduce((s, a) => s + (a.area ?? 0), 0);

  return (
    <Card n={3} title="Flächen" sub="Wie im Konfigurator. C_s und Dach/Gelände kommen aus der Flächenart.">
      <div className="areas">
        {inp.areas.map((row, i) => {
          const st = row.surfaceUid ? getSurfaceType(row.surfaceUid) : undefined;
          return (
            <div className="arearow" key={row.id}>
              <span className="rownum">{i + 1}</span>
              <select aria-label={`Flächenart Zeile ${i + 1}`} value={row.surfaceUid} onChange={(e) => patchRow(row.id, { surfaceUid: Number(e.target.value) })}>
                {Object.entries(CATEGORY_NAMES).map(([cat, name]) => (
                  <optgroup key={cat} label={`${cat} ${name} (${Number(cat) <= 3 ? 'Dach' : 'außerh. Gebäude'})`}>
                    {SURFACE_TYPES.filter((s) => s.category === Number(cat)).map((s) => (
                      <option key={s.uid} value={s.uid}>
                        {s.name} (C_s {fmt(s.cs, 2)})
                      </option>
                    ))}
                  </optgroup>
                ))}
                <option value={0}>Manuell (eigener C_s)</option>
              </select>
              <NumInput value={row.area} unit="m²" ariaLabel={`Fläche Zeile ${i + 1}`} placeholder="Fläche" onChange={(v) => patchRow(row.id, { area: v })} />
              <button className="icon" title="Zeile löschen" aria-label={`Zeile ${i + 1} löschen`} onClick={() => update((d) => ({ ...d, areas: d.areas.filter((a) => a.id !== row.id) }))}>
                ✕
              </button>
              <div className="areameta">
                {st ? (
                  <>
                    <span className="tag">{st.isRoof ? 'Dach' : 'außerh. Gebäude'}</span> C_s {fmt(st.cs, 2)} · C_m {fmt(st.cm, 2)}
                  </>
                ) : (
                  <span className="manual">
                    <input type="text" placeholder="Bezeichnung" value={row.manualName} onChange={(e) => patchRow(row.id, { manualName: e.target.value })} />
                    <NumInput value={row.csCustom} placeholder="C_s 0–1" ariaLabel={`C_s Zeile ${i + 1}`} onChange={(v) => patchRow(row.id, { csCustom: v })} />
                    <label className="check">
                      <input type="checkbox" checked={row.isRoofCustom} onChange={(e) => patchRow(row.id, { isRoofCustom: e.target.checked })} /> zählt als Dach
                    </label>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="rowactions">
        <button
          className="btn"
          disabled={inp.areas.length >= 14}
          onClick={() => update((d) => ({ ...d, areas: [...d.areas, { id: newId(), surfaceUid: 11, manualName: '', area: null, csCustom: null, isRoofCustom: false }] }))}
        >
          + Fläche hinzufügen
        </button>
        <span className="sum">
          Summe: <b>{fmt(sumArea, 0)} m²</b> (max. 14 Zeilen wie im VSO)
        </span>
      </div>
      <div className="grid2">
        <Field label="A_ges überschreiben (optional)" hint="Leer = Summe der Flächen. Im VSO optional im Mitarbeiter-Bereich.">
          <NumInput value={inp.totalAreaOverride} unit="m²" placeholder="leer = Summe" onChange={(v) => update((d) => ({ ...d, totalAreaOverride: v }))} />
        </Field>
      </div>
    </Card>
  );
}

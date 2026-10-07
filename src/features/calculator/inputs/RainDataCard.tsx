import { useCalculator } from '../../../shell/CalculatorContext';
import { determineReturnPeriod, rainIntensityFromDepth } from '../../../core/floodProof';
import { Card } from '../../../shared/components/Field';
import { NumInput } from '../../../shared/components/NumInput';
import { fmt } from '../../../shared/lib/format';
import type { Inputs, RainUnit } from '../types';

/** Alle Werte der Regentabelle zwischen r [l/(s·ha)] und hN [mm] umrechnen. */
function convertRain(rain: Inputs['rain'], to: RainUnit): Inputs['rain'] {
  const out: Inputs['rain'] = {};
  for (const [t, byD] of Object.entries(rain)) {
    out[t] = {};
    for (const [d, v] of Object.entries(byD)) {
      if (v === null) out[t][d] = null;
      else {
        const conv = to === 'hN' ? (v * Number(d) * 60) / 10000 : rainIntensityFromDepth(v, Number(d));
        out[t][d] = Math.round(conv * 1000) / 1000;
      }
    }
  }
  return out;
}

export function RainDataCard() {
  const { inp, update } = useCalculator();
  const T = inp.returnPeriodOverride ?? determineReturnPeriod(inp.rainFrequency);

  const switchUnit = (to: RainUnit) => {
    if (to !== inp.rainUnit) update((x) => ({ ...x, rainUnit: to, rain: convertRain(x.rain, to) }));
  };

  return (
    <Card n={4} title="Regendaten" sub="Aus KOSTRA-DWD oder der Excel. T = 2 immer, dazu T = 30 oder 100.">
      <div className="rainhead">
        <div className="seg" role="group" aria-label="Einheit der Regendaten">
          <button className={inp.rainUnit === 'r' ? 'on' : ''} onClick={() => switchUnit('r')}>
            r in l/(s·ha)
          </button>
          <button className={inp.rainUnit === 'hN' ? 'on' : ''} onClick={() => switchUnit('hN')}>
            hN in mm
          </button>
        </div>
        <span className="warnbox">
          Vorbelegt sind <b>Beispielwerte</b>, keine echten KOSTRA-Daten.
        </span>
      </div>
      <div className="tablewrap">
        <table className="rain">
          <thead>
            <tr>
              <th>Jährlichkeit</th>
              {inp.durations.map((d) => (
                <th key={d}>D = {d} min</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[2, 30, 100].map((t) => (
              <tr key={t} className={t === T ? 'active' : ''}>
                <th>
                  T = {t}
                  <small>{t === 2 ? ' Abzug (immer)' : t === T ? ' Nachweis' : ''}</small>
                </th>
                {inp.durations.map((d) => (
                  <td key={d}>
                    <NumInput
                      value={inp.rain[String(t)]?.[String(d)] ?? null}
                      ariaLabel={`Regen T=${t} D=${d}`}
                      onChange={(v) => update((x) => ({ ...x, rain: { ...x.rain, [String(t)]: { ...x.rain[String(t)], [String(d)]: v } } }))}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {inp.rainUnit === 'hN' && (
        <p className="hint">Umrechnung: r = hN · 10 000 / (D · 60). Beispiel: 10 mm in 15 min = {fmt(rainIntensityFromDepth(10, 15), 1)} l/(s·ha).</p>
      )}
    </Card>
  );
}

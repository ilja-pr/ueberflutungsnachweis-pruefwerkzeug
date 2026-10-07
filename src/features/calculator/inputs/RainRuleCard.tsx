import { useCalculator } from '../../../shell/CalculatorContext';
import { determineReturnPeriod } from '../../../core/floodProof';
import { Card, Field } from '../../../shared/components/Field';

const FREQUENCIES = [1, 2, 3, 5, 10, 15, 20, 30, 50, 100];

export function RainRuleCard() {
  const { inp, update } = useCalculator();
  const T = inp.returnPeriodOverride ?? determineReturnPeriod(inp.rainFrequency);
  return (
    <Card n={2} title="Nachweis-Regen" sub="Im VSO die Regenhäufigkeit, die der Kunde für die Bemessung wählt.">
      <div className="grid2">
        <Field label="Gewählte Regenhäufigkeit">
          <select
            value={inp.rainFrequency === null ? '' : String(inp.rainFrequency)}
            onChange={(e) => update((d) => ({ ...d, rainFrequency: e.target.value === '' ? null : Number(e.target.value) }))}
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {f} Jahre
              </option>
            ))}
            <option value="">keine gewählt (Mulden-Rigole 138-1)</option>
          </select>
        </Field>
        <div className="rule">
          <div className="rulehead">Regel</div>
          <div>
            Regenhäufigkeit <b>&gt; 10 Jahre</b> → <b>100-jährlicher</b> Regen, sonst <b>30-jährlicher</b>.
          </div>
          <div className="ruleres">
            Hier gilt: <b>T = {T} Jahre</b>
          </div>
        </div>
      </div>
    </Card>
  );
}

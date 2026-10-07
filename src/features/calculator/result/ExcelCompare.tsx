import { useCalculator } from '../../../shell/CalculatorContext';
import type { FloodProofResult } from '../../../core/floodProof';
import { Section } from '../../../shared/components/Field';
import { NumInput } from '../../../shared/components/NumInput';
import { fmt } from '../../../shared/lib/format';

const TOLERANCE = 0.01; // m³, Abnahmekriterium im Ticket

function Diff({ label, tool, excel }: { label: string; tool: number; excel: number }) {
  const d = tool - excel;
  const ok = Math.abs(d) <= TOLERANCE;
  return (
    <p className={`cmp ${ok ? 'ok' : 'bad'}`}>
      {label}: Tool {fmt(tool, 3)} · Excel {fmt(excel, 3)} · Differenz {fmt(d, 3)} m³ → <b>{ok ? 'passt' : 'Abweichung'}</b>
    </p>
  );
}

export function ExcelCompare({ r }: { r: FloodProofResult }) {
  const { inp, update } = useCalculator();
  const x = inp.excel;
  const off = x.vRueckMax !== null && Math.abs(r.vRueckMax - x.vRueckMax) > TOLERANCE;

  return (
    <Section title="Abgleich mit der Excel" sub="Toleranz ±0,01 m³" open>
      <div className="grid2">
        <label className="field">
          <span className="flabel">Excel: V_Rück,max</span>
          <NumInput value={x.vRueckMax} unit="m³" onChange={(v) => update((d) => ({ ...d, excel: { ...d.excel, vRueckMax: v } }))} />
        </label>
        <label className="field">
          <span className="flabel">Excel: V_vorh (optional)</span>
          <NumInput value={x.vVorh} unit="m³" onChange={(v) => update((d) => ({ ...d, excel: { ...d.excel, vVorh: v } }))} />
        </label>
      </div>
      {x.vRueckMax !== null && <Diff label="V_Rück,max" tool={r.vRueckMax} excel={x.vRueckMax} />}
      {x.vVorh !== null && <Diff label="V_vorh" tool={r.storageVolume} excel={x.vVorh} />}
      {off && (
        <details className="more" open>
          <summary>Abweichung? Das sind die üblichen Ursachen</summary>
          <ol className="causes">
            <li>Andere Regendauern: Excel nur D = 5 min? Dann in den Vergleichsmodi nur 5 min stehen lassen.</li>
            <li>Anderes T: Vergleichsmodus „Jährlichkeit fest setzen“ ausprobieren.</li>
            <li>Grünflächen (Kat. 7) in der Excel nicht in A_ges: Vergleichsmodus einschalten.</li>
            <li>Andere C_s-Werte oder andere Dach-Zuordnung in der Excel.</li>
            <li>Excel mit hN statt r: Einheit bei den Regendaten umschalten.</li>
            <li>Excel nimmt die größere Menge aus Gl. 20 und Gl. 21: Q_voll in den Vergleichsmodi eintragen.</li>
            <li>Excel zieht Versickerung während des Regens ab (hier bewusst nicht).</li>
          </ol>
        </details>
      )}
    </Section>
  );
}

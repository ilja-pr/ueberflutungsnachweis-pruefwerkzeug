import { useCalculator } from '../../../shell/CalculatorContext';
import { Card, Field } from '../../../shared/components/Field';

export function ProjectCard() {
  const { inp, update } = useCalculator();
  return (
    <Card n={1} title="Projekt" sub="Nur für die Beschriftung.">
      <div className="grid2">
        <Field label="Objekt / Projektname">
          <input type="text" value={inp.projectName} onChange={(e) => update((d) => ({ ...d, projectName: e.target.value }))} />
        </Field>
        <Field label="Anfragenummer (optional)">
          <input type="text" value={inp.requestNo} onChange={(e) => update((d) => ({ ...d, requestNo: e.target.value }))} />
        </Field>
      </div>
    </Card>
  );
}

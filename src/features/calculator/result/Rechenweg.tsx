import { Section } from '../../../shared/components/Field';
import type { Step } from '../explain';

export function Rechenweg({ steps }: { steps: Step[] }) {
  return (
    <Section title="Rechenweg mit Zahlen" sub="das soll der Server später rechnen">
      {steps.map((s) => (
        <div className="step" key={s.title}>
          <h3>{s.title}</h3>
          <pre>{s.lines.join('\n')}</pre>
        </div>
      ))}
    </Section>
  );
}

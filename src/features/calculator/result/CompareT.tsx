import type { FloodProofResult } from '../../../core/floodProof';
import { DataTable } from '../../../shared/components/DataTable';
import { Section } from '../../../shared/components/Field';
import { fmt } from '../../../shared/lib/format';

export function CompareT({ r, alt }: { r: FloodProofResult; alt: Record<number, FloodProofResult | null> }) {
  return (
    <Section title="Vergleich T = 30 und T = 100" sub="dieselben Eingaben, beide Regen">
      <DataTable
        head={['T', 'V_Rück,max [m³]', 'Auslastung', 'Ergebnis']}
        rows={([30, 100] as const).map((T) => {
          const a = alt[T];
          return [
            `${T} Jahre${T === r.returnPeriod ? ' (gilt)' : ''}`,
            a ? fmt(a.vRueckMax, 3) : '–',
            a?.utilization != null ? `${fmt(a.utilization * 100, 0)} %` : '–',
            a ? (a.passed ? 'erfüllt' : 'nicht erfüllt') : 'keine Regendaten',
          ];
        })}
        rightFrom={1}
        highlightRow={[30, 100].indexOf(r.returnPeriod)}
      />
    </Section>
  );
}

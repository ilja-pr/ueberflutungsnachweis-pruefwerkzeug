import type { FloodProofResult } from '../../../core/floodProof';
import { Card } from '../../../shared/components/Field';
import { DataTable } from '../../../shared/components/DataTable';
import { fmt } from '../../../shared/lib/format';

export function DurationTable({ r }: { r: FloodProofResult }) {
  return (
    <Card title="Je Regendauer" sub="Maßgebend ist die markierte Zeile. Zufluss und Ableitung zum Abgleich mit der Excel.">
      <DataTable
        head={['D [min]', 'r(D,2)', `r(D,${r.returnPeriod})`, 'Zufluss [m³]', 'Ableitung [m³]', 'V_Rück [m³]']}
        rows={r.rows.map((row) => [row.duration, fmt(row.r2, 2), fmt(row.rT, 2), fmt(row.vInflow, 3), fmt(row.vDrain, 3), fmt(row.vRueck, 3)])}
        rightFrom={1}
        highlightRow={r.rows.findIndex((x) => x.duration === r.durationMax)}
      />
    </Card>
  );
}

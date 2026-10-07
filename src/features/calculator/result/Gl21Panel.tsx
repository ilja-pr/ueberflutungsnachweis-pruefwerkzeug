import type { FloodProofResult } from '../../../core/floodProof';
import type { Gl21Result } from '../../../core/gl21';
import { DataTable } from '../../../shared/components/DataTable';
import { Section } from '../../../shared/components/Field';
import { fmt } from '../../../shared/lib/format';

/** Gleichung 21 (mit Q_voll): nur sichtbar, wenn Q_voll eingetragen ist. */
export function Gl21Panel({ r, g }: { r: FloodProofResult; g: Gl21Result }) {
  const governing = Math.max(r.vRueckMax, g.vRueckMax);
  const ok = r.storageVolume >= governing;
  return (
    <Section title="Gleichung 21 (mit Q_voll)" sub={`Q_voll = ${fmt(g.qVoll, 2)} l/s`} open>
      <DataTable
        head={['D [min]', `r(D,${g.returnPeriod})`, 'V_Rück Gl. 21 [m³]']}
        rows={g.rows.map((x) => [x.duration, fmt(x.rT, 2), fmt(x.vRueck, 3)])}
        rightFrom={1}
        highlightRow={g.rows.findIndex((x) => x.duration === g.durationMax)}
      />
      <p className={`cmp ${ok ? 'ok' : 'bad'}`}>
        Gl. 20: {fmt(r.vRueckMax, 3)} m³ · Gl. 21: {fmt(g.vRueckMax, 3)} m³ · maßgebend (größerer Wert): <b>{fmt(governing, 3)} m³</b> → {ok ? 'erfüllt' : 'nicht erfüllt'}
      </p>
    </Section>
  );
}

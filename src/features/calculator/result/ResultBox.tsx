import type { FloodProofResult } from '../../../core/floodProof';
import { fmt } from '../../../shared/lib/format';

export function ResultBox({ r }: { r: FloodProofResult }) {
  const pct = r.utilization === null ? 0 : Math.min(100, r.utilization * 100);
  return (
    <div className={`resbox ${r.passed ? 'ok' : 'bad'}`} role="status">
      <h2>{r.passed ? '✔ Nachweis erfüllt' : '✘ Nachweis nicht erfüllt'}</h2>
      <p>
        {r.passed
          ? `Die Anlage fasst ${fmt(r.storageVolume, 2)} m³ und braucht ${fmt(r.vRueckMax, 2)} m³. Reserve ${fmt(r.reserve, 2)} m³.`
          : `Es fehlen ${fmt(-r.reserve, 2)} m³. Anlage vergrößern.`}
      </p>
      <div className="nums">
        <div className="num"><span>erforderlich</span><b>{fmt(r.vRueckMax, 2)} m³</b><small>V_Rück,max bei D = {r.durationMax} min</small></div>
        <div className="num"><span>vorhanden</span><b>{fmt(r.storageVolume, 2)} m³</b><small>V_vorh</small></div>
        <div className="num"><span>Auslastung</span><b>{r.utilization === null ? '–' : `${fmt(r.utilization * 100, 0)} %`}</b><small>{r.mandatory ? 'Nachweis Pflicht' : 'freiwillig'}</small></div>
      </div>
      <div className="bar" aria-hidden><i style={{ width: `${pct}%` }} /></div>
      <p className="reason">Nachweis-Regen: <b>{r.returnPeriod}-jährlich</b> ({r.returnPeriodReason})</p>
    </div>
  );
}

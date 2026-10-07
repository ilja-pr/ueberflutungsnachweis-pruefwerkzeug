import { useCalculator } from '../../../shell/CalculatorContext';
import { Card, Field } from '../../../shared/components/Field';
import { NumInput } from '../../../shared/components/NumInput';
import { fmt } from '../../../shared/lib/format';
import type { RigoleInputs, RigoleMode } from '../types';

const MODES: [RigoleMode, string][] = [
  ['blocks', 'aus Blöcken'],
  ['dims', 'Länge × Breite × Höhe'],
  ['volume', 'Volumen direkt'],
];

export function RigoleCard() {
  const { inp, update, computed } = useCalculator();
  const r = inp.rigole;
  const setR = (patch: Partial<RigoleInputs>) => update((d) => ({ ...d, rigole: { ...d.rigole, ...patch } }));

  return (
    <Card n={5} title="Anlage (Rigole)" sub="Die bemessene Rigole, nicht der Platz des Kunden.">
      <div className="seg wide" role="group" aria-label="Eingabeart">
        {MODES.map(([m, label]) => (
          <button key={m} className={r.mode === m ? 'on' : ''} onClick={() => setR({ mode: m })}>
            {label}
          </button>
        ))}
      </div>
      <div className="grid2">
        <Field label="Entwässerungsart">
          <select value={r.infiltrationType} onChange={(e) => setR({ infiltrationType: Number(e.target.value) as 1 | 2 })}>
            <option value={1}>Rigole</option>
            <option value={2}>Mulden-Rigole (Muldenvolumen addieren)</option>
          </select>
        </Field>
        {r.infiltrationType === 2 && (
          <Field label="Muldenvolumen V_M">
            <NumInput value={r.swaleVolume} unit="m³" onChange={(v) => setR({ swaleVolume: v })} />
          </Field>
        )}
      </div>

      {r.mode === 'blocks' && (
        <div className="grid3">
          <Field label="Blöcke in der Länge"><NumInput value={r.blocksLength} onChange={(v) => setR({ blocksLength: v })} /></Field>
          <Field label="Blöcke in der Breite"><NumInput value={r.blocksWidth} onChange={(v) => setR({ blocksWidth: v })} /></Field>
          <Field label="Lagen"><NumInput value={r.layers} onChange={(v) => setR({ layers: v })} /></Field>
          <Field label="Blocklänge"><NumInput value={r.blocLength} unit="m" onChange={(v) => setR({ blocLength: v })} /></Field>
          <Field label="Blockbreite"><NumInput value={r.blocWidth} unit="m" onChange={(v) => setR({ blocWidth: v })} /></Field>
          <Field label="Blockhöhe je Lage"><NumInput value={r.displayBlocHeight} unit="m" onChange={(v) => setR({ displayBlocHeight: v })} /></Field>
          <label className="check">
            <input type="checkbox" checked={r.extraBloc} onChange={(e) => setR({ extraBloc: e.target.checked })} /> zusätzliche halbe Lage
          </label>
          {r.extraBloc && <Field label="Höhe der halben Lage"><NumInput value={r.extraBlocHeight} unit="m" onChange={(v) => setR({ extraBlocHeight: v })} /></Field>}
        </div>
      )}
      {r.mode === 'dims' && (
        <div className="grid3">
          <Field label="Länge L_R"><NumInput value={r.length} unit="m" onChange={(v) => setR({ length: v })} /></Field>
          <Field label="Breite B_R"><NumInput value={r.width} unit="m" onChange={(v) => setR({ width: v })} /></Field>
          <Field label="Speicherhöhe H_R" hint="ohne Bodenplatte"><NumInput value={r.height} unit="m" onChange={(v) => setR({ height: v })} /></Field>
        </div>
      )}
      {r.mode === 'volume' && (
        <div className="grid3">
          <Field label="Vorhandenes Volumen V_vorh" hint="inkl. Speicherkoeffizient, wie die Bemessung es ausgibt">
            <NumInput value={r.volumeDirect} unit="m³" onChange={(v) => setR({ volumeDirect: v })} />
          </Field>
        </div>
      )}
      {r.mode !== 'volume' && (
        <div className="grid3">
          <Field label="Speicherkoeffizient s_R" hint="Produktdaten, z. B. 0,95"><NumInput value={r.storageCoeff} onChange={(v) => setR({ storageCoeff: v })} /></Field>
          {r.mode === 'blocks' && (
            <Field label="Verfügbare Länge (Kunde)" hint="nur Grenze für den Vergrößerungsvorschlag"><NumInput value={r.availableLength} unit="m" onChange={(v) => setR({ availableLength: v })} /></Field>
          )}
        </div>
      )}
      {computed.volume && <p className="volline">V_vorh = <b>{fmt(computed.volume.volume, 2)} m³</b></p>}
      <p className="hint">Block- und Produktmaße sind Beispielwerte. Echte Werte kommen aus dem Produktdatensatz des VSO.</p>
    </Card>
  );
}

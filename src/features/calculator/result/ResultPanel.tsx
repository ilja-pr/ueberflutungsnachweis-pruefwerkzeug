import { useCalculator } from '../../../shell/CalculatorContext';
import { fmt } from '../../../shared/lib/format';
import { buildSteps } from '../explain';
import { CompareT } from './CompareT';
import { DurationTable } from './DurationTable';
import { ExcelCompare } from './ExcelCompare';
import { Gl21Panel } from './Gl21Panel';
import { Rechenweg } from './Rechenweg';
import { ResultBox } from './ResultBox';

export function ResultPanel() {
  const { inp, computed: c } = useCalculator();
  const r = c.result;

  if (!r || !c.volume) {
    return (
      <div className="result">
        <div className="resbox bad">
          <h2>Noch keine Berechnung</h2>
          <ul>{c.errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      </div>
    );
  }

  return (
    <div className="result">
      <ResultBox r={r} />
      {c.suggestion && (
        <div className="note">
          <b>Vorschlag:</b> +{c.suggestion.additionalRows} Blockreihe(n) in der Länge → neue Länge {fmt(c.suggestion.newLength, 2)} m.{' '}
          {c.suggestion.fitsAvailableLength ? 'Passt in den verfügbaren Platz.' : 'Überschreitet den verfügbaren Platz: Rücksprache Technik.'}
        </div>
      )}
      {c.warnings.map((w) => <div className="note warn" key={w}>{w}</div>)}
      <DurationTable r={r} />
      {c.gl21 && <Gl21Panel r={r} g={c.gl21} />}
      <CompareT r={r} alt={c.alt} />
      <Rechenweg steps={buildSteps(inp, c)} />
      <ExcelCompare r={r} />
    </div>
  );
}

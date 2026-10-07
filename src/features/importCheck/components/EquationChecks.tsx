import Link from 'next/link';
import { useState } from 'react';
import { Card } from '../../../shared/components/Field';
import { downloadFile } from '../../../shared/lib/files';
import { CopyButton } from '../../../shared/components/CopyButton';
import { useCalculator } from '../../../shell/CalculatorContext';
import { missingReport, STATE_TEXT, VERDICT_TEXT } from '../evaluate';
import { useImportCheck } from '../ImportCheckContext';
import { applyToInputs, type ApplyResult } from '../toInputs';
import type { EquationReport } from '../types';

function VerdictChip({ r }: { r: EquationReport }) {
  return <span className={`verdict ${r.verdict}`}>{VERDICT_TEXT[r.verdict]}</span>;
}

function Strip({ reports }: { reports: EquationReport[] }) {
  return (
    <div className="strip" role="list">
      {reports.map((r) => {
        const open = r.requirements.filter((q) => q.state === 'missing' || q.state === 'partial' || q.state === 'blocked').length;
        return (
          <a
            key={r.id}
            href={`#eq-${r.id}`}
            className={`stripitem ${r.verdict}`}
            role="listitem"
            onClick={() => document.getElementById(`eq-${r.id}`)?.setAttribute('open', '')}
          >
            <b>{r.title.replace('Gleichung', 'Gl.')}</b>
            <span>{VERDICT_TEXT[r.verdict]}</span>
            {r.verdict === 'unvollstaendig' && <small>{open} Punkt{open === 1 ? '' : 'e'} offen</small>}
          </a>
        );
      })}
    </div>
  );
}

function EquationCard({ r, open }: { r: EquationReport; open?: boolean }) {
  return (
    <details className={`eq ${r.verdict}`} id={`eq-${r.id}`} open={open}>
      <summary>
        <span className="eqtitle">{r.title}</span>
        <VerdictChip r={r} />
        <span className="eqstatus">{r.statusText}</span>
      </summary>
      <div className="eqbody">
        <p className="eqformula"><code>{r.formula}</code></p>
        <p className="hint">{r.when}</p>
        {r.requirements.length > 0 && (
          <ul className="reqlist">
            {r.requirements.map((q) => (
              <li key={q.id} className={`reqrow ${q.state}`}>
                <span className={`state ${q.state}`}>{STATE_TEXT[q.state]}</span>
                <div className="reqmain">
                  <div className="reqlabel">
                    {q.symbol !== '–' && <b>{q.symbol} </b>}{q.label}
                    {q.unit && <small> [{q.unit}]</small>}
                  </div>
                  <div className="reqdetail">{q.detail}</div>
                  {(q.state === 'missing' || q.state === 'partial') && (
                    <div className="reqwhere">
                      <b>Woher:</b> {q.where}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

export function EquationChecks() {
  const ic = useImportCheck();
  const { inp, replace } = useCalculator();
  const [applied, setApplied] = useState<ApplyResult | null>(null);
  const hasData = ic.findings.length > 0;

  function apply() {
    const res = applyToInputs(inp, ic.data);
    setApplied(res);
    if (res.applied.length) replace(res.inputs);
  }

  return (
    <Card n={2} title="Prüfung: Was fehlt für die Gleichungen?" sub="Pro Gleichung die Eingangsgrößen aus dem Import. Grün = da, gelb = Annahme, rot = fehlt.">
      {!hasData && <div className="note">Noch nichts geladen. Die Prüfung zeigt trotzdem, was jede Gleichung braucht und woher man es bekommt.</div>}
      <Strip reports={ic.reports} />
      <div className="eqs">
        {ic.reports.map((r) => (
          <EquationCard key={r.id} r={r} open={r.id === 'gl20'} />
        ))}
      </div>
      <div className="rowactions">
        <button className="btn primary" onClick={apply} disabled={!hasData}>In den Rechner übernehmen</button>
        <CopyButton text={() => missingReport(ic.reports)} label="Fehlende Angaben kopieren" />
        <button className="linkbtn" onClick={() => downloadFile('Ueberflutungsnachweis_fehlende_Angaben.txt', 'text/plain', missingReport(ic.reports))}>
          als Textdatei speichern
        </button>
      </div>
      {applied && (
        <div className="note" role="status">
          {applied.applied.length > 0 ? (
            <>
              <b>Übernommen:</b> {applied.applied.join(', ')}.{' '}
              <Link className="linkbtn" href="/">Zum Rechner</Link>
            </>
          ) : (
            <b>Nichts übernommen.</b>
          )}
          {applied.skipped.length > 0 && (
            <>
              <br />
              <b>Nicht übernommen:</b> {applied.skipped.join('; ')}.
            </>
          )}
        </div>
      )}
    </Card>
  );
}

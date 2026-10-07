import type { ReactNode } from 'react';

interface Props {
  head: ReactNode[];
  rows: ReactNode[][];
  /** ab dieser Spalte rechtsbündig (Zahlen). Standard: keine */
  rightFrom?: number;
  /** Zeile hervorheben */
  highlightRow?: number;
  className?: string;
}

export function DataTable({ head, rows, rightFrom = Infinity, highlightRow = -1, className = '' }: Props) {
  return (
    <div className="tablewrap">
      <table className={`data ${className}`}>
        <thead>
          <tr>{head.map((h, i) => <th key={i} className={i >= rightFrom ? 'r' : ''}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className={ri === highlightRow ? 'hl' : ''}>
              {r.map((c, ci) => <td key={ci} className={ci >= rightFrom ? 'r' : ''}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

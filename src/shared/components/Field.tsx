import type { ReactNode } from 'react';

export function Field({ label, hint, children, wide }: { label: ReactNode; hint?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`field ${wide ? 'wide' : ''}`}>
      <span className="flabel">{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export function Card({ n, title, sub, children }: { n?: number; title: string; sub?: ReactNode; children: ReactNode }) {
  return (
    <section className="card">
      <header className="cardhead">
        <h2>
          {n !== undefined && <span className="cardnum">{n}</span>}
          {title}
        </h2>
        {sub && <p className="cardsub">{sub}</p>}
      </header>
      {children}
    </section>
  );
}

/** Einklappbarer Abschnitt, schlicht. */
export function Section({ title, sub, open, children }: { title: string; sub?: ReactNode; open?: boolean; children: ReactNode }) {
  return (
    <details className="sec" open={open}>
      <summary>
        <span className="sectitle">{title}</span>
        {sub && <span className="secsub">{sub}</span>}
      </summary>
      <div className="secbody">{children}</div>
    </details>
  );
}

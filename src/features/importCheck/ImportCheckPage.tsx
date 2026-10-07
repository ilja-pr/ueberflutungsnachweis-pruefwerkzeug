'use client';

import { EquationChecks } from './components/EquationChecks';
import { FindingsTable } from './components/FindingsTable';
import { LoadCard } from './components/LoadCard';
import { RawText } from './components/RawText';

export function ImportCheckPage() {
  return (
    <main className="page wide importcheck">
      <h1>VSO-Daten laden und prüfen</h1>
      <p className="lead">
        Lade hier, was aus dem VSO herauskommt (PDF, JSON, Formulardaten oder kopierter Text). Das Werkzeug zeigt, was es erkannt hat und was für die
        Gleichungen 19, 20, 21 und 22 noch fehlt. Mit einem Klick landen die Werte im Rechner.
      </p>
      <LoadCard />
      <EquationChecks />
      <FindingsTable />
      <RawText />
    </main>
  );
}

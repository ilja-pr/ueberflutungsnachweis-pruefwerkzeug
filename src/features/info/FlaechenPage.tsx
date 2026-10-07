'use client';

import { useState } from 'react';
import { CATEGORY_NAMES, RAMP_UID, SURFACE_TYPES } from '../../core/surfaceTypes';
import { fmt } from '../../shared/lib/format';

export function FlaechenPage() {
  const [cat, setCat] = useState(0);
  const rows = SURFACE_TYPES.filter((s) => cat === 0 || s.category === cat);
  return (
    <main className="page">
      <h1>Flächenarten und Abflussbeiwerte</h1>
      <p className="lead">
        Alle 30 Flächenarten, 1:1 aus dem Live-System ausgelesen (Stand 07.10.2026). C<sub>m</sub> ist der mittlere Abflussbeiwert für die Bemessung der Versickerung (und für A<sub>u</sub> in Gl. 22),
        C<sub>s</sub> der Spitzenabflussbeiwert, der für Gl. 20 zählt. Das Kundenformular schickt C<sub>s</sub> nicht mit, der Server muss ihn über die UID der Flächenart nachschlagen.
      </p>
      <div className="seg wide" role="group" aria-label="Kategorie filtern">
        <button className={cat === 0 ? 'on' : ''} onClick={() => setCat(0)}>alle</button>
        {Object.entries(CATEGORY_NAMES).map(([k, v]) => (
          <button key={k} className={cat === Number(k) ? 'on' : ''} onClick={() => setCat(Number(k))}>{k} {v}</button>
        ))}
      </div>
      <div className="tablewrap">
        <table className="data">
          <thead>
            <tr><th>Kat.</th><th>Kategorie</th><th>UID</th><th>Flächenart</th><th className="r">C<sub>m</sub></th><th className="r">C<sub>s</sub></th><th>Gruppe</th></tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.uid}>
                <td>{s.category}</td>
                <td>{s.categoryName}</td>
                <td>{s.uid}</td>
                <td>{s.name}{s.uid === RAMP_UID ? ' (*)' : ''}</td>
                <td className="r">{fmt(s.cm, 2)}</td>
                <td className="r">{fmt(s.cs, 2)}</td>
                <td><span className={`tag ${s.isRoof ? 'roof' : 'fag'}`}>{s.isRoof ? 'Dach' : 'außerh. Gebäude'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint">(*) UID 14: Die DIN verlangt für Rampen mit Neigung zum Gebäude eine gesonderte Betrachtung. Das Prüfwerkzeug rechnet normal und zeigt einen Hinweis.</p>
    </main>
  );
}

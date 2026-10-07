import { MANDATORY_AREA_THRESHOLD, RAIN_FREQUENCY_SWITCH } from '../../core/floodProof';
import { fmt } from '../../shared/lib/format';
import type { Computed, Inputs } from './types';

export interface Step {
  title: string;
  lines: string[];
}

/** Rechenweg mit eingesetzten Zahlen. Wird in der Oberfläche und in der Ausgabe gleich verwendet. */
export function buildSteps(inp: Inputs, c: Computed): Step[] {
  const r = c.result;
  if (!r || !c.volume) return [];
  const sumCs = r.aDachCs + r.aFaGCs;

  const steps: Step[] = [
    {
      title: '1  Nachweis-Regen wählen',
      lines: [
        inp.rainFrequency === null
          ? 'Keine Regenhäufigkeit gewählt (Mulden-Rigole, DWA-A 138-1) → T = 30 Jahre.'
          : `Gewählte Regenhäufigkeit: ${inp.rainFrequency} Jahre. Regel: > ${RAIN_FREQUENCY_SWITCH} Jahre → 100-jährlich, sonst 30-jährlich.`,
        `→ T = ${r.returnPeriod} Jahre (${r.returnPeriodReason})`,
      ],
    },
    {
      title: '2  Flächen und Abflussbeiwerte',
      lines: [
        ...r.areas.map((a) => `${a.group === 'Dach' ? 'Dach' : 'außerh. Geb.'}: ${fmt(a.area, 0)} m² · C_s ${fmt(a.cs, 2)} = ${fmt(a.areaCs, 2)} m²   (${a.name})`),
        `A_Dach = ${fmt(r.aDach, 0)} m² · A_FaG = ${fmt(r.aFaG, 0)} m²`,
        r.aGesIsOverride
          ? `A_ges = ${fmt(r.aGes, 0)} m² (manuell überschrieben, Summe der Flächen wäre ${fmt(r.aGesSum, 0)} m²)`
          : `A_ges = A_Dach + A_FaG = ${fmt(r.aGes, 0)} m²`,
        `Σ(A · C_s) = ${fmt(r.aDachCs, 2)} (Dach) + ${fmt(r.aFaGCs, 2)} (außerh. Geb.) = ${fmt(sumCs, 2)} m²`,
        `Nachweis ${r.mandatory ? 'ist Pflicht' : 'ist freiwillig'}: A_ges ${r.mandatory ? '>' : '≤'} ${MANDATORY_AREA_THRESHOLD} m²`,
      ],
    },
    {
      title: '3  Rückhaltevolumen je Regendauer (DIN 1986-100, Gl. 20)',
      lines: [
        'V_Rück(D) = [ r(D,T) · A_ges − r(D,2) · Σ(A · C_s) ] · D · 60 / 10 000 000   [m³]',
        ...r.rows.flatMap((row) => [
          `D = ${row.duration} min:  Zufluss r(${row.duration},${r.returnPeriod}) · A_ges = ${fmt(row.rT, 2)} · ${fmt(r.aGes, 0)} = ${fmt(row.rT * r.aGes, 1)}`,
          `            Ableitung r(${row.duration},2) · Σ(A·C_s) = ${fmt(row.r2, 2)} · ${fmt(sumCs, 2)} = ${fmt(row.r2 * sumCs, 1)}`,
          `            V_Rück = (${fmt(row.rT * r.aGes, 1)} − ${fmt(row.r2 * sumCs, 1)}) · ${row.duration * 60} / 10 000 000 = ${fmt(row.vRueckRaw, 3)} m³${row.vRueckRaw < 0 ? '  → negativ, zählt als 0' : ''}`,
        ]),
      ],
    },
    {
      title: '4  Maßgebender Wert',
      lines: [`Größter Wert über alle Dauern: V_Rück,max = ${fmt(r.vRueckMax, 3)} m³ bei D = ${r.durationMax} min`],
    },
    { title: '5  Vorhandenes Volumen der Anlage', lines: c.volume.lines },
    {
      title: '6  Ergebnis',
      lines: [
        `V_vorh ≥ V_Rück,max ?   ${fmt(r.storageVolume, 3)} m³ ${r.passed ? '≥' : '<'} ${fmt(r.vRueckMax, 3)} m³  →  Nachweis ${r.passed ? 'ERFÜLLT' : 'NICHT ERFÜLLT'}`,
        `Auslastung = V_Rück,max / V_vorh = ${r.utilization === null ? '–' : fmt(r.utilization * 100, 0) + ' %'}`,
        r.passed ? `Reserve = ${fmt(r.reserve, 3)} m³` : `Fehlmenge = ${fmt(-r.reserve, 3)} m³`,
        ...(c.suggestion
          ? [`Vorschlag: +${c.suggestion.additionalRows} Blockreihe(n) in der Länge → neue Länge ${fmt(c.suggestion.newLength, 2)} m${c.suggestion.fitsAvailableLength ? ' (passt in den verfügbaren Platz)' : ' (überschreitet den verfügbaren Platz, Rücksprache Technik)'}`]
          : []),
      ],
    },
  ];

  if (c.gl21) {
    const g = c.gl21;
    steps.push({
      title: '7  Zusatz: Gleichung 21 (mit Q_voll)',
      lines: [
        'V_Rück(D) = [ r(D,T) · A_ges / 10 000 − Q_voll ] · D · 60 / 1000   [m³]',
        ...g.rows.map((row) => `D = ${row.duration} min:  (${fmt(row.rT, 2)} · ${fmt(r.aGes, 0)} / 10 000 − ${fmt(g.qVoll, 2)}) · ${row.duration * 60} / 1000 = ${fmt(row.vRueckRaw, 3)} m³${row.vRueckRaw < 0 ? '  → 0' : ''}`),
        `Gl. 21: V_Rück,max = ${fmt(g.vRueckMax, 3)} m³ bei D = ${g.durationMax} min`,
        `Maßgebend ist der größere Wert aus Gl. 20 und Gl. 21: ${fmt(Math.max(r.vRueckMax, g.vRueckMax), 3)} m³ → ${r.storageVolume >= Math.max(r.vRueckMax, g.vRueckMax) ? 'erfüllt' : 'NICHT erfüllt'}`,
      ],
    });
  }
  return steps;
}

import { describe, expect, it } from 'vitest';
import { calculateGl21 } from './gl21';

const rain = { 30: { 5: 480, 10: 340, 15: 270 }, 100: { 5: 590, 10: 415, 15: 330 } };

describe('Gleichung 21', () => {
  it('Handrechnung D=15, T=30: (270·950/10000 − 20)·900/1000 = 5,085 m³', () => {
    const r = calculateGl21(rain, 950, 20, 30, [5, 10, 15]);
    expect(r.rows.find((x) => x.duration === 15)!.vRueck).toBeCloseTo(5.085, 4);
    expect(r.rows.find((x) => x.duration === 5)!.vRueck).toBeCloseTo(7.68, 4); // (480·950/10000 − 20)·300/1000
  });
  it('größter Wert maßgebend, negative = 0', () => {
    const r = calculateGl21(rain, 950, 50, 30, [5, 10, 15]);
    expect(r.vRueckMax).toBe(0);
  });
  it('fehlende Regendaten → Fehler', () => {
    expect(() => calculateGl21({ 30: { 5: 480 } }, 950, 20, 30, [5, 10])).toThrow(/Regendaten fehlen/);
  });
});

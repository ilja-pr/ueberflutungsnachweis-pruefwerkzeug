import { describe, expect, it } from 'vitest';
import {
  calculate,
  determineReturnPeriod,
  enlargementSuggestion,
  geometryFromBlocks,
  rainIntensityFromDepth,
  storageVolume,
  type AreaInput,
  type RainTable,
} from './floodProof';
import { SURFACE_TYPES } from './surfaceTypes';

// Beispielwerte (keine echten KOSTRA-Daten), identisch zu tests/example.php
const rain: RainTable = {
  2: { 5: 255, 10: 175, 15: 138 },
  30: { 5: 480, 10: 340, 15: 270 },
  100: { 5: 590, 10: 415, 15: 330 },
};
const areas: AreaInput[] = [
  { name: 'Dachflächen (Schrägdach) – Ziegel', area: 600, cs: 1.0, isRoof: true },
  { name: 'Teildurchlässig – Betonsteinpflaster', area: 350, cs: 0.9, isRoof: false },
];
const storage = storageVolume(8.0, 2.4, 0.84, 0.95);

describe('Jährlichkeit T', () => {
  it('5 Jahre → 30', () => expect(determineReturnPeriod(5)).toBe(30));
  it('10 Jahre → 30 (genau 10 bleibt 30)', () => expect(determineReturnPeriod(10)).toBe(30));
  it('15 Jahre → 100', () => expect(determineReturnPeriod(15)).toBe(100));
  it('null → 30', () => expect(determineReturnPeriod(null)).toBe(30));
});

describe('Beispielrechnung', () => {
  it('T=30: 11,72 m³, erfüllt, 76 %', () => {
    const r = calculate(areas, rain, 5, storage);
    expect(r.returnPeriod).toBe(30);
    expect(r.aGes).toBeCloseTo(950, 9);
    expect(r.vRueckMax).toBeCloseTo(11.7207, 4);
    expect(r.durationMax).toBe(15);
    expect(r.mandatory).toBe(true);
    expect(r.passed).toBe(true);
    expect(r.utilization).toBeCloseTo(0.765, 2);
  });
  it('T=100: 16,85 m³, nicht erfüllt, fehlt 1,53 m³', () => {
    const r = calculate(areas, rain, 20, storage);
    expect(r.returnPeriod).toBe(100);
    expect(r.vRueckMax).toBeCloseTo(16.8507, 4);
    expect(r.passed).toBe(false);
    expect(r.reserve).toBeCloseTo(-1.5291, 3);
  });
  it('MuRi ohne rainFrequency = T30', () => {
    const r = calculate(areas, rain, null, storage);
    expect(r.returnPeriod).toBe(30);
    expect(r.vRueckMax).toBeCloseTo(11.7207, 4);
  });
  it('A_ges überschrieben', () => {
    const r = calculate(areas, rain, 5, storage, 1000);
    expect(r.aGes).toBe(1000);
    expect(r.aGesIsOverride).toBe(true);
  });
  it('negative Werte zählen als 0', () => {
    const r = calculate([{ name: 'x', area: 100, cs: 1, isRoof: true }], { 2: { 5: 300 }, 30: { 5: 200 } }, 5, 1, null, [5]);
    expect(r.rows[0].vRueckRaw).toBeLessThan(0);
    expect(r.vRueckMax).toBe(0);
  });
  it('fehlende Regendaten → Fehler', () => {
    expect(() => calculate(areas, { 2: rain[2] }, 5, storage)).toThrow(/Regendaten fehlen/);
  });
  it('C_s außerhalb 0..1 → Fehler', () => {
    expect(() => calculate([{ name: 'x', area: 1, cs: 1.2, isRoof: true }], rain, 5, storage)).toThrow();
  });
  it('T manuell überschreiben', () => {
    const r = calculate(areas, rain, 5, storage, null, [5, 10, 15], 100);
    expect(r.returnPeriod).toBe(100);
    expect(r.vRueckMax).toBeCloseTo(16.8507, 4);
  });
});

describe('Geometrie und Vorschlag', () => {
  it('10 × 3 Blöcke, 2 Lagen → 8,00 × 2,40 × 0,84 m', () => {
    const g = geometryFromBlocks(10, 3, 2, false, 0.8, 0.8, 0.42, 0.21, 0.03);
    expect(g.length).toBeCloseTo(8, 9);
    expect(g.width).toBeCloseTo(2.4, 9);
    expect(g.height).toBeCloseTo(0.84, 9);
    expect(g.installHeight).toBeCloseTo(0.87, 9);
    expect(storageVolume(g.length, g.width, g.height, 0.95)).toBeCloseTo(storage, 9);
  });
  it('zusätzliche halbe Lage', () => {
    expect(geometryFromBlocks(1, 1, 2, true, 0.8, 0.8, 0.42, 0.21).height).toBeCloseTo(1.05, 9);
  });
  it('Vorschlag +1 Reihe → 8,80 m', () => {
    const s = enlargementSuggestion(1.5291, 8, 2.4, 0.84, 0.95, 0.8, 10);
    expect(s?.additionalRows).toBe(1);
    expect(s?.newLength).toBeCloseTo(8.8, 9);
    expect(s?.fitsAvailableLength).toBe(true);
  });
  it('Vorschlag passt nicht in den Platz', () => {
    expect(enlargementSuggestion(1.5291, 8, 2.4, 0.84, 0.95, 0.8, 8.5)?.fitsAvailableLength).toBe(false);
  });
  it('kein Vorschlag wenn erfüllt', () => expect(enlargementSuggestion(-1, 8, 2.4, 0.84, 0.95, 0.8)).toBeNull());
  it('hN → r: 10 mm in 15 min = 111,1 l/(s·ha)', () => expect(rainIntensityFromDepth(10, 15)).toBeCloseTo(111.111, 3));
});

describe('Flächenarten (Live-Daten)', () => {
  it('30 Einträge, C_s im Bereich und ≥ C_m', () => {
    expect(SURFACE_TYPES).toHaveLength(30);
    for (const s of SURFACE_TYPES) {
      expect(s.cs).toBeGreaterThanOrEqual(0);
      expect(s.cs).toBeLessThanOrEqual(1);
      expect(s.cs).toBeGreaterThanOrEqual(s.cm);
    }
  });
  it('Kategorie 1–3 = Dach', () => {
    expect(SURFACE_TYPES.filter((s) => s.isRoof).every((s) => s.category <= 3)).toBe(true);
    expect(SURFACE_TYPES.filter((s) => !s.isRoof).every((s) => s.category >= 4)).toBe(true);
  });
});

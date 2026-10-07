import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { defaultInputs } from '../../calculator/defaults';
import { compute } from '../../calculator/compute';
import { buildHtmlDocument, buildPlainText } from '../../output/htmlReport';
import { buildCheckData } from '../checkData';
import { evaluate } from '../evaluate';
import { applyToInputs } from '../toInputs';
import { parseInput } from './parseText';
import type { Finding } from '../types';

const val = (fs: Finding[], field: string) => fs.find((f) => f.field === field)?.value;
const all = (fs: Finding[], field: string) => fs.filter((f) => f.field === field).map((f) => f.value);

describe('Formulardaten', () => {
  const FORM = [
    'configuration[country]=1',
    'configuration[newGuideline]=1',
    'configuration[infiltrationType]=1',
    'configuration[rainFrequency]=5',
    'configuration[rcIndex]=206112',
    'configuration[surfaceValue][0][area]=600',
    'configuration[surfaceValue][0][surfacetype]=2',
    'configuration[surfaceValue][1][area]=350,5',
    'configuration[surfaceValue][1][surfacetype]=16',
    'configuration[permittedDischarge]=3,5',
  ].join('\n');

  it('liest Zeilen mit Schlüssel=Wert', () => {
    const r = parseInput(FORM);
    expect(r.kind).toBe('form');
    expect(val(r.findings, 'country')).toBe('1');
    expect(val(r.findings, 'rainFrequency')).toBe('5');
    expect(val(r.findings, 'rcIndex')).toBe('206112');
    expect(val(r.findings, 'area[0].uid')).toBe('2');
    expect(val(r.findings, 'area[0].area')).toBe('600');
    expect(val(r.findings, 'area[1].area')).toBe('350.5');
    expect(val(r.findings, 'qDr')).toBe('3.5');
    expect(r.findings.every((f) => f.source === 'Formularschlüssel')).toBe(true);
  });

  it('liest eine URL-codierte Zeile', () => {
    const enc = FORM.split('\n')
      .map((l) => {
        const [k, v] = l.split('=');
        return `${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
      })
      .join('&');
    const r = parseInput(enc);
    expect(r.kind).toBe('form');
    expect(val(r.findings, 'area[1].uid')).toBe('16');
    expect(val(r.findings, 'qDr')).toBe('3.5');
  });

  it('liest Schlüssel: Wert (DevTools-Ansicht)', () => {
    const r = parseInput('configuration[rainFrequency]: 20\nconfiguration[surfaceValue][0][area]: 120');
    expect(val(r.findings, 'rainFrequency')).toBe('20');
    expect(val(r.findings, 'area[0].area')).toBe('120');
  });
});

describe('JSON', () => {
  it('liest verschachteltes JSON mit surfaceValue', () => {
    const json = JSON.stringify({
      configuration: {
        country: '1',
        rainFrequency: 10,
        surfaceValue: [{ area: '500', surfacetype: '5' }, { area: 250, surfaceType: 11 }],
        rain: { 30: { 5: 480, 10: 340 } },
      },
    });
    const r = parseInput(json);
    expect(r.kind).toBe('json');
    expect(val(r.findings, 'country')).toBe('1');
    expect(val(r.findings, 'rainFrequency')).toBe('10');
    expect(val(r.findings, 'area[1].uid')).toBe('11');
    expect(val(r.findings, 'rain[30][10]')).toBe('340');
    expect(r.findings.every((f) => f.source === 'JSON')).toBe(true);
  });

  it('meldet JSON ohne bekannte Felder', () => {
    const r = parseInput('{"foo": 1}');
    expect(r.findings).toHaveLength(0);
    expect(r.notes.join(' ')).toMatch(/keine bekannten Feldnamen/);
  });
});

describe('Beschriftungen (PDF-/Seitentext)', () => {
  const TEXT = [
    'Anfrage 12345 – Versickerungsanlage',
    'Objektland: Deutschland',
    'Richtlinie: DWA-A 138-1',
    'Entwässerungsart: Mulden-Rigole',
    'Regenhäufigkeit: 5 Jahre',
    'KOSTRA-Rasterfeld: 206112',
    'Befestigte Fläche: 1.250,50 m²',
    'Flächenart\tFläche',
    'Flachdach – Kiesschüttung\t600,00 m²',
    'Teildurchlässige Verkehrsflächen: Betonsteinpflaster, in Sand oder Schlacke verlegt, Flächen mit Platten 350 m²',
    'Speichervolumen: 15,32 m³',
    'Muldenvolumen V_M = 2,5 m³',
    'Speicherkoeffizient s_R: 0,95',
    'Drosselabfluss Q_Dr: 4,2 l/s',
  ].join('\n');

  const r = parseInput(TEXT);

  it('erkennt Skalare', () => {
    expect(r.kind).toBe('text');
    expect(val(r.findings, 'country')).toBe('1');
    expect(val(r.findings, 'newGuideline')).toBe('1');
    expect(val(r.findings, 'infiltrationType')).toBe('2');
    expect(val(r.findings, 'rainFrequency')).toBe('5');
    expect(val(r.findings, 'rcIndex')).toBe('206112');
    expect(val(r.findings, 'aGes')).toBe('1250.5');
    expect(val(r.findings, 'volume')).toBe('15.32');
    expect(val(r.findings, 'swaleVolume')).toBe('2.5');
    expect(val(r.findings, 'storageCoeff')).toBe('0.95');
    expect(val(r.findings, 'qDr')).toBe('4.2');
  });

  it('erkennt Flächenarten aus dem Katalog samt Fläche', () => {
    expect(all(r.findings, 'area[0].uid')).toEqual(['5']);
    expect(all(r.findings, 'area[0].area')).toEqual(['600']);
    expect(all(r.findings, 'area[1].uid')).toEqual(['16']);
    expect(all(r.findings, 'area[1].area')).toEqual(['350']);
    expect(r.findings.find((f) => f.field === 'area[0].uid')?.source).toBe('Beschriftung');
  });

  it('merkt sich Zeilennummern', () => {
    expect(r.findings.find((f) => f.field === 'rcIndex')?.line).toBe(6);
    expect(r.lines[5].hits).toContain('rcIndex');
  });

  it('nimmt den Wert aus der nächsten Zeile, wenn die Beschriftung allein steht', () => {
    const x = parseInput('Regenhäufigkeit\n10 Jahre\nRichtlinie\nDWA-A 138-1');
    expect(val(x.findings, 'rainFrequency')).toBe('10');
    expect(val(x.findings, 'newGuideline')).toBe('1');
  });

  it('verwechselt Regendauer nicht mit Regenhäufigkeit', () => {
    const x = parseInput('Jährlichkeit\tD = 5 min\tD = 10 min');
    expect(val(x.findings, 'rainFrequency')).toBeUndefined();
  });

  it('Deutschland in einer Adresse ist kein Objektland', () => {
    const x = parseInput('GRAF Distribution GmbH, Teningen, Deutschland');
    expect(val(x.findings, 'country')).toBeUndefined();
  });

  it('alte DWA-A 138 wird als 0 erkannt', () => {
    expect(val(parseInput('Bemessung nach DWA-A 138').findings, 'newGuideline')).toBe('0');
  });

  it('Zisterne wird erkannt', () => {
    expect(val(parseInput('Entwässerungsart: Zisterne').findings, 'infiltrationType')).toBe('3');
  });

  it('Flächenart über zwei Zeilen', () => {
    const x = parseInput('Teildurchlässige Verkehrsflächen Rasengittersteine mit häufigen\nVerkehrsbelastungen (z. B. Parkplatz) 120 m²');
    expect(val(x.findings, 'area[0].uid')).toBe('21');
    expect(val(x.findings, 'area[0].area')).toBe('120');
  });

  it('wählt bei ähnlichen Namen die richtige Flächenart', () => {
    const a = parseInput('Metall, Glas, Schiefer, Faserzement 100 m²');
    expect(all(a.findings, 'area[0].uid')).toEqual(['1']);
    const b = parseInput('Metall, Glas, Faserzement 100 m²');
    expect(all(b.findings, 'area[0].uid')).toEqual(['3']);
  });
});

describe('Regentabellen', () => {
  it('r(D,T) = Wert', () => {
    const x = parseInput('r(5,30) = 480,0\nr(10,30) = 340\nr(5,2): 255,5\nr(15,100)=330');
    expect(val(x.findings, 'rain[30][5]')).toBe('480');
    expect(val(x.findings, 'rain[30][10]')).toBe('340');
    expect(val(x.findings, 'rain[2][5]')).toBe('255.5');
    expect(val(x.findings, 'rain[100][15]')).toBe('330');
  });

  it('Tabelle mit T in den Spalten', () => {
    const x = parseInput(['D [min]\tT = 2 a\tT = 30 a\tT = 100 a', '5\t255,0\t480,0\t590,0', '10\t175\t340\t415', '15\t138\t270\t330'].join('\n'));
    expect(val(x.findings, 'rain[2][5]')).toBe('255');
    expect(val(x.findings, 'rain[30][10]')).toBe('340');
    expect(val(x.findings, 'rain[100][15]')).toBe('330');
  });

  it('Tabelle mit D in den Spalten', () => {
    const x = parseInput(['Jährlichkeit\tD = 5 min\tD = 10 min\tD = 15 min', 'T = 2 (Abzug)\t255,00\t175,00\t138,00', 'T = 30 (Nachweis)\t480,00\t340,00\t270,00'].join('\n'));
    expect(val(x.findings, 'rain[2][15]')).toBe('138');
    expect(val(x.findings, 'rain[30][5]')).toBe('480');
  });

  it('Niederschlagshöhe hN wird in r umgerechnet', () => {
    // r = hN / D · 10000/60: hN = 8 mm bei D = 5 → 266,667 l/(s·ha)
    const x = parseInput(['hN [mm]\tT = 30 a\tT = 100 a', '5\t8,0\t10,0'].join('\n'));
    expect(Number(val(x.findings, 'rain[30][5]'))).toBeCloseTo(266.667, 2);
    expect(x.notes.join(' ')).toMatch(/hN/);
  });

  it('Einheitenzeile unter der Kopfzeile ist erlaubt', () => {
    const x = parseInput(['D\tT = 2 a\tT = 30 a', '[min]\t[l/(s·ha)]\t[l/(s·ha)]', '5\t255\t480'].join('\n'));
    expect(val(x.findings, 'rain[30][5]')).toBe('480');
  });
});

describe('eigene Dateien', () => {
  it('liest die Eingaben-JSON des Prüfwerkzeugs', () => {
    const r = parseInput(JSON.stringify(defaultInputs()));
    expect(r.kind).toBe('tool-json');
    expect(val(r.findings, 'rainFrequency')).toBe('5');
    expect(val(r.findings, 'area[0].uid')).toBe('2');
    expect(val(r.findings, 'rain[30][5]')).toBe('480');
    expect(val(r.findings, 'blocksLength')).toBe('10');
    expect(r.findings.every((f) => f.source === 'Prüfwerkzeug')).toBe(true);
  });

  it('liest den HTML-Bericht des Prüfwerkzeugs', () => {
    const inp = defaultInputs();
    const html = buildHtmlDocument(inp, compute(inp), { embedInputs: true });
    const r = parseInput(html);
    expect(r.kind).toBe('tool-html');
    expect(val(r.findings, 'area[1].area')).toBe('350');
  });

  it('Text-Bericht des Prüfwerkzeugs: Regendaten kommen richtig zurück', () => {
    const inp = defaultInputs();
    const txt = buildPlainText(inp, compute(inp), ['regendaten']);
    const r = parseInput(txt);
    expect(val(r.findings, 'rain[2][5]')).toBe('255');
    expect(val(r.findings, 'rain[30][15]')).toBe('270');
    expect(val(r.findings, 'rain[100][10]')).toBe('415');
  });

  it('leerer Text', () => {
    expect(parseInput('   ').kind).toBe('leer');
  });
});

describe('Text aus einem echten PDF (Muster-PDF, mit pdf.js gelesen)', () => {
  const text = readFileSync(new URL('../../../../tests-data/muster_T30.txt', import.meta.url), 'utf-8');
  const r = parseInput(text);

  it('erkennt Skalare trotz zweispaltigem Layout', () => {
    expect(val(r.findings, 'infiltrationType')).toBe('1');
    expect(val(r.findings, 'newGuideline')).toBe('1');
    expect(val(r.findings, 'rainFrequency')).toBe('5');
    expect(val(r.findings, 'rcIndex')).toBe('206112');
    expect(val(r.findings, 'aGes')).toBe('950');
    expect(val(r.findings, 'storageCoeff')).toBe('0.95');
    expect([val(r.findings, 'length'), val(r.findings, 'width'), val(r.findings, 'height')]).toEqual(['8', '2.4', '0.84']);
  });

  it('erkennt abgeschnittene und umgebrochene Flächennamen samt Fläche', () => {
    expect(all(r.findings, 'area[0].uid')).toEqual(['2']);
    expect(all(r.findings, 'area[0].area')).toEqual(['600']);
    expect(all(r.findings, 'area[1].uid')).toEqual(['16']);
    expect(all(r.findings, 'area[1].area')).toEqual(['350']);
    expect(val(r.findings, 'area[2].uid')).toBeUndefined();
  });

  it('liest die Regentabelle mit Spaltenköpfen r(D,T)', () => {
    expect(val(r.findings, 'rain[2][5]')).toBe('255');
    expect(val(r.findings, 'rain[2][15]')).toBe('138');
    expect(val(r.findings, 'rain[30][10]')).toBe('340');
    expect(val(r.findings, 'rain[30][15]')).toBe('270');
    expect(val(r.findings, 'rain[100][5]')).toBeUndefined();
  });

  it('das PDF nennt kein Objektland: das meldet die Prüfung, mit Ergänzung ist Gl. 20 vollständig und der Rechner kommt auf 11,72 m³', () => {
    const { data: raw } = buildCheckData(r.findings);
    const gating = evaluate(raw).find((x) => x.id === 'gl20')!.requirements.find((q) => q.id === 'gating')!;
    expect(gating.state).toBe('partial');
    expect(gating.detail).toContain('Objektland');
    const { data } = buildCheckData(parseInput(text + '\nconfiguration[country]=1').findings);
    const reports = evaluate(data);
    expect(reports.find((x) => x.id === 'gl20')?.verdict).toBe('vollstaendig');
    const res = applyToInputs(defaultInputs(), data);
    const c = compute(res.inputs);
    expect(c.result?.vRueckMax).toBeCloseTo(11.72, 2);
    expect(c.result?.passed).toBe(true);
  });
});

describe('Flächennamen', () => {
  it('unterscheidet ≥ und < bei Extensivbegrünung', () => {
    expect(all(parseInput('Extensivbegrünung ≥ 10 cm Aufbaudicke (Neigung ≤ 5°) 100 m²').findings, 'area[0].uid')).toEqual(['8']);
    expect(all(parseInput('Extensivbegrünung < 10 cm Aufbaudicke (Neigung ≤ 5°) 100 m²').findings, 'area[0].uid')).toEqual(['9']);
    expect(all(parseInput('Extensivbegrünung (Neigung > 5°) 100 m²').findings, 'area[0].uid')).toEqual(['6']);
  });

  it('Name ohne Klammerzusatz genügt', () => {
    const x = parseInput('Ziegel, Abdichtungsbahnen 80 m²');
    expect(all(x.findings, 'area[0].uid')).toEqual(['2']);
    expect(all(x.findings, 'area[0].area')).toEqual(['80']);
  });

  it('zwei Flächenarten untereinander bekommen ihre eigene Zahl', () => {
    const x = parseInput('Betonflächen\nSchwarzdecken (Asphalt)  250 m²');
    expect(all(x.findings, 'area[0].uid')).toEqual(['10']);
    expect(all(x.findings, 'area[0].area')).toEqual([]);
    expect(all(x.findings, 'area[1].area')).toEqual(['250']);
  });
});

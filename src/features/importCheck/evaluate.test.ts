import { describe, expect, it } from 'vitest';
import { compute } from '../calculator/compute';
import { defaultInputs } from '../calculator/defaults';
import { buildCheckData, resolveFields } from './checkData';
import { evaluate, missingReport } from './evaluate';
import { itemsToLines } from './extract/pdfText';
import { parseInput } from './extract/parseText';
import { applyToInputs } from './toInputs';
import type { Finding } from './types';

type Reports = ReturnType<typeof evaluate>;
const check = (text: string) => {
  const r = parseInput(text);
  const { data } = buildCheckData(r.findings);
  return { data, reports: evaluate(data), findings: r.findings };
};
const rep = (reports: Reports, id: string) => reports.find((r) => r.id === id)!;
const req = (reports: Reports, eq: string, id: string) => rep(reports, eq).requirements.find((q) => q.id === id)!;

const FORM_MIN = [
  'configuration[country]=1',
  'configuration[newGuideline]=1',
  'configuration[infiltrationType]=1',
  'configuration[rainFrequency]=5',
  'configuration[rcIndex]=206112',
  'configuration[surfaceValue][0][area]=600',
  'configuration[surfaceValue][0][surfacetype]=2',
  'configuration[surfaceValue][1][area]=350',
  'configuration[surfaceValue][1][surfacetype]=16',
  'configuration[volume]=15,32',
].join('\n');

describe('Auswertung je Gleichung', () => {
  const { reports } = check(FORM_MIN);

  it('Formulardaten ohne Regenspenden: Gl. 20 unvollständig', () => {
    expect(rep(reports, 'gl20').verdict).toBe('unvollstaendig');
    expect(req(reports, 'gl20', 'gating').state).toBe('ok');
    expect(req(reports, 'gl20', 'areas').state).toBe('ok');
    expect(req(reports, 'gl20', 'storage').state).toBe('ok');
    expect(req(reports, 'gl20', 'rainFrequency').state).toBe('ok');
    expect(req(reports, 'gl20', 'rcIndex').state).toBe('ok');
  });

  it('C_s und Dach/außerhalb kommen aus dem Katalog, auch ohne dass das Formular sie sendet', () => {
    expect(req(reports, 'gl20', 'cs').state).toBe('ok');
    const split = req(reports, 'gl20', 'roofSplit');
    expect(split.state).toBe('ok');
    expect(split.detail).toContain('A_Dach = 600,00');
    expect(split.detail).toContain('A_FaG = 350,00');
  });

  it('Regenspenden fehlen: nennt die konkreten Werte', () => {
    const q = req(reports, 'gl20', 'rainT');
    expect(q.state).toBe('missing');
    expect(q.detail).toContain('T = 30');
    expect(req(reports, 'gl20', 'rain2').state).toBe('missing');
  });

  it('Gl. 21 braucht zusätzlich Q_voll, das nicht im VSO steht', () => {
    expect(req(reports, 'gl21', 'qVoll').state).toBe('missing');
    expect(req(reports, 'gl21', 'qVoll').source).toBe('extern');
  });

  it('Gl. 22 braucht lange Dauerstufen, Q_Dr und hat f_Z als Annahme', () => {
    expect(req(reports, 'gl22', 'durationsLong').state).toBe('missing');
    expect(req(reports, 'gl22', 'qDr').state).toBe('missing');
    expect(req(reports, 'gl22', 'fz').state).toBe('assumed');
    expect(req(reports, 'gl22', 'cm').state).toBe('ok');
  });

  it('Gl. 19 ist unbekannt (Formel nicht hinterlegt)', () => {
    expect(rep(reports, 'gl19').verdict).toBe('unbekannt');
    expect(rep(reports, 'gl19').requirements).toHaveLength(0);
  });

  it('Regenhäufigkeit > 10 verlangt T = 100', () => {
    const { reports: r } = check(FORM_MIN.replace('rainFrequency]=5', 'rainFrequency]=20'));
    expect(req(r, 'gl20', 'rainT').detail).toContain('T = 100');
  });
});

describe('vollständige Daten', () => {
  const TEXT = [
    FORM_MIN,
    'r(5,2)=255', 'r(10,2)=175', 'r(15,2)=138',
    'r(5,30)=480', 'r(10,30)=340', 'r(15,30)=270',
  ].join('\n');
  const { reports } = check(TEXT);

  it('Gl. 20 ist vollständig, Annahmen zählen nicht als Lücke', () => {
    const gl20 = rep(reports, 'gl20');
    expect(gl20.verdict).toBe('vollstaendig');
    expect(gl20.requirements.find((q) => q.id === 'durations')?.state).toBe('assumed');
  });

  it('Gl. 21 und 22 bleiben unvollständig', () => {
    expect(rep(reports, 'gl21').verdict).toBe('unvollstaendig');
    expect(rep(reports, 'gl22').verdict).toBe('unvollstaendig');
  });

  it('Q_voll ergänzt Gl. 21', () => {
    const { reports: r } = check(TEXT + '\nconfiguration[qVoll]=20');
    expect(rep(r, 'gl21').verdict).toBe('vollstaendig');
  });
});

describe('Sonderfälle', () => {
  it('Zisterne: Gleichungen nicht anwendbar', () => {
    const { reports } = check(FORM_MIN.replace('infiltrationType]=1', 'infiltrationType]=3'));
    expect(req(reports, 'gl20', 'gating').state).toBe('blocked');
    expect(rep(reports, 'gl20').verdict).toBe('nicht-anwendbar');
    expect(rep(reports, 'gl22').verdict).toBe('nicht-anwendbar');
  });

  it('Mulden-Rigole ohne Regenhäufigkeit: Annahme T = 30 und Muldenvolumen fehlt', () => {
    const txt = FORM_MIN.replace('infiltrationType]=1', 'infiltrationType]=2').replace('configuration[rainFrequency]=5\n', '');
    const { reports } = check(txt);
    expect(req(reports, 'gl20', 'rainFrequency').state).toBe('assumed');
    expect(req(reports, 'gl20', 'storage').state).toBe('partial');
  });

  it('Rigole ohne Regenhäufigkeit: fehlt', () => {
    const { reports } = check(FORM_MIN.replace('configuration[rainFrequency]=5\n', ''));
    expect(req(reports, 'gl20', 'rainFrequency').state).toBe('missing');
  });

  it('Fläche ohne Größe wird als Lücke gemeldet', () => {
    const { reports } = check('configuration[surfaceValue][0][surfacetype]=2\nconfiguration[surfaceValue][1][area]=100\nconfiguration[surfaceValue][1][surfacetype]=16');
    const a = req(reports, 'gl20', 'areas');
    expect(a.state).toBe('partial');
    expect(a.detail).toContain('Fläche 1: Fläche fehlt');
  });

  it('Manuelle Fläche ohne C_s und Dach-Angabe', () => {
    const { reports } = check('configuration[surfaceValue][0][area]=100\nconfiguration[surfaceValue][0][surfacetype]=0');
    expect(req(reports, 'gl20', 'cs').state).toBe('missing');
    expect(req(reports, 'gl20', 'roofSplit').state).toBe('missing');
  });

  it('Blockdaten unvollständig: nennt die fehlenden Felder', () => {
    const { reports } = check(
      ['configuration[blocksLength]=10', 'configuration[blocksWidth]=3', 'configuration[layers]=2'].join('\n'),
    );
    const s = req(reports, 'gl20', 'storage');
    expect(s.state).toBe('partial');
    expect(s.detail).toContain('blocLength');
    expect(s.detail).toContain('storageCoeff');
  });

  it('A_ges aus dem VSO wird mit der Summe verglichen', () => {
    const { reports } = check(FORM_MIN + '\nconfiguration[aGes]=1200');
    expect(req(reports, 'gl20', 'areas').detail).toContain('weicht von der Summe ab');
  });

  it('nichts importiert: alles fehlt, nichts stürzt ab', () => {
    const { reports } = check('Hallo Welt');
    expect(rep(reports, 'gl20').verdict).toBe('unvollstaendig');
    expect(req(reports, 'gl20', 'gating').state).toBe('missing');
  });
});

describe('Priorität der Fundstellen', () => {
  const f = (field: string, value: string, source: Finding['source'], line?: number): Finding => ({ id: `${source}${field}${line}`, field, value, source, line });

  it('manuell schlägt alles, Formular schlägt Beschriftung, Katalog ist am schwächsten', () => {
    const r = resolveFields([f('rainFrequency', '10', 'Beschriftung', 3), f('rainFrequency', '5', 'Formularschlüssel'), f('rainFrequency', '20', 'manuell')]);
    expect(r.get('rainFrequency')?.value).toBe('20');
    expect(r.get('rainFrequency')?.conflict).toBe(true);
    const r2 = resolveFields([f('area[0].cs', '0.8', 'Katalog'), f('area[0].cs', '0.5', 'Formularschlüssel')]);
    expect(r2.get('area[0].cs')?.value).toBe('0.5');
    expect(r2.get('area[0].cs')?.conflict).toBe(false); // Katalog zählt nicht als Widerspruch
  });

  it('bei gleichem Rang gewinnt die frühere Zeile', () => {
    const r = resolveFields([f('rcIndex', '111111', 'Beschriftung', 9), f('rcIndex', '222222', 'Beschriftung', 2)]);
    expect(r.get('rcIndex')?.value).toBe('222222');
  });

  it('gleiche Zahl in anderer Schreibweise ist kein Konflikt', () => {
    const r = resolveFields([f('volume', '15.32', 'Beschriftung', 1), f('volume', '15.320', 'JSON')]);
    expect(r.get('volume')?.conflict).toBe(false);
  });
});

describe('In den Rechner übernehmen', () => {
  const TEXT = [
    FORM_MIN,
    'configuration[qVoll]=20',
    'r(5,2)=255', 'r(10,2)=175', 'r(15,2)=138',
    'r(5,30)=480', 'r(10,30)=340', 'r(15,30)=270',
    'r(5,100)=590', 'r(10,100)=415', 'r(15,100)=330',
    'configuration[storageCoeff]=0,95',
  ].join('\n');

  it('übernimmt Flächen, Regen und Anlage und rechnet danach', () => {
    const { data } = check(TEXT);
    const base = defaultInputs();
    base.areas = [];
    const res = applyToInputs(base, data);
    expect(res.inputs.areas.map((a) => [a.surfaceUid, a.area])).toEqual([[2, 600], [16, 350]]);
    expect(res.inputs.rcIndex).toBe('206112');
    expect(res.inputs.rainFrequency).toBe(5);
    expect(res.inputs.rain['30']['10']).toBe(340);
    expect(res.inputs.rigole.mode).toBe('volume');
    expect(res.inputs.rigole.volumeDirect).toBe(15.32);
    expect(res.inputs.extras.qVoll).toBe(20);
    const c = compute(res.inputs);
    expect(c.errors).toEqual([]);
    expect(c.result?.returnPeriod).toBe(30);
    expect(c.gl21).not.toBeNull();
  });

  it('ändert nichts, was nicht gefunden wurde', () => {
    const base = defaultInputs();
    const { data } = check('configuration[rcIndex]=123456');
    const res = applyToInputs(base, data);
    expect(res.inputs.areas).toEqual(base.areas);
    expect(res.inputs.rain).toEqual(base.rain);
    expect(res.inputs.rcIndex).toBe('123456');
    expect(res.inputs.rainFrequency).toBe(base.rainFrequency);
  });

  it('Mulden-Rigole ohne Regenhäufigkeit setzt sie auf leer', () => {
    const { data } = check('configuration[infiltrationType]=2');
    const res = applyToInputs(defaultInputs(), data);
    expect(res.inputs.rainFrequency).toBeNull();
    expect(res.inputs.rigole.infiltrationType).toBe(2);
  });

  it('Zeile ohne Flächenart wird übersprungen und gemeldet', () => {
    const { data } = check('configuration[surfaceValue][0][area]=100');
    const res = applyToInputs(defaultInputs(), data);
    expect(res.skipped.join(' ')).toContain('Flächenart fehlt');
    expect(res.inputs.areas).toEqual(defaultInputs().areas.map((a) => ({ ...a, id: expect.any(String) })));
  });

  it('Rundlauf: Eingaben → JSON → Import → gleiche Eingaben → gleiches Ergebnis', () => {
    const orig = defaultInputs();
    const { data } = check(JSON.stringify(orig));
    const back = applyToInputs(defaultInputs(), data).inputs;
    expect(compute(back).result?.vRueckMax).toBeCloseTo(compute(orig).result!.vRueckMax, 9);
    expect(back.rigole.mode).toBe('blocks');
  });
});

describe('Bericht der fehlenden Angaben', () => {
  it('listet nur Lücken und nennt die Quelle', () => {
    const { reports } = check(FORM_MIN);
    const txt = missingReport(reports);
    expect(txt).toContain('Gleichung 20');
    expect(txt).toContain('r(D,T)');
    expect(txt).toContain('Q_voll');
    expect(txt).toContain('Formel noch nicht hinterlegt');
    expect(txt).not.toContain('f_Z');
  });
});

describe('PDF-Zeilenbildung', () => {
  it('gruppiert nach y, trennt Spalten mit Tab', () => {
    const lines = itemsToLines([
      { str: 'Regenhäufigkeit', x: 10, y: 700, width: 80 },
      { str: '5 Jahre', x: 200, y: 700.5, width: 30 },
      { str: 'Speichervolumen', x: 10, y: 680, width: 80 },
      { str: '15,32', x: 92, y: 680, width: 25 },
      { str: 'm³', x: 118, y: 680, width: 10 },
    ]);
    expect(lines).toEqual(['Regenhäufigkeit\t5 Jahre', 'Speichervolumen 15,32 m³']);
    const f = parseInput(lines.join('\n')).findings;
    expect(f.find((x) => x.field === 'rainFrequency')?.value).toBe('5');
    expect(f.find((x) => x.field === 'volume')?.value).toBe('15.32');
  });
});

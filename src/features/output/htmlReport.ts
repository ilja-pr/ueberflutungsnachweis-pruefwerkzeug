/** Aus den gewählten Bausteinen eine eigenständige HTML-Datei bauen (und Eingaben daraus wieder lesen). */
import type { Computed, Inputs } from '../calculator/types';
import { escapeHtml as e } from '../../shared/lib/format';
import { buildSections, SECTION_ORDER, type OutputSection, type SectionId } from './sections';

export const INPUT_TAG_ID = 'tool-inputs';

const CSS = `
:root{--bg:#f6f7f8;--card:#fff;--ink:#1b232b;--mute:#66737f;--line:#dfe3e7;--ok:#1f7a45;--bad:#b83227;--warn:#8a6100;--warnbg:#fff8e1;--hl:#fff6c2}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:880px;margin:0 auto;padding:24px 16px 48px}h1{margin:0 0 4px;font-size:23px}h2{margin:26px 0 8px;font-size:16px;border-bottom:1px solid var(--line);padding-bottom:4px}
.sub{color:var(--mute);margin:0 0 16px}.box{background:#fff;border:1px solid var(--line);border-left:6px solid var(--ok);border-radius:8px;padding:14px 16px;margin:12px 0}.box.bad{border-left-color:var(--bad)}
.box h3{margin:0 0 6px;font-size:19px;color:var(--ok)}.box.bad h3{color:var(--bad)}.nums{display:flex;gap:24px;flex-wrap:wrap;margin-top:10px}
.num span{display:block;color:var(--mute);font-size:12px}.num b{font-size:21px}.bar{height:6px;background:var(--line);border-radius:3px;overflow:hidden;margin-top:12px}.bar i{display:block;height:100%}
table{border-collapse:collapse;width:100%;background:var(--card);margin:6px 0}th,td{border:1px solid var(--line);padding:5px 8px;text-align:left;vertical-align:top}th{background:#f0f2f4;font-weight:600}
td.r,th.r{text-align:right;font-variant-numeric:tabular-nums}tr.hl td{background:var(--hl);font-weight:600}
.step{margin:8px 0}.step h4{margin:0 0 3px;font-size:13.5px}.step pre{margin:0;padding:8px 10px;background:#f0f2f4;border-radius:6px;white-space:pre-wrap;font:12.5px/1.55 ui-monospace,Menlo,Consolas,monospace}
.warn{background:var(--warnbg);border-left:4px solid var(--warn);padding:7px 12px;margin:6px 0}.small{color:var(--mute);font-size:12px}
@media print{body{background:#fff}.step,.box{break-inside:avoid}}
`;

export interface HtmlReportOptions {
  /** nur diese Bausteine (Standard: alle) */
  include?: SectionId[];
  /** Eingaben unsichtbar einbetten, damit die Datei im Tool wieder geladen werden kann */
  embedInputs?: boolean;
}

export function reportTitle(inp: Inputs): string {
  return `Überflutungsnachweis${inp.requestNo ? ' ' + inp.requestNo : ''} – ${inp.projectName || 'ohne Objektname'}`;
}

export function selectSections(all: OutputSection[], include?: SectionId[]): OutputSection[] {
  if (!include) return all;
  return SECTION_ORDER.filter((id) => include.includes(id))
    .map((id) => all.find((s) => s.id === id))
    .filter((s): s is OutputSection => !!s);
}

export function buildHtmlDocument(inp: Inputs, c: Computed, opts: HtmlReportOptions = {}): string {
  const sections = selectSections(buildSections(inp, c), opts.include);
  const title = reportTitle(inp);
  const stamp = new Date().toLocaleString('de-DE');
  const body = sections.map((s) => (s.id === 'ergebnis' ? s.html : `<h2>${e(s.title)}</h2>${s.html}`)).join('\n');
  const embedded = opts.embedInputs === false ? '' : `<script type="application/json" id="${INPUT_TAG_ID}">${JSON.stringify(inp).replace(/</g, '\\u003c')}</script>`;
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(title)}</title><style>${CSS}</style></head><body><main>
<h1>${e(title)}</h1><p class="sub">Nachweis nach DIN 1986-100 · Bemessung nach DWA-A 138-1 · Rückhaltung nur in der Anlage · erstellt ${e(stamp)} mit dem Prüfwerkzeug (Prototyp, kein Ersatz für die Fachplanung)</p>
${body}
${embedded}</main></body></html>`;
}

export function buildPlainText(inp: Inputs, c: Computed, include?: SectionId[]): string {
  const sections = selectSections(buildSections(inp, c), include);
  return [reportTitle(inp), ...sections.map((s) => `\n== ${s.title} ==\n${s.text}`)].join('\n');
}

/** Eingaben aus einer exportierten HTML-Datei zurücklesen. */
export function extractInputsFromHtml(html: string): unknown | null {
  const m = html.match(new RegExp(`<script type="application/json" id="${INPUT_TAG_ID}">([\\s\\S]*?)</script>`));
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

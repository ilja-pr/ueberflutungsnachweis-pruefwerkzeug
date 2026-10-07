import { chromium } from 'playwright-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from '../scripts/serve.mjs';
/*
 * Rauchtest im echten Browser: Import → Prüfung → Rechner → Ausgabe.
 *   npm run build && npm run e2e                     (startet den Export aus out/ selbst)
 *   npm run e2e -- http://localhost:3000/            (gegen `npm run dev` oder einen anderen Server)
 *   CHROMIUM_PATH=/pfad/zu/chrome npm run e2e        (ohne CHROMIUM_PATH wird der installierte Chrome genutzt)
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const PDF = path.join(here, '..', 'tests-data', 'muster_T30.pdf');
const OUT = path.join(here, '..', 'out');
let server = null;
let BASE = process.argv[2] || process.env.URL || '';
if (!BASE) {
  if (!fs.existsSync(OUT)) {
    console.error('out/ fehlt. Erst „npm run build“ ausführen oder eine URL angeben.');
    process.exit(1);
  }
  server = await startServer(OUT, 0);
  BASE = `http://127.0.0.1:${server.address().port}/`;
}
if (!BASE.endsWith('/')) BASE += '/';
let failed = 0;

try {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] } : { channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const ok = (c, msg) => {
    console.log(c ? 'OK  ' : 'FAIL', msg);
    if (!c) failed++;
  };

  // Erst klicken/laden, wenn React die Seite übernommen hat (sonst gehen Eingaben vor der Hydration verloren)
  const hydrated = (selector) =>
    page.waitForFunction((sel) => {
      const el = document.querySelector(sel);
      return !!el && Object.keys(el).some((k) => k.startsWith('__reactProps'));
    }, selector);
  const text = async (selector) => (await page.textContent(selector)).replace(/\s+/g, ' ');
  const pathOf = () => new URL(page.url()).pathname;

  await page.goto(BASE + 'import/');
  await page.waitForSelector('.importcheck');
  await hydrated('input[type=file]');
  // 1 PDF laden
  await page.setInputFiles('input[type=file]', PDF);
  await page.waitForSelector('.loadstate');
  let strip = await page.$$eval('.stripitem', (e) => e.map((x) => x.innerText.replace(/\n/g, ' | ')));
  ok(/Gl\. 20 \| es fehlt etwas \| 1 Punkt offen/.test(strip[1]), 'PDF: Gl.20 nur Objektland offen → ' + strip[1]);

  // 2 manuell ergänzen: Objektland = 1
  await page.click('summary:has-text("Wert ergänzen")');
  await page.selectOption('.manualrow select[aria-label="Feld"]', 'country');
  await page.fill('.manualrow input[aria-label="Wert"]', '1');
  await page.click('.manualrow >> text=Ergänzen');
  strip = await page.$$eval('.stripitem', (e) => e.map((x) => x.innerText.replace(/\n/g, ' | ')));
  ok(/Gl\. 20 \| alle Angaben da/.test(strip[1]), 'nach manueller Ergänzung: ' + strip[1]);
  const src = await page.$$eval('table.findings tbody tr', (r) => r.filter((x) => x.innerText.includes('Objektland')).map((x) => x.innerText.replace(/\s+/g, ' ')));
  ok(src.length === 1 && /manuell/.test(src[0]), 'Objektland als manuell: ' + src[0]);

  // 3 Wert korrigieren: Regenhäufigkeit 5 -> 20  → T=100 verlangt
  const input = page.locator('table.findings tr', { hasText: 'Gewählte Regenhäufigkeit' }).locator('input');
  await input.fill('20');
  await input.blur();
  strip = await page.$$eval('.stripitem', (e) => e.map((x) => x.innerText.replace(/\n/g, ' | ')));
  ok(/Gl\. 20 \| es fehlt etwas/.test(strip[1]), 'nach Änderung auf 20 Jahre fehlt T=100: ' + strip[1]);
  // und ✕ auf manuelle entfernt es → zurück auf 5
  await page.locator('table.findings tr', { hasText: 'Gewählte Regenhäufigkeit' }).locator('button.icon').click();
  strip = await page.$$eval('.stripitem', (e) => e.map((x) => x.innerText.replace(/\n/g, ' | ')));
  ok(/Gl\. 20 \| alle Angaben da/.test(strip[1]), 'manuellen Wert entfernt → wieder vollständig');

  // 4 Fehlende Angaben kopieren / speichern
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('text=als Textdatei speichern')]);
  const txt = fs.readFileSync(await dl.path(), 'utf-8');
  ok(txt.includes('Gleichung 21') && txt.includes('Q_voll'), 'Textdatei fehlende Angaben: ' + dl.suggestedFilename());

  // 5 Übernehmen und rechnen
  await page.click('text=In den Rechner übernehmen');
  await page.click('.note >> text=Zum Rechner');
  await page.waitForSelector('.resbox');
  ok(pathOf() === '/', 'Link „Zum Rechner“ wechselt die Route ohne Neuladen: ' + pathOf());
  const nums = await text('.resbox .nums');
  ok(nums.includes('11,72') && nums.includes('15,32'), 'Rechner nach PDF-Import: ' + nums);

  // 6 Ausgabe: einzelnen Baustein als CSV
  await page.click('.tabs >> text=Ausgabe');
  await page.waitForSelector('.seclist');
  ok(pathOf() === '/ausgabe/' && (await page.getAttribute('.tabs a.on', 'aria-current')) === 'page', 'Tab Ausgabe ist eigene Route und markiert: ' + pathOf());
  const [csv] = await Promise.all([page.waitForEvent('download'), page.locator('.seclist li', { hasText: 'Regendaten' }).locator('text=CSV').click()]);
  const csvText = fs.readFileSync(await csv.path(), 'utf-8');
  ok(csvText.includes('T = 30') && csvText.split('\r\n').length >= 4, 'CSV ' + csv.suggestedFilename() + ' → ' + JSON.stringify(csvText.slice(0, 80)));
  const frame = page.frameLocator('iframe.preview');
  ok((await frame.locator('h1').textContent()).includes('Überflutungsnachweis'), 'Vorschau iframe');

  // 7 HTML-Bericht speichern und im Import wieder laden
  const [html] = await Promise.all([page.waitForEvent('download'), page.click('text=Auswahl als HTML speichern')]);
  const htmlPath = path.join(os.tmpdir(), 'bericht-e2e.html');
  await html.saveAs(htmlPath);
  await page.click('.tabs >> text=VSO-Import');
  await page.waitForSelector('.importcheck');
  await page.click('text=Alles leeren');
  await page.setInputFiles('input[type=file]', htmlPath);
  await page.waitForSelector('.loadstate');
  const ls = await page.textContent('.loadstate');
  ok(/Bericht dieses Prüfwerkzeugs/.test(ls), 'HTML-Bericht erkannt: ' + ls);

  // 8 Reload: Route bleibt, Rechner-Eingaben bleiben (localStorage wird erst nach dem Einhängen geladen)
  await page.reload();
  await page.waitForSelector('.importcheck');
  ok(pathOf() === '/import/', 'Reload hält die Route /import/');
  await page.click('.tabs >> text=Rechner');
  await page.waitForFunction(() => document.querySelector('.resbox .nums')?.textContent?.includes('11,72'), null, { timeout: 5000 }).catch(() => {});
  const nums2 = await text('.resbox .nums');
  ok(nums2.includes('11,72'), 'Eingaben nach Reload gemerkt: ' + nums2);

  // 9 Anker im Einbauen-Tab ändern den Tab nicht
  await page.click('.tabs >> text=Einbauen');
  await page.click('.steps-overview a >> nth=2');
  ok((await page.textContent('main h1')) === 'Einbauen' && pathOf() === '/einbauen/' && /#step-/.test(page.url()), 'Anker #step-… bleibt auf der Seite: ' + page.url());

  // 10 Alle Routen direkt aufrufbar, Titel stimmt, auf dem Handy kein Seitwärts-Scrollen
  await page.setViewportSize({ width: 390, height: 800 });
  for (const [route, h1] of [['', 'Überflutungsnachweis'], ['ausgabe/', 'Ausgabe'], ['import/', 'VSO-Daten laden'], ['erklaerung/', 'So wird gerechnet'], ['projekt/', ''], ['einbauen/', 'Einbauen'], ['flaechen/', 'Flächenarten']]) {
    await page.goto(BASE + route);
    await page.waitForSelector('main');
    const title = await page.title();
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const head = (await page.textContent('main h1').catch(() => '')) ?? '';
    ok(over <= 0 && title.length > 5 && (!h1 || head.includes(h1) || route === ''), `Route /${route} @390px: Überlauf ${over}px, Titel „${title}“, h1 „${head.slice(0, 30)}“`);
  }

  console.log('Konsolenfehler:', errors.length ? errors : 'keine');
  if (errors.length) failed++;
  await browser.close();
  server?.close();
} catch (e) {
  console.error('ABGEBROCHEN', e);
  failed++;
}
process.exit(failed ? 1 : 0);

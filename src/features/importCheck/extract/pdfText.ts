/*
 * Text aus einer PDF-Datei holen (pdf.js, läuft komplett im Browser, nichts wird hochgeladen).
 * Die Zeilenbildung ist reine Logik und getrennt testbar: Textstücke mit gleicher Höhe (y)
 * werden zu einer Zeile, große Lücken werden zu einem Tab (so bleiben Tabellenspalten erkennbar).
 */

export interface PdfItem {
  str: string;
  x: number;
  y: number;
  width: number;
}

const Y_TOLERANCE = 2.5;
const TAB_GAP = 8;

export function itemsToLines(items: PdfItem[]): string[] {
  const parts = items.filter((i) => i.str.trim() !== '' || i.str === ' ');
  const sorted = [...parts].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: PdfItem[][] = [];
  for (const it of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last[0].y - it.y) <= Y_TOLERANCE) last.push(it);
    else lines.push([it]);
  }
  return lines.map((line) => {
    line.sort((a, b) => a.x - b.x);
    let out = '';
    let prevEnd: number | null = null;
    for (const it of line) {
      if (prevEnd !== null) {
        const gap = it.x - prevEnd;
        out += gap > TAB_GAP ? '\t' : gap > 0.8 && !out.endsWith(' ') && !it.str.startsWith(' ') ? ' ' : '';
      }
      out += it.str;
      prevEnd = it.x + it.width;
    }
    return out.replace(/[ ]+$/g, '').trimStart();
  });
}

export async function extractPdfText(data: ArrayBuffer): Promise<string> {
  // Nur im Browser und erst beim ersten PDF laden (pdf.js greift beim Import auf Browser-Objekte zu, das darf nicht beim Server-Rendern laufen).
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
  const pages: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items: PdfItem[] = [];
    for (const raw of content.items) {
      if (!('str' in raw)) continue;
      items.push({ str: raw.str, x: raw.transform[4], y: raw.transform[5], width: raw.width });
    }
    pages.push(itemsToLines(items).join('\n'));
  }
  await doc.destroy();
  return pages.join('\n\n');
}

import { INPUT_TAG_ID } from '../../output/htmlReport';
import { extractPdfText } from './pdfText';

export interface ReadResult {
  text: string;
  /** was für eine Datei es war */
  type: 'pdf' | 'html' | 'text';
}

/** HTML in lesbaren Text umwandeln, Tabellenzellen bleiben durch Tabs getrennt. */
export function htmlToText(html: string): string {
  const withBreaks = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/t[dh]>/gi, '\t')
    .replace(/<\/(p|div|tr|li|h[1-6]|table|section)>|<br\s*\/?>/gi, '\n');
  const doc = new DOMParser().parseFromString(withBreaks, 'text/html');
  return (doc.body.textContent ?? '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
}

export async function readFile(file: File): Promise<ReadResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    return { text: await extractPdfText(await file.arrayBuffer()), type: 'pdf' };
  }
  const text = await file.text();
  if (/\.html?$/.test(name) || file.type === 'text/html') {
    // eigener Bericht: das Original behalten, der Parser liest die eingebetteten Eingaben
    return { text: text.includes(`id="${INPUT_TAG_ID}"`) ? text : htmlToText(text), type: 'html' };
  }
  return { text, type: 'text' };
}

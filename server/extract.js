// Resume file -> plain text (PDF via pdf.js, DOCX via mammoth, TXT/MD as-is).
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import mammoth from 'mammoth';

export async function extractText(buf, fileName = '') {
  const ext = fileName.toLowerCase().split('.').pop();
  if (ext === 'pdf' || buf.slice(0, 4).toString() === '%PDF') {
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), useSystemFonts: true, isEvalSupported: false, verbosity: 0 }).promise;
    let out = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const c = await page.getTextContent();
      let lastY = null;
      for (const it of c.items) {
        if (lastY !== null && Math.abs(it.transform[5] - lastY) > 2) out += '\n';
        out += it.str; lastY = it.transform[5];
      }
      out += '\n';
    }
    return out;
  }
  if (ext === 'docx') return (await mammoth.extractRawText({ buffer: buf })).value;
  return buf.toString('utf8');
}

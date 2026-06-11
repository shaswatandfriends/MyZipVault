// Test script: Demonstrate correct text extraction with pdfjs-dist v6
// Shows two approaches:
//   1. getTextContent() — for pure text extraction (Node.js compatible)
//   2. TextLayer — for visual text overlay rendering (browser/DOM only)

import { getDocument, GlobalWorkerOptions, TextLayer, version } from 'pdfjs-dist/legacy/build/pdf.mjs';

console.log('=== pdfjs-dist v6 Text Extraction Demo ===\n');
console.log('Version:', version);

// Configure worker — use absolute path for Node.js
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
GlobalWorkerOptions.workerSrc = join(__dirname, 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');

// ─── Approach 1: Pure text extraction with getTextContent() ────
// This works in both Node.js and browser — NO DOM required
async function extractTextFromPdf(data) {
  const loadingTask = getDocument({ data });
  const pdf = await loadingTask.promise;
  console.log(`PDF loaded: ${pdf.numPages} pages`);

  const allText = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map(item => item.str)
      .join(' ');
    allText.push({ page: i, text: pageText });
    console.log(`  Page ${i}: ${pageText.slice(0, 80)}${pageText.length > 80 ? '...' : ''}`);
  }
  return allText;
}

// ─── Approach 2: TextLayer (browser only) ──────────────────────
// Requires a real DOM with HTMLElement containers
// NOT suitable for Node.js text extraction
async function renderTextLayer(data, container, viewport) {
  const loadingTask = getDocument({ data });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const textContentSource = page.streamTextContent();
  
  const textLayer = new TextLayer({
    textContentSource,
    container,     // MUST be a real DOM HTMLElement
    viewport,      // MUST be a PageViewport from page.getViewport()
  });
  
  await textLayer.render();
  // After render, access:
  //   textLayer.textDivs — array of HTML span elements
  //   textLayer.textContentItemsStr — array of text strings
  return textLayer;
}

// ─── Test with a minimal in-memory PDF ─────────────────────────
// Create a tiny valid PDF buffer for testing
function createMinimalPdf() {
  const pdfString = `%PDF-1.0
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]
   /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 12 Tf 100 700 Td (Hello World) Tj ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000360 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
441
%%EOF`;
  return new Uint8Array(Buffer.from(pdfString, 'latin1'));
}

async function main() {
  const pdfData = createMinimalPdf();
  
  console.log('\n--- Testing getTextContent() approach ---');
  try {
    const text = await extractTextFromPdf(pdfData);
    console.log('\n✅ getTextContent() works! Extracted text:');
    text.forEach(t => console.log(`  Page ${t.page}: "${t.text}"`));
  } catch (e) {
    console.log('❌ getTextContent() failed:', e.message);
  }
  
  console.log('\n--- Testing TextLayer approach (will fail in Node.js) ---');
  try {
    // This WILL fail because there's no DOM in Node.js
    await renderTextLayer(pdfData, {}, {});
  } catch (e) {
    console.log('❌ TextLayer failed as expected:', e.message);
    console.log('   → TextLayer requires a browser DOM environment');
  }

  console.log('\n=== RECOMMENDATIONS ===');
  console.log('If you need TEXT EXTRACTION (getting text strings from PDF):');
  console.log('  ✅ Use page.getTextContent() — works everywhere');
  console.log('  ❌ Do NOT use TextLayer — it\'s for visual DOM rendering only');
  console.log('');
  console.log('If you need VISUAL TEXT OVERLAY (selectable text on top of canvas):');
  console.log('  ✅ Use TextLayer in browser only');
  console.log('  ✅ Correct import: import { TextLayer } from "pdfjs-dist"');
  console.log('  ❌ Wrong: import pdfjsLib from "pdfjs-dist" (no default export in v6)');
  console.log('');
  console.log('v6 BREAKING CHANGES:');
  console.log('  1. No default export — must use named imports');
  console.log('  2. TextLayer constructor changed from (textLayerRender) to ({ textContentSource, container, viewport })');
  console.log('  3. TextLayer.render() returns Promise (not void like old renderTextLayer)');
  console.log('  4. streamTextContent() returns ReadableStream (can be passed directly to TextLayer)');
}

main().catch(console.error);

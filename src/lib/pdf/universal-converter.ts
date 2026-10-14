import { PDFDocument, rgb, StandardFonts, PageSizes } from "pdf-lib";
import JSZip from "jszip";
import { loadPdfJs } from "./pdf-utils";

declare global {
  interface Window {
    pdfjsLib?: any;
    XLSX?: any;
    mammoth?: any;
    docx?: any;
    PptxGenJS?: any;
  }
}

async function ensureLibrary(url: string, globalKey: string): Promise<any> {
  if (typeof window === "undefined") return null;
  if ((window as any)[globalKey]) return (window as any)[globalKey];

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${url}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve((window as any)[globalKey]));
      existing.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.onload = () => resolve((window as any)[globalKey]);
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

/**
 * Checks whether a string contains characters outside standard WinAnsi (e.g. Arabic, Cyrillic, CJK).
 */
function hasNonWinAnsiCharacters(text: string): boolean {
  return /[^\x00-\xFF]/.test(text);
}

/**
 * High-DPI HTML5 Canvas paginator for Unicode text (Arabic RTL, Cyrillic, CJK, Emojis)
 * so pdf-lib never crashes on non-WinAnsi characters.
 */
async function unicodeTextToPDFViaCanvas(title: string, rawText: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const A4_W = PageSizes.A4[0];
  const A4_H = PageSizes.A4[1];
  const SCALE = 2;
  const canvasW = Math.round(A4_W * SCALE);
  const canvasH = Math.round(A4_H * SCALE);
  const margin = 45 * SCALE;
  const maxLineW = canvasW - margin * 2;
  const lineHeight = 18 * SCALE;

  const isRTL = /[\u0600-\u06FF]/.test(rawText);

  const measureCanvas = document.createElement("canvas");
  const mCtx = measureCanvas.getContext("2d");
  if (!mCtx) throw new Error("Canvas context unavailable for Unicode text rendering.");

  const bodyFont = `${11 * SCALE}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const boldFont = `bold ${13 * SCALE}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;

  const rawLines = rawText.split(/\r?\n/);
  const wrappedLines: { text: string; isHeader: boolean }[] = [];

  for (const rawLine of rawLines) {
    if (rawLine.trim() === "") {
      wrappedLines.push({ text: "", isHeader: false });
      continue;
    }
    const isHeader = rawLine.startsWith("# ") || rawLine.startsWith("## ");
    const cleanLine = rawLine.replace(/^#+\s*/, "");
    mCtx.font = isHeader ? boldFont : bodyFont;

    const words = cleanLine.split(" ");
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (mCtx.measureText(testLine).width <= maxLineW) {
        currentLine = testLine;
      } else {
        if (currentLine) wrappedLines.push({ text: currentLine, isHeader });
        currentLine = word;
      }
    }
    if (currentLine) {
      wrappedLines.push({ text: currentLine, isHeader });
    }
  }

  let lineCursor = 0;
  let pageIndex = 0;

  while (lineCursor < wrappedLines.length || pageIndex === 0) {
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvasW;
    pageCanvas.height = canvasH;
    const ctx = pageCanvas.getContext("2d")!;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.direction = isRTL ? "rtl" : "ltr";
    ctx.textAlign = isRTL ? "right" : "left";
    const textX = isRTL ? canvasW - margin : margin;

    let y = margin + 20 * SCALE;

    if (pageIndex === 0) {
      ctx.font = `bold ${16 * SCALE}px system-ui, sans-serif`;
      ctx.fillStyle = "#0f172a";
      ctx.fillText(title, textX, y);
      y += 28 * SCALE;
    }

    while (lineCursor < wrappedLines.length && y < canvasH - margin) {
      const item = wrappedLines[lineCursor];
      if (item.text.trim() !== "") {
        ctx.font = item.isHeader ? boldFont : bodyFont;
        ctx.fillStyle = item.isHeader ? "#0f172a" : "#1e293b";
        ctx.fillText(item.text, textX, y);
      }
      y += lineHeight;
      lineCursor++;
    }

    const blob = await new Promise<Blob | null>((res) =>
      pageCanvas.toBlob((b) => res(b), "image/jpeg", 0.92)
    );
    if (blob) {
      const bytes = await blob.arrayBuffer();
      const jpg = await pdfDoc.embedJpg(bytes);
      const page = pdfDoc.addPage(PageSizes.A4);
      page.drawImage(jpg, { x: 0, y: 0, width: A4_W, height: A4_H });
    }
    pageIndex++;
  }

  return await pdfDoc.save({ useObjectStreams: true });
}

// ==========================================
// 1. CONVERT TO PDF
// ==========================================

/**
 * Converts Plain Text or Markdown files into a cleanly paginated PDF document.
 * Automatically switches to Unicode High-DPI Canvas rendering for Arabic, Cyrillic, or non-Latin scripts.
 */
export async function textToPDF(file: File): Promise<Uint8Array> {
  const text = await file.text();
  const cleanTitle = file.name.replace(/\.[^/.]+$/, "");

  if (hasNonWinAnsiCharacters(text) || hasNonWinAnsiCharacters(cleanTitle)) {
    return await unicodeTextToPDFViaCanvas(cleanTitle, text);
  }

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const fontSize = 10.5;
  const lineHeight = 15;
  const margin = 45;
  const pageWidth = PageSizes.A4[0];
  const pageHeight = PageSizes.A4[1];
  const maxLineWidth = pageWidth - margin * 2;

  const rawLines = text.split(/\r?\n/);
  const wrappedLines: { text: string; isHeader: boolean }[] = [];

  for (const rawLine of rawLines) {
    if (rawLine.trim() === "") {
      wrappedLines.push({ text: "", isHeader: false });
      continue;
    }

    const isHeader = rawLine.startsWith("# ") || rawLine.startsWith("## ");
    const cleanLine = rawLine.replace(/^#+\s*/, "");
    const words = cleanLine.split(" ");
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth <= maxLineWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) wrappedLines.push({ text: currentLine, isHeader });
        currentLine = word;
      }
    }
    if (currentLine) {
      wrappedLines.push({ text: currentLine, isHeader });
    }
  }

  let currentPage = pdfDoc.addPage(PageSizes.A4);
  let y = pageHeight - margin;

  currentPage.drawText(cleanTitle, {
    x: margin,
    y,
    size: 16,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 28;

  for (const line of wrappedLines) {
    if (y < margin + lineHeight) {
      currentPage = pdfDoc.addPage(PageSizes.A4);
      y = pageHeight - margin;
    }

    if (line.text.trim() !== "") {
      currentPage.drawText(line.text, {
        x: margin,
        y,
        size: line.isHeader ? fontSize + 2 : fontSize,
        font: line.isHeader ? boldFont : font,
        color: rgb(0.15, 0.15, 0.15),
      });
    }

    y -= lineHeight;
  }

  return await pdfDoc.save({ useObjectStreams: true });
}

/**
 * Converts Microsoft Word (.docx) documents to PDF in the browser using mammoth.
 */
export async function wordToPDF(file: File): Promise<Uint8Array> {
  let mammothLib = window.mammoth;
  if (!mammothLib) {
    try {
      mammothLib = await import("mammoth");
    } catch {
      mammothLib = await ensureLibrary(
        "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js",
        "mammoth"
      );
    }
  }

  const arrayBuffer = await file.arrayBuffer();
  const { value: rawText } = await mammothLib.extractRawText({ arrayBuffer });

  const textFile = new File([rawText], file.name.replace(/\.docx?$/i, ".txt"), {
    type: "text/plain",
  });
  return await textToPDF(textFile);
}

/**
 * Converts Microsoft PowerPoint (.pptx) decks into landscape 16:9 PDF slides client-side
 * by parsing slide XML structures from the PPTX ZIP container.
 */
export async function powerpointToPDF(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml/i)?.[1] || "0", 10);
      const numB = parseInt(b.match(/slide(\d+)\.xml/i)?.[1] || "0", 10);
      return numA - numB;
    });

  if (slideFiles.length === 0) {
    throw new Error("No valid PowerPoint slides were found in this file.");
  }

  const pdfDoc = await PDFDocument.create();
  const SLIDE_W = 841.89; // Landscape A4 / 16:9 width
  const SLIDE_H = 473.56;
  const SCALE = 2;

  for (let i = 0; i < slideFiles.length; i++) {
    const xmlContent = await zip.files[slideFiles[i]].async("text");
    const paragraphs: string[] = [];

    const pMatches = xmlContent.match(/<a:p\b[^>]*>[\s\S]*?<\/a:p>/g) || [];
    for (const pXml of pMatches) {
      const tMatches = pXml.match(/<a:t\b[^>]*>([\s\S]*?)<\/a:t>/g) || [];
      const line = tMatches
        .map((t) =>
          t
            .replace(/<\/?a:t[^>]*>/g, "")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
        )
        .join("");
      if (line.trim()) {
        paragraphs.push(line.trim());
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(SLIDE_W * SCALE);
    canvas.height = Math.round(SLIDE_H * SCALE);
    const ctx = canvas.getContext("2d")!;

    // Clean slide background & accent header bar
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#e11d48";
    ctx.fillRect(0, 0, canvas.width, 10 * SCALE);

    // Slide number badge
    ctx.font = `bold ${10 * SCALE}px monospace`;
    ctx.fillStyle = "#94a3b8";
    ctx.textAlign = "right";
    ctx.fillText(`SLIDE ${i + 1} / ${slideFiles.length}`, canvas.width - 36 * SCALE, canvas.height - 22 * SCALE);

    const isRTL = paragraphs.some((p) => /[\u0600-\u06FF]/.test(p));
    ctx.direction = isRTL ? "rtl" : "ltr";
    ctx.textAlign = isRTL ? "right" : "left";
    const startX = isRTL ? canvas.width - 48 * SCALE : 48 * SCALE;
    const maxW = canvas.width - 96 * SCALE;

    let y = 58 * SCALE;
    paragraphs.forEach((para, idx) => {
      if (y > canvas.height - 45 * SCALE) return;
      const isTitle = idx === 0;
      ctx.font = isTitle
        ? `bold ${22 * SCALE}px system-ui, sans-serif`
        : `${13.5 * SCALE}px system-ui, sans-serif`;
      ctx.fillStyle = isTitle ? "#0f172a" : "#334155";

      const words = (isTitle ? para : `• ${para}`).split(" ");
      let line = "";
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width <= maxW) {
          line = test;
        } else {
          ctx.fillText(line, startX, y);
          y += (isTitle ? 28 : 20) * SCALE;
          line = word;
        }
      }
      if (line && y <= canvas.height - 40 * SCALE) {
        ctx.fillText(line, startX, y);
        y += (isTitle ? 34 : 24) * SCALE;
      }
    });

    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob((b) => res(b), "image/jpeg", 0.92)
    );
    if (blob) {
      const jpgBytes = await blob.arrayBuffer();
      const jpg = await pdfDoc.embedJpg(jpgBytes);
      const page = pdfDoc.addPage([SLIDE_W, SLIDE_H]);
      page.drawImage(jpg, { x: 0, y: 0, width: SLIDE_W, height: SLIDE_H });
    }
  }

  return await pdfDoc.save({ useObjectStreams: true });
}

/**
 * Converts Microsoft Excel (.xlsx, .xls, .csv) files into formatted landscape PDF tables.
 * Uses Unicode-safe rendering when non-Latin characters are present.
 */
export async function excelToPDF(file: File): Promise<Uint8Array> {
  let xlsxLib = window.XLSX;
  if (!xlsxLib) {
    try {
      xlsxLib = await import("xlsx");
    } catch {
      xlsxLib = await ensureLibrary(
        "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
        "XLSX"
      );
    }
  }

  const arrayBuffer = await file.arrayBuffer();
  const workbook = xlsxLib.read(arrayBuffer, { type: "array" });

  // Check if any cell contains Unicode characters outside WinAnsi
  let containsUnicode = false;
  for (const sheetName of workbook.SheetNames) {
    if (hasNonWinAnsiCharacters(sheetName)) containsUnicode = true;
    const rows: any[][] = xlsxLib.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    for (const row of rows) {
      if (Array.isArray(row) && row.some((c) => c !== undefined && hasNonWinAnsiCharacters(String(c)))) {
        containsUnicode = true;
        break;
      }
    }
  }

  if (containsUnicode) {
    let textDump = "";
    for (const sheetName of workbook.SheetNames) {
      textDump += `# Sheet: ${sheetName}\n`;
      const rows: any[][] = xlsxLib.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
      for (const row of rows) {
        if (Array.isArray(row) && row.length > 0) {
          textDump += row.map((c) => (c !== undefined ? String(c) : "")).join("  |  ") + "\n";
        }
      }
      textDump += "\n";
    }
    return await unicodeTextToPDFViaCanvas(file.name.replace(/\.[^/.]+$/, ""), textDump);
  }

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const margin = 35;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data: any[][] = xlsxLib.utils.sheet_to_json(sheet, { header: 1 });
    if (!data || data.length === 0) continue;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    page.drawText(`Sheet: ${sheetName}`, {
      x: margin,
      y,
      size: 14,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 25;

    const maxCols = Math.min(
      Math.max(...data.map((r) => (Array.isArray(r) ? r.length : 0))),
      8
    );
    if (maxCols === 0) continue;

    const colWidth = (pageWidth - margin * 2) / maxCols;
    const rowHeight = 18;

    for (let rIdx = 0; rIdx < data.length; rIdx++) {
      const row = data[rIdx];
      if (!row) continue;

      if (y < margin + rowHeight) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }

      if (rIdx === 0) {
        page.drawRectangle({
          x: margin,
          y: y - rowHeight + 12,
          width: pageWidth - margin * 2,
          height: rowHeight,
          color: rgb(0.9, 0.95, 0.92),
        });
      }

      for (let cIdx = 0; cIdx < maxCols; cIdx++) {
        const cellValue = row[cIdx] !== undefined ? String(row[cIdx]).slice(0, 22) : "";
        if (cellValue) {
          page.drawText(cellValue, {
            x: margin + cIdx * colWidth + 4,
            y: y - 2,
            size: 8.5,
            font: rIdx === 0 ? boldFont : font,
            color: rIdx === 0 ? rgb(0.05, 0.3, 0.15) : rgb(0.2, 0.2, 0.2),
          });
        }
      }

      y -= rowHeight;
    }
  }

  return await pdfDoc.save({ useObjectStreams: true });
}

// ==========================================
// 2. CONVERT FROM PDF
// ==========================================

/**
 * Extracts raw textual content from all pages of a PDF document using PDF.js.
 */
export async function pdfToText(file: File): Promise<string> {
  const pdfjs = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);
    fullText += `--- Page ${i} ---\n` + strings.join(" ") + "\n\n";
  }

  return fullText;
}

/**
 * Extracts text lines and converts a PDF into an editable Microsoft Word (.docx) document.
 */
export async function pdfToWord(file: File): Promise<Blob> {
  let docxLib = window.docx;
  if (!docxLib) {
    try {
      docxLib = await import("docx");
    } catch {
      docxLib = await ensureLibrary(
        "https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js",
        "docx"
      );
    }
  }

  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docxLib;
  const pdfjs = await loadPdfJs();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const docChildren: any[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    docChildren.push(
      new Paragraph({
        text: `Page ${i}`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      })
    );

    const items = content.items;
    let currentY: number | null = null;
    let lineBuffer: string[] = [];

    for (const item of items) {
      if (!item.str || item.str.trim() === "") continue;

      if (currentY !== null && Math.abs(item.transform[5] - currentY) > 6) {
        docChildren.push(
          new Paragraph({
            children: [new TextRun(lineBuffer.join(" "))],
            spacing: { after: 80 },
          })
        );
        lineBuffer = [];
      }

      lineBuffer.push(item.str);
      currentY = item.transform[5];
    }

    if (lineBuffer.length > 0) {
      docChildren.push(
        new Paragraph({
          children: [new TextRun(lineBuffer.join(" "))],
          spacing: { after: 120 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [{ properties: {}, children: docChildren }],
  });

  return await Packer.toBlob(doc);
}

/**
 * Extracts tabulated text data from a PDF and converts it into a Microsoft Excel (.xlsx) file.
 */
export async function pdfToExcel(file: File): Promise<Blob> {
  let xlsxLib = window.XLSX;
  if (!xlsxLib) {
    try {
      xlsxLib = await import("xlsx");
    } catch {
      xlsxLib = await ensureLibrary(
        "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
        "XLSX"
      );
    }
  }

  const pdfjs = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const workbook = xlsxLib.utils.book_new();

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const rows: string[][] = [];

    let currentY: number | null = null;
    let currentRow: string[] = [];

    for (const item of content.items) {
      if (!item.str) continue;

      if (currentY !== null && Math.abs(item.transform[5] - currentY) > 8) {
        if (currentRow.length > 0) rows.push(currentRow);
        currentRow = [];
      }

      currentRow.push(item.str.trim());
      currentY = item.transform[5];
    }
    if (currentRow.length > 0) rows.push(currentRow);

    const worksheet = xlsxLib.utils.aoa_to_sheet(
      rows.length > 0 ? rows : [["No tabular text detected"]]
    );
    xlsxLib.utils.book_append_sheet(workbook, worksheet, `Page ${i}`);
  }

  const excelBuffer = xlsxLib.write(workbook, { bookType: "xlsx", type: "array" });
  return new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * Renders PDF pages into slide images and packages them into a PowerPoint (.pptx) presentation.
 */
export async function pdfToPowerPoint(file: File): Promise<Blob> {
  let PptxGen = window.PptxGenJS;
  if (!PptxGen) {
    try {
      PptxGen = (await import("pptxgenjs")).default;
    } catch {
      PptxGen = await ensureLibrary(
        "https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js",
        "PptxGenJS"
      );
    }
  }

  const pdfjs = await loadPdfJs();
  const pptx = new PptxGen();
  pptx.layout = "LAYOUT_WIDE";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      await page.render({ canvasContext: ctx, viewport }).promise;
      const dataUrl = canvas.toDataURL("image/jpeg", 0.88);

      const slide = pptx.addSlide();
      slide.addImage({
        data: dataUrl,
        x: 0.5,
        y: 0.3,
        w: 12.33,
        h: 6.9,
      });
    }
  }

  const out = await pptx.write({ outputType: "blob" });
  return out as Blob;
}
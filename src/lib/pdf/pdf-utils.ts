import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

let _pdfJsPromise: Promise<any> | null = null;

/**
 * Reliable singleton loader for PDF.js in browser memory (eliminates setTimeout race conditions).
 */
export async function loadPdfJs(): Promise<any> {
  if (typeof window === "undefined") {
    throw new Error("PDF rendering requires a browser environment.");
  }
  if (window.pdfjsLib) {
    return window.pdfjsLib;
  }
  if (_pdfJsPromise) {
    return _pdfJsPromise;
  }

  _pdfJsPromise = new Promise((resolve, reject) => {
    const CDN_SCRIPT = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    const CDN_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

    const existing = document.querySelector(`script[src="${CDN_SCRIPT}"]`);
    if (existing) {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = CDN_WORKER;
        resolve(window.pdfjsLib);
        return;
      }
      existing.addEventListener("load", () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = CDN_WORKER;
          resolve(window.pdfjsLib);
        } else {
          reject(new Error("Failed to initialize PDF.js engine."));
        }
      });
      existing.addEventListener("error", () => {
        _pdfJsPromise = null;
        reject(new Error("Could not load PDF rendering script."));
      });
      return;
    }

    const script = document.createElement("script");
    script.src = CDN_SCRIPT;
    script.async = true;
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = CDN_WORKER;
        resolve(window.pdfjsLib);
      } else {
        _pdfJsPromise = null;
        reject(new Error("PDF.js failed to attach to window."));
      }
    };
    script.onerror = () => {
      _pdfJsPromise = null;
      reject(new Error("Network error while loading PDF engine."));
    };
    document.body.appendChild(script);
  });

  return _pdfJsPromise;
}

/**
 * Multi-tier client-side PDF compressor that optimizes object streams AND downsamples page rasters
 * when "recommended" or "extreme" compression (or a specific targetKb budget) is selected.
 */
export async function compressPDFDocument(
  file: File,
  level: "extreme" | "recommended" | "low",
  targetKb?: number,
  onProgress?: (current: number, total: number) => void
): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  const originalDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

  // Strip all redundant document metadata
  originalDoc.setTitle("");
  originalDoc.setAuthor("");
  originalDoc.setSubject("");
  originalDoc.setKeywords([]);
  originalDoc.setProducer("");
  originalDoc.setCreator("");

  const streamCompressedBytes = await originalDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });

  // For "low" compression (if no strict KB cap), return lossless stream optimization if smaller than original
  if (level === "low" && !targetKb) {
    return streamCompressedBytes.length < file.size
      ? streamCompressedBytes
      : new Uint8Array(buffer);
  }

  // If stream compression already satisfies targetKb and saved >15%, return it immediately
  if (
    targetKb &&
    streamCompressedBytes.length <= targetKb * 1024 &&
    streamCompressedBytes.length < file.size * 0.85
  ) {
    return streamCompressedBytes;
  }

  // Perform canvas raster re-encoding via PDF.js for true size reduction on image/scanned PDFs
  try {
    const pdfjs = await loadPdfJs();
    const pdf = await pdfjs.getDocument({ data: buffer.slice(0) }).promise;
    const numPages = pdf.numPages;

    // Choose scale & JPEG quality based on compression level and optional KB budget
    let scale = level === "extreme" ? 1.0 : 1.4;
    let quality = level === "extreme" ? 0.5 : 0.74;

    if (targetKb) {
      const targetBytesPerPage = (targetKb * 1024) / Math.max(1, numPages);
      if (targetBytesPerPage < 35000) {
        scale = 0.85;
        quality = 0.42;
      } else if (targetBytesPerPage < 75000) {
        scale = 1.05;
        quality = 0.55;
      }
    }

    const rebuiltPdf = await PDFDocument.create();

    for (let i = 1; i <= numPages; i++) {
      onProgress?.(i, numPages);
      const page = await pdf.getPage(i);
      const baseViewport = page.getViewport({ scale: 1.0 });
      const renderViewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(renderViewport.width));
      canvas.height = Math.max(1, Math.floor(renderViewport.height));
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;

        const blob = await new Promise<Blob | null>((res) =>
          canvas.toBlob((b) => res(b), "image/jpeg", quality)
        );

        if (blob) {
          const jpgBytes = await blob.arrayBuffer();
          const jpgImage = await rebuiltPdf.embedJpg(jpgBytes);
          const pdfPage = rebuiltPdf.addPage([baseViewport.width, baseViewport.height]);
          pdfPage.drawImage(jpgImage, {
            x: 0,
            y: 0,
            width: baseViewport.width,
            height: baseViewport.height,
          });
        }
      }
    }

    const rasterCompressedBytes = await rebuiltPdf.save({ useObjectStreams: true });

    // Pick whichever representation achieved the smallest byte footprint
    const candidates = [
      new Uint8Array(buffer),
      streamCompressedBytes,
      rasterCompressedBytes,
    ].sort((a, b) => a.length - b.length);

    return candidates[0];
  } catch {
    // Fallback if PDF.js rasterization is unavailable
    return streamCompressedBytes.length < file.size
      ? streamCompressedBytes
      : new Uint8Array(buffer);
  }
}

/**
 * Merges multiple PDF File objects into a single PDF document client-side.
 */
export async function mergePDFs(files: File[]): Promise<Uint8Array> {
  if (files.length < 2) {
    throw new Error("At least two PDF files are required to perform a merge.");
  }

  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: false,
      });

      const pageIndices = sourcePdf.getPageIndices();
      const copiedPages = await mergedPdf.copyPages(sourcePdf, pageIndices);
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error";
      throw new Error(
        `Failed to read "${file.name}". It may be password-protected or corrupted. (${errorMessage})`
      );
    }
  }

  return await mergedPdf.save({ useObjectStreams: true });
}

/**
 * Triggers a native browser file download using an in-memory Blob URL.
 */
export function downloadBlob(
  data: Uint8Array | Blob,
  fileName: string,
  mimeType: string = "application/pdf"
): void {
  const blob =
    data instanceof Blob ? data : new Blob([data as BlobPart], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);

  const downloadLink = document.createElement("a");
  downloadLink.href = objectUrl;
  downloadLink.download = fileName;
  document.body.appendChild(downloadLink);
  downloadLink.click();

  document.body.removeChild(downloadLink);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}

/**
 * Compiles a list of HTMLCanvasElements into a standard A4 multi-page PDF document.
 */
export async function canvasesToPDF(canvases: HTMLCanvasElement[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  const A4_WIDTH = 595.28;
  const A4_HEIGHT = 841.89;
  const MARGIN = 20;

  const availableWidth = A4_WIDTH - MARGIN * 2;
  const availableHeight = A4_HEIGHT - MARGIN * 2;

  for (const canvas of canvases) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92)
    );
    if (!blob) continue;
    const imageBytes = await blob.arrayBuffer();

    const embeddedImage = await pdfDoc.embedJpg(imageBytes);
    const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

    const scale = Math.min(
      availableWidth / embeddedImage.width,
      availableHeight / embeddedImage.height
    );
    const drawWidth = embeddedImage.width * scale;
    const drawHeight = embeddedImage.height * scale;

    const x = (A4_WIDTH - drawWidth) / 2;
    const y = (A4_HEIGHT - drawHeight) / 2;

    page.drawImage(embeddedImage, {
      x,
      y,
      width: drawWidth,
      height: drawHeight,
    });
  }

  return await pdfDoc.save({ useObjectStreams: true });
}

/**
 * Internal helper to decode and format an image into PDF-compatible bytes.
 */
async function getImageEmbedData(
  pdfDoc: PDFDocument,
  file: File
): Promise<{ image: import("pdf-lib").PDFImage }> {
  const isJpeg = file.type === "image/jpeg" || file.type === "image/jpg";
  const isPng = file.type === "image/png";

  if (isJpeg) {
    const bytes = await file.arrayBuffer();
    const image = await pdfDoc.embedJpg(bytes);
    return { image };
  }

  if (isPng) {
    try {
      const bytes = await file.arrayBuffer();
      const image = await pdfDoc.embedPng(bytes);
      return { image };
    } catch {
      // Fall through to canvas rasterizer if PNG has custom color profile
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not initialize canvas context for image conversion."));
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            reject(new Error(`Failed to rasterize image: ${file.name}`));
            return;
          }
          const bytes = await blob.arrayBuffer();
          const image = await pdfDoc.embedJpg(bytes);
          resolve({ image });
        },
        "image/jpeg",
        0.95
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image "${file.name}". File may be corrupt.`));
    };

    img.src = url;
  });
}

/**
 * Converts a collection of image files into a single PDF document.
 */
export async function imagesToPDF(
  files: File[],
  options: {
    orientation: "portrait" | "landscape";
    margin: number;
    pageSize: "A4" | "fit";
  }
): Promise<Uint8Array> {
  if (files.length === 0) {
    throw new Error("Please select at least one image to convert.");
  }

  const pdfDoc = await PDFDocument.create();

  const A4_PORTRAIT_W = 595.28;
  const A4_PORTRAIT_H = 841.89;

  for (const file of files) {
    const { image } = await getImageEmbedData(pdfDoc, file);

    if (options.pageSize === "fit") {
      if (options.margin === 0) {
        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        });
      } else {
        const pageW = image.width + options.margin * 2;
        const pageH = image.height + options.margin * 2;
        const page = pdfDoc.addPage([pageW, pageH]);

        page.drawImage(image, {
          x: options.margin,
          y: options.margin,
          width: image.width,
          height: image.height,
        });
      }
    } else {
      const pageW = options.orientation === "portrait" ? A4_PORTRAIT_W : A4_PORTRAIT_H;
      const pageH = options.orientation === "portrait" ? A4_PORTRAIT_H : A4_PORTRAIT_W;
      const page = pdfDoc.addPage([pageW, pageH]);

      if (options.margin === 0) {
        const scale = Math.max(pageW / image.width, pageH / image.height);
        const drawW = image.width * scale;
        const drawH = image.height * scale;

        const x = (pageW - drawW) / 2;
        const y = (pageH - drawH) / 2;

        page.drawImage(image, {
          x,
          y,
          width: drawW,
          height: drawH,
        });
      } else {
        const availW = pageW - options.margin * 2;
        const availH = pageH - options.margin * 2;

        const scale = Math.min(availW / image.width, availH / image.height);
        const drawW = image.width * scale;
        const drawH = image.height * scale;

        const x = (pageW - drawW) / 2;
        const y = (pageH - drawH) / 2;

        page.drawImage(image, {
          x,
          y,
          width: drawW,
          height: drawH,
        });
      }
    }
  }

  return await pdfDoc.save({ useObjectStreams: true });
}

/**
 * Inspects a PDF file in-memory and returns its total page count.
 */
export async function getPDFPageCount(file: File): Promise<number> {
  const bytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return pdfDoc.getPageCount();
}

/**
 * Parses a page range string (e.g. "1-3, 5, 8-10") into a sorted array of 0-based page indices.
 */
export function parsePageRangeString(rangeStr: string, totalPages: number): number[] {
  const cleaned = rangeStr.replace(/\s+/g, "");
  if (!cleaned) throw new Error("Please specify at least one page number or range.");

  const tokens = cleaned.split(",");
  const selectedPages = new Set<number>();

  for (const token of tokens) {
    if (!token) continue;

    if (token.includes("-")) {
      const [startStr, endStr] = token.split("-");
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (isNaN(start) || isNaN(end)) {
        throw new Error(`Invalid range format: "${token}"`);
      }
      if (start < 1 || end > totalPages || start > end) {
        throw new Error(`Range "${token}" is outside document limits (1 to ${totalPages} pages).`);
      }

      for (let i = start; i <= end; i++) {
        selectedPages.add(i - 1);
      }
    } else {
      const pageNum = parseInt(token, 10);
      if (isNaN(pageNum)) {
        throw new Error(`Invalid page number: "${token}"`);
      }
      if (pageNum < 1 || pageNum > totalPages) {
        throw new Error(`Page ${pageNum} is out of bounds (Document has ${totalPages} pages).`);
      }
      selectedPages.add(pageNum - 1);
    }
  }

  if (selectedPages.size === 0) {
    throw new Error("No valid pages were extracted from the specified range.");
  }

  return Array.from(selectedPages).sort((a, b) => a - b);
}

/**
 * Splits a PDF document by extracting only the requested 1-based page range.
 */
export async function splitPDF(file: File, pageRangeStr: string): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(bytes, { ignoreEncryption: false });
  const totalPages = sourcePdf.getPageCount();

  const pageIndices = parsePageRangeString(pageRangeStr, totalPages);

  const targetPdf = await PDFDocument.create();
  const copiedPages = await targetPdf.copyPages(sourcePdf, pageIndices);

  copiedPages.forEach((page) => targetPdf.addPage(page));

  return await targetPdf.save({ useObjectStreams: true });
}

export interface SignaturePlacement {
  pageNumber: number;
  signatureDataUrl: string;
  position: {
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    heightPercent: number;
  };
}

/**
 * Embeds multiple PNG signatures/stamps across any pages of a PDF in a single pass,
 * plus optional diagonal watermark text.
 */
export async function embedSignaturesIntoPDF(
  pdfFile: File,
  signatures: SignaturePlacement[],
  watermarkText?: string
): Promise<Uint8Array> {
  const bytes = await pdfFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: false });
  const pages = pdfDoc.getPages();

  if (watermarkText && watermarkText.trim()) {
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const cleanWatermark = watermarkText.replace(/[^\x20-\x7E]/g, "").trim();
    if (cleanWatermark) {
      for (const page of pages) {
        const { width, height } = page.getSize();
        page.drawText(cleanWatermark, {
          x: width * 0.18,
          y: height * 0.45,
          size: Math.min(width, height) * 0.08,
          font,
          color: rgb(0.85, 0.15, 0.25),
          opacity: 0.16,
          rotate: degrees(35),
        });
      }
    }
  }

  for (const sig of signatures) {
    const targetPageIndex = sig.pageNumber - 1;
    if (targetPageIndex < 0 || targetPageIndex >= pages.length) continue;

    const page = pages[targetPageIndex];
    const { width: pageWidth, height: pageHeight } = page.getSize();

    const response = await fetch(sig.signatureDataUrl);
    const signatureBytes = await response.arrayBuffer();
    const signatureImage = await pdfDoc.embedPng(signatureBytes);

    const xRatio = sig.position.xPercent > 1 ? sig.position.xPercent / 100 : sig.position.xPercent;
    const yRatio = sig.position.yPercent > 1 ? sig.position.yPercent / 100 : sig.position.yPercent;
    const wRatio = sig.position.widthPercent > 1 ? sig.position.widthPercent / 100 : sig.position.widthPercent;
    const hRatio = sig.position.heightPercent > 1 ? sig.position.heightPercent / 100 : sig.position.heightPercent;

    const drawWidth = wRatio * pageWidth;
    const drawHeight = hRatio * pageHeight;
    const drawX = xRatio * pageWidth;
    const drawY = pageHeight - (yRatio + hRatio) * pageHeight;

    page.drawImage(signatureImage, {
      x: drawX,
      y: drawY,
      width: drawWidth,
      height: drawHeight,
    });
  }

  return await pdfDoc.save({ useObjectStreams: true });
}

export async function embedSignatureIntoPDF(
  pdfFile: File,
  pageNumber: number,
  signatureDataUrl: string,
  position: {
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    heightPercent: number;
  }
): Promise<Uint8Array> {
  return embedSignaturesIntoPDF(pdfFile, [
    { pageNumber, signatureDataUrl, position },
  ]);
}
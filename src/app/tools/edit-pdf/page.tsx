"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileDropzone } from "@/components/tools/FileDropzone";
import { downloadBlob, loadPdfJs } from "@/lib/pdf/pdf-utils";
import { PDFDocument, rgb } from "pdf-lib";
import {
  FileEdit,
  Type,
  Eraser,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Download,
  AlertCircle,
  CheckCircle2,
  Trash2,
  RotateCcw,
  Plus,
  Bold,
  Italic,
  Undo2,
  Redo2,
  Search,
  Replace,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Move,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ScanText,
  MousePointerClick,
} from "lucide-react";

export type PdfFontFamily = "calibri" | "sans" | "serif" | "mono";
export type MaskBgMode = "auto" | "white" | "cream" | "black" | "transparent" | "custom";
export type TextAlignMode = "left" | "center" | "right";
export type SelectionGranularity = "word" | "line" | "paragraph";

export interface TextBlockItem {
  id: string;
  pageNumber: number;
  originalText: string;
  currentText: string;
  isNew: boolean;
  isWhiteoutOnly?: boolean;
  isMultiline?: boolean;
  lineHeightPt?: number;
  rawFontSizePt: number;
  origXPercent: number;
  origYPercent: number;
  origBaselineYPercent: number;
  origWidthPercent: number;
  origHeightPercent: number;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  // Saved original typography (locked when extracted so editing text never mutates size/style)
  origFontSizePt: number;
  origFontFamily: PdfFontFamily;
  origColor: string;
  origIsBold: boolean;
  origIsItalic: boolean;
  // Current active typography
  fontSizePt: number;
  fontFamily: PdfFontFamily;
  color: string;
  isBold: boolean;
  isItalic: boolean;
  textAlign: TextAlignMode;
  maskBg: MaskBgMode;
  autoBgHex: string;
  customMaskHex: string;
}

const FONT_CSS_MAP: Record<PdfFontFamily, string> = {
  serif:
    '"Computer Modern Serif", "Latin Modern Roman", "Times New Roman", Times, Georgia, Cambria, serif',
  calibri: 'Calibri, Carlito, "Segoe UI", Candara, Arial, sans-serif',
  sans: 'Arial, Helvetica, "Liberation Sans", system-ui, sans-serif',
  mono: '"Courier New", Courier, Consolas, Menlo, monospace',
};

const RENDER_SCALE = 1.6;

function multiplyTransform(m1: number[], m2: number[]): number[] {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

function hexToRgbComponents(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "").trim();
  if (clean.length !== 6) return { r: 1, g: 1, b: 1 };
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return { r: 1, g: 1, b: 1 };
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const parts = dataUrl.split(",");
  const base64 = parts.length > 1 ? parts[1] : parts[0];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function detectDocumentDefaultFontFromBytes(buffer: ArrayBuffer): PdfFontFamily {
  try {
    const slice = buffer.slice(0, Math.min(buffer.byteLength, 2 * 1024 * 1024));
    const ascii = new TextDecoder("latin1").decode(slice);
    const matches = ascii.match(/\/BaseFont\s*\/([^\s\/\[\]<>()]+)/g) || [];
    let serifScore = 0;
    let calibriScore = 0;
    let sansScore = 0;

    for (const raw of matches) {
      const name = raw.toLowerCase();
      if (
        /cmr|cmbx|cmti|cmsl|cmcsc|cmmi|sfrm|sfbx|sfti|sfsl|lmroman|times|georgia|garamond|cambria|palatino|baskerville|nimbusrom|termes|pagella|bonum|schola|libertine|libertinus|charter|bookman|century|utopia|fourier|stix|xits|serif/.test(
          name
        ) &&
        !/sans|cmss|sfss|lmsans/.test(name)
      ) {
        serifScore += 2;
      } else if (/calibri|carlito|aptos|candara|corbel|segoe/.test(name)) {
        calibriScore += 2;
      } else if (/arial|helvetica|inter|roboto|tahoma|verdana|cmss|sfss|lmsans|sans/.test(name)) {
        sansScore += 1;
      }
    }

    if (serifScore > 0 && serifScore >= calibriScore && serifScore >= sansScore) {
      return "serif";
    }
    if (calibriScore > 0 && calibriScore >= sansScore) {
      return "calibri";
    }
    if (sansScore > 0) {
      return "sans";
    }
    return "serif";
  } catch {
    return "serif";
  }
}

/**
 * Determines fontFamily, isBold, and isItalic strictly from the PDF's actual font descriptor
 * and font name table (never guessing Bold from pixel darkness so regular text never turns Bold!).
 */
function classifyPdfFontMetadata(
  realFontName: string,
  fallbackStyleFamily: string,
  transformShear: number,
  fontSize: number,
  docDefaultFamily: PdfFontFamily,
  fObj?: any
): { fontFamily: PdfFontFamily; isBold: boolean; isItalic: boolean } {
  const lowerName = realFontName.toLowerCase();
  const lowerStyle = fallbackStyleFamily.toLowerCase();

  let fontFamily: PdfFontFamily = docDefaultFamily;

  if (
    Boolean(fObj?.isMonospace) ||
    /mono|courier|consolas|menlo|fixed|typewriter|code|cmtt|sftt|lmmono/.test(lowerName) ||
    lowerStyle === "monospace"
  ) {
    fontFamily = "mono";
  } else if (
    Boolean(fObj?.isSerifFont) ||
    (/serif|times|georgia|garamond|cambria|palatino|mincho|baskerville|cmr|cmbx|cmti|cmsl|cmcsc|cmmi|sfrm|sfbx|sfti|sfsl|sfcsc|lmroman|nimbusrom|termes|pagella|bonum|schola|libertine|libertinus|charter|bookman|century|utopia|fourier|stix|xits|crimson|merriweather|bodoni|caslon|didot|constantia/.test(
      lowerName
    ) &&
      !/sans|cmss|sfss|lmsans/.test(lowerName)) ||
    lowerStyle === "serif"
  ) {
    fontFamily = "serif";
  } else if (/calibri|carlito|aptos|candara|corbel|segoe/.test(lowerName)) {
    fontFamily = "calibri";
  } else if (
    /arial|helvetica|inter|roboto|tahoma|verdana|cmss|sfss|lmsans|dejavusans|liberationsans/.test(
      lowerName
    )
  ) {
    fontFamily = "sans";
  }

  const isBold =
    Boolean(fObj?.bold || fObj?.black) ||
    /bold|black|heavy|demi|semibold|extrabold|-bd|cmbx|sfbx|lmroman.*bold|nimbusrom.*medi|-medi|700|800|900/.test(
      lowerName
    );

  const isItalic =
    Boolean(fObj?.italic) ||
    /italic|oblique|slanted|-it|cmti|sfti|cmsl|sfsl|cmmi|lmroman.*italic/.test(lowerName) ||
    Math.abs(transformShear) > 0.08 * fontSize;

  return { fontFamily, isBold, isItalic };
}

/**
 * Gently calibrates fontSizePt on full lines (>= 10 chars) against the exact PDF line width
 * with a tight [0.91x .. 1.02x] clamp so the original PDF font size is faithfully preserved.
 */
function calibrateLineFontSizePt(
  text: string,
  targetWidthPt: number,
  rawFontSizePt: number,
  fontFamily: PdfFontFamily,
  isBold: boolean,
  isItalic: boolean
): number {
  const exactRaw = Math.round(rawFontSizePt * 10) / 10;
  const firstLine = (text || "").split("\n")[0];
  if (
    !firstLine ||
    firstLine.trim().length < 10 ||
    targetWidthPt <= 25 ||
    typeof document === "undefined"
  ) {
    return exactRaw;
  }
  try {
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    if (!ctx) return exactRaw;
    const testPx = 100;
    const prefix = `${isItalic ? "italic " : ""}${isBold ? "bold " : ""}`;
    ctx.font = `${prefix}${testPx}px ${FONT_CSS_MAP[fontFamily]}`;
    const measuredAt100 = ctx.measureText(firstLine).width;
    if (measuredAt100 <= 0) return exactRaw;

    const widthMatchedPt = (targetWidthPt / measuredAt100) * testPx;
    const clamped = Math.max(
      rawFontSizePt * 0.91,
      Math.min(rawFontSizePt * 1.02, widthMatchedPt)
    );
    return Math.round(clamped * 10) / 10;
  } catch {
    return exactRaw;
  }
}

/**
 * Samples the rendered PDF canvas for background color (`autoBgHex`), optical ink color (`autoFgHex`),
 * and horizontal baseline Serif-foot ratio (`pixelIsSerif`).
 * Never overrides `isBold` from pixels so regular text never turns Bold!
 */
function sampleCanvasStyleForBox(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  boxXPx: number,
  boxYPx: number,
  boxWPx: number,
  boxHPx: number
): { autoBgHex: string; autoFgHex: string; pixelIsSerif: boolean } {
  try {
    const pad = 2;
    const sx = Math.max(0, Math.floor(boxXPx - pad));
    const sy = Math.max(0, Math.floor(boxYPx - pad));
    const sw = Math.min(canvasW - sx, Math.ceil(boxWPx + pad * 2));
    const sh = Math.min(canvasH - sy, Math.ceil(boxHPx + pad * 2));

    if (sw <= 3 || sh <= 3) {
      return {
        autoBgHex: "#ffffff",
        autoFgHex: "#22252a",
        pixelIsSerif: false,
      };
    }

    const imgData = ctx.getImageData(sx, sy, sw, sh).data;
    const edgeR: number[] = [];
    const edgeG: number[] = [];
    const edgeB: number[] = [];

    for (let x = 0; x < sw; x += 2) {
      for (const y of [0, sh - 1]) {
        const idx = (y * sw + x) * 4;
        edgeR.push(imgData[idx]);
        edgeG.push(imgData[idx + 1]);
        edgeB.push(imgData[idx + 2]);
      }
    }

    let bgR = 255,
      bgG = 255,
      bgB = 255;
    if (edgeR.length > 0) {
      edgeR.sort((a, b) => a - b);
      edgeG.sort((a, b) => a - b);
      edgeB.sort((a, b) => a - b);
      const mid = Math.floor(edgeR.length / 2);
      bgR = edgeR[mid];
      bgG = edgeG[mid];
      bgB = edgeB[mid];
    }

    const inkPixels: { r: number; g: number; b: number; dist: number }[] = [];
    const rowInkCounts: number[] = new Array(sh).fill(0);

    for (let y = 1; y < sh - 1; y++) {
      for (let x = 1; x < sw - 1; x++) {
        const idx = (y * sw + x) * 4;
        const r = imgData[idx];
        const g = imgData[idx + 1];
        const b = imgData[idx + 2];
        const dist = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
        if (dist > 75) {
          inkPixels.push({ r, g, b, dist });
          rowInkCounts[y]++;
        }
      }
    }

    if (inkPixels.length === 0) {
      return {
        autoBgHex: rgbToHex(bgR, bgG, bgB),
        autoFgHex: "#22252a",
        pixelIsSerif: false,
      };
    }

    inkPixels.sort((a, b) => b.dist - a.dist);

    const topPixel = inkPixels[0];
    const colorSat =
      Math.max(topPixel.r, topPixel.g, topPixel.b) -
      Math.min(topPixel.r, topPixel.g, topPixel.b);

    const startRatio = colorSat > 35 ? 0.05 : 0.15;
    const endRatio = colorSat > 35 ? 0.30 : 0.42;
    const startIdx = Math.floor(inkPixels.length * startRatio);
    const endIdx = Math.max(startIdx + 1, Math.floor(inkPixels.length * endRatio));

    let sumR = 0,
      sumG = 0,
      sumB = 0;
    for (let i = startIdx; i < endIdx; i++) {
      sumR += inkPixels[i].r;
      sumG += inkPixels[i].g;
      sumB += inkPixels[i].b;
    }
    const count = Math.max(1, endIdx - startIdx);
    let fgR = sumR / count;
    let fgG = sumG / count;
    let fgB = sumB / count;

    // Keep standard dark-on-light text in a natural PDF ink range (#1c1e22 .. #32353b)
    const bgLum = (bgR + bgG + bgB) / 3;
    const fgLum = (fgR + fgG + fgB) / 3;
    if (bgLum > 200 && colorSat <= 30) {
      const clampedLum = Math.max(24, Math.min(48, fgLum));
      const delta = clampedLum - fgLum;
      fgR += delta;
      fgG += delta;
      fgB += delta;
    }

    const activeRows = rowInkCounts.filter((c) => c > Math.max(4, sw * 0.03));
    let pixelIsSerif = false;
    if (activeRows.length >= 5) {
      const midStart = Math.floor(activeRows.length * 0.3);
      const midEnd = Math.max(midStart + 1, activeRows.length - 2);
      const midSlice = activeRows.slice(midStart, midEnd);
      const midAvg =
        midSlice.reduce((acc, v) => acc + v, 0) / Math.max(1, midSlice.length);
      const basePeak = Math.max(...activeRows.slice(-3));
      if (basePeak / Math.max(1, midAvg) >= 1.48) {
        pixelIsSerif = true;
      }
    }

    return {
      autoBgHex: rgbToHex(bgR, bgG, bgB),
      autoFgHex: rgbToHex(fgR, fgG, fgB),
      pixelIsSerif,
    };
  } catch {
    return {
      autoBgHex: "#ffffff",
      autoFgHex: "#22252a",
      pixelIsSerif: false,
    };
  }
}

function resolveMaskHex(block: TextBlockItem): string {
  switch (block.maskBg) {
    case "transparent":
      return "transparent";
    case "auto":
      return block.autoBgHex || "#ffffff";
    case "white":
      return "#ffffff";
    case "cream":
      return "#fcfaf0";
    case "black":
      return "#0d0d12";
    case "custom":
      return block.customMaskHex || "#ffffff";
    default:
      return "#ffffff";
  }
}

export function isBlockModified(b: TextBlockItem): boolean {
  return (
    b.isNew ||
    b.currentText !== b.originalText ||
    b.fontSizePt !== b.origFontSizePt ||
    b.fontFamily !== b.origFontFamily ||
    b.color !== b.origColor ||
    b.isBold !== b.origIsBold ||
    b.isItalic !== b.origIsItalic ||
    Math.abs(b.xPercent - b.origXPercent) > 0.1 ||
    Math.abs(b.yPercent - b.origYPercent) > 0.1 ||
    Math.abs(b.widthPercent - b.origWidthPercent) > 0.1 ||
    Math.abs(b.heightPercent - b.origHeightPercent) > 0.1
  );
}

function wrapTextIntoLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidthPx: number,
  isMultiline?: boolean
): string[] {
  if (!isMultiline && !text.includes("\n")) {
    return [text];
  }
  const paragraphs = text.split("\n");
  const out: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(" ");
    let currentLine = "";
    for (const w of words) {
      const candidate = currentLine ? `${currentLine} ${w}` : w;
      if (currentLine && maxWidthPx > 20 && ctx.measureText(candidate).width > maxWidthPx * 1.03) {
        out.push(currentLine);
        currentLine = w;
      } else {
        currentLine = candidate;
      }
    }
    out.push(currentLine);
  }
  return out.length > 0 ? out : [text];
}

export default function EditPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pdfDocProxy, setPdfDocProxy] = useState<any>(null);

  const [selectionGranularity, setSelectionGranularity] =
    useState<SelectionGranularity>("line");

  const [textBlocks, setTextBlocks] = useState<TextBlockItem[]>([]);
  const [wordTokensByPage, setWordTokensByPage] = useState<
    Record<number, TextBlockItem[]>
  >({});
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const [marqueeRect, setMarqueeRect] = useState<{
    startX: number;
    startY: number;
    curX: number;
    curY: number;
  } | null>(null);

  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [caseSensitiveFind, setCaseSensitiveFind] = useState(false);

  const [historyPast, setHistoryPast] = useState<TextBlockItem[][]>([]);
  const [historyFuture, setHistoryFuture] = useState<TextBlockItem[][]>([]);

  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [previewCleanMode, setPreviewCleanMode] = useState<boolean>(false);
  const [pageBaseSizePt, setPageBaseSizePt] = useState<{ width: number; height: number }>({
    width: 595,
    height: 842,
  });
  const [containerCssWidth, setContainerCssWidth] = useState<number>(595);

  const [isRenderingPage, setIsRenderingPage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const docDefaultFontRef = useRef<PdfFontFamily>("serif");
  const extractedPagesRef = useRef<Set<number>>(new Set());

  const basePageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);

  const [interactionMode, setInteractionMode] = useState<
    "none" | "drag" | "resize" | "marquee"
  >("none");
  const interactionRef = useRef<{
    id: string;
    clientX: number;
    clientY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
    snapshotBeforeDrag: TextBlockItem[];
  } | null>(null);

  useEffect(() => {
    const el = pdfCanvasRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerCssWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [file, currentPage, zoomPercent]);

  const pushUndoSnapshot = useCallback((snapshot: TextBlockItem[]) => {
    setHistoryPast((prev) => [...prev.slice(-39), snapshot]);
    setHistoryFuture([]);
  }, []);

  const handleUndo = useCallback(() => {
    setHistoryPast((past) => {
      if (past.length === 0) return past;
      const previous = past[past.length - 1];
      setHistoryFuture((future) => [textBlocks, ...future.slice(0, 39)]);
      setTextBlocks(previous);
      return past.slice(0, -1);
    });
  }, [textBlocks]);

  const handleRedo = useCallback(() => {
    setHistoryFuture((future) => {
      if (future.length === 0) return future;
      const nextState = future[0];
      setHistoryPast((past) => [...past.slice(-39), textBlocks]);
      setTextBlocks(nextState);
      return future.slice(1);
    });
  }, [textBlocks]);

  /**
   * Builds blocks at the requested granularity ("word", "line", or "paragraph") from word tokens,
   * using the true untouched PDF `rawFontSizePt` so font size and weight never mutate!
   */
  const buildBlocksForGranularity = useCallback(
    (
      words: TextBlockItem[],
      granularity: SelectionGranularity,
      pageW: number,
      pageH: number
    ): TextBlockItem[] => {
      if (words.length === 0) return [];
      if (granularity === "word") {
        return words;
      }

      const listMarkerRegex = /^\s*(\d+[\.\)]|[a-zA-Z][\.\)]|[•●▪◦\-–—\*])\s*$/;
      const lines: TextBlockItem[] = [];

      for (const w of words) {
        const last = lines[lines.length - 1];
        const sameBaseline =
          last &&
          Math.abs(last.origBaselineYPercent - w.origBaselineYPercent) <
            ((Math.min(last.rawFontSizePt, w.rawFontSizePt) * 0.45) / pageH) * 100;
        const gapPct = last
          ? w.origXPercent - (last.origXPercent + last.origWidthPercent)
          : Infinity;
        const fontPctW = (Math.max(last?.rawFontSizePt || 10, w.rawFontSizePt) / pageW) * 100;
        const isLastListMarker = Boolean(last && listMarkerRegex.test(last.originalText));

        if (
          sameBaseline &&
          last &&
          !(isLastListMarker && gapPct > fontPctW * 0.2) &&
          gapPct >= -fontPctW * 0.4 &&
          gapPct < fontPctW * 1.8 &&
          Math.abs(last.rawFontSizePt - w.rawFontSizePt) <= 2.0 &&
          last.origIsBold === w.origIsBold
        ) {
          const newRight = Math.max(
            last.origXPercent + last.origWidthPercent,
            w.origXPercent + w.origWidthPercent
          );
          const newW = newRight - last.origXPercent;
          const combinedText = `${last.originalText} ${w.originalText}`;
          const calibratedPt = calibrateLineFontSizePt(
            combinedText,
            (newW / 100) * pageW,
            last.rawFontSizePt,
            last.origFontFamily,
            last.origIsBold,
            last.origIsItalic
          );

          last.originalText = combinedText;
          last.currentText = combinedText;
          last.origWidthPercent = newW;
          last.widthPercent = newW;
          last.origHeightPercent = Math.max(last.origHeightPercent, w.origHeightPercent);
          last.heightPercent = last.origHeightPercent;
          last.origFontSizePt = calibratedPt;
          last.fontSizePt = calibratedPt;
        } else {
          lines.push({ ...w, id: `line_${w.id}` });
        }
      }

      if (granularity === "line") {
        return lines;
      }

      const paragraphs: TextBlockItem[] = [];
      for (const ln of lines) {
        const lastP = paragraphs[paragraphs.length - 1];
        const lineHeightPct = (ln.rawFontSizePt / pageH) * 100;
        const verticalStepPct = lastP
          ? ln.origBaselineYPercent -
            (lastP.origYPercent + lastP.origHeightPercent - lineHeightPct * 0.25)
          : Infinity;
        const sameIndent = lastP && Math.abs(lastP.origXPercent - ln.origXPercent) < 3.5;
        const sameFont =
          lastP &&
          lastP.origFontFamily === ln.origFontFamily &&
          Math.abs(lastP.rawFontSizePt - ln.rawFontSizePt) <= 1.5 &&
          lastP.origIsBold === ln.origIsBold;

        if (
          lastP &&
          sameIndent &&
          sameFont &&
          verticalStepPct > 0 &&
          verticalStepPct < lineHeightPct * 1.85 &&
          !listMarkerRegex.test(ln.originalText)
        ) {
          const newRight = Math.max(
            lastP.origXPercent + lastP.origWidthPercent,
            ln.origXPercent + ln.origWidthPercent
          );
          const newBottom = Math.max(
            lastP.origYPercent + lastP.origHeightPercent,
            ln.origYPercent + ln.origHeightPercent
          );
          lastP.originalText = `${lastP.originalText}\n${ln.originalText}`;
          lastP.currentText = lastP.originalText;
          lastP.isMultiline = true;
          lastP.lineHeightPt = Math.round(ln.rawFontSizePt * 1.32 * 10) / 10;
          lastP.origWidthPercent = newRight - lastP.origXPercent;
          lastP.widthPercent = lastP.origWidthPercent;
          lastP.origHeightPercent = newBottom - lastP.origYPercent;
          lastP.heightPercent = lastP.origHeightPercent;
        } else {
          paragraphs.push({
            ...ln,
            id: `para_${ln.id}`,
            lineHeightPt: Math.round(ln.rawFontSizePt * 1.32 * 10) / 10,
          });
        }
      }

      return paragraphs;
    },
    []
  );

  const extractWordTokensFromPage = useCallback(
    async (
      pdf: any,
      pageNum: number,
      canvasCtx?: CanvasRenderingContext2D | null,
      canvasW?: number,
      canvasH?: number,
      renderScale: number = RENDER_SCALE
    ): Promise<TextBlockItem[]> => {
      const page = await pdf.getPage(pageNum);
      const baseViewport = page.getViewport({ scale: 1.0 });
      const pageW = baseViewport.width;
      const pageH = baseViewport.height;
      const vpTransform: number[] = baseViewport.transform || [1, 0, 0, -1, 0, pageH];

      const textContent = await page.getTextContent();
      const rawItems: any[] = textContent.items || [];
      const stylesDict: Record<string, any> = textContent.styles || {};

      interface WordFrag {
        text: string;
        x: number;
        yTop: number;
        baselineY: number;
        w: number;
        h: number;
        rawFontSize: number;
        fontFamily: PdfFontFamily;
        isBold: boolean;
        isItalic: boolean;
      }

      const wordFrags: WordFrag[] = [];

      for (const item of rawItems) {
        if (!item.str || !item.str.trim()) continue;

        const m = multiplyTransform(vpTransform, item.transform);
        const vx = m[4];
        const vBaselineY = m[5];
        const rawFontSize = Math.max(
          6.5,
          Math.round((Math.hypot(m[2], m[3]) || Math.hypot(m[0], m[1])) * 10) / 10
        );

        const itemW = item.width || item.str.length * (rawFontSize * 0.5);
        const itemH = Math.max(rawFontSize * 1.08, item.height || rawFontSize * 1.08);
        const yTop = vBaselineY - rawFontSize * 0.8;

        const styleObj = stylesDict[item.fontName] || {};
        let fObj: any = null;
        let realFontName = `${item.fontName || ""}`;
        try {
          const commonObjs = page.commonObjs || page._transport?.commonObjs;
          if (
            commonObjs &&
            typeof commonObjs.has === "function" &&
            commonObjs.has(item.fontName)
          ) {
            fObj = commonObjs.get(item.fontName);
            if (fObj?.name) realFontName += ` ${fObj.name}`;
          }
        } catch {
          // Ignore
        }

        const { fontFamily, isBold, isItalic } = classifyPdfFontMetadata(
          realFontName,
          styleObj.fontFamily || "",
          item.transform[2],
          rawFontSize,
          docDefaultFontRef.current,
          fObj
        );

        const rawStr: string = item.str;
        const tokenMatches = Array.from(rawStr.matchAll(/\S+/g));
        const totalChars = Math.max(1, rawStr.length);

        if (tokenMatches.length <= 1) {
          wordFrags.push({
            text: rawStr.trim(),
            x: vx,
            yTop,
            baselineY: vBaselineY,
            w: Math.max(itemW, rawFontSize * 0.45),
            h: itemH,
            rawFontSize,
            fontFamily,
            isBold,
            isItalic,
          });
        } else {
          for (const match of tokenMatches) {
            const wordStr = match[0];
            const startChar = match.index || 0;
            const wordX = vx + (startChar / totalChars) * itemW;
            const wordW = Math.max(
              rawFontSize * 0.4,
              (wordStr.length / totalChars) * itemW
            );
            wordFrags.push({
              text: wordStr,
              x: wordX,
              yTop,
              baselineY: vBaselineY,
              w: wordW,
              h: itemH,
              rawFontSize,
              fontFamily,
              isBold,
              isItalic,
            });
          }
        }
      }

      wordFrags.sort((a, b) => {
        if (Math.abs(a.yTop - b.yTop) > Math.min(a.rawFontSize, b.rawFontSize) * 0.42) {
          return a.yTop - b.yTop;
        }
        return a.x - b.x;
      });

      const cleanWords: WordFrag[] = [];
      for (const wf of wordFrags) {
        const prev = cleanWords[cleanWords.length - 1];
        const sameBase =
          prev &&
          Math.abs(prev.baselineY - wf.baselineY) <
            Math.min(prev.rawFontSize, wf.rawFontSize) * 0.4;
        const gap = prev ? wf.x - (prev.x + prev.w) : Infinity;
        if (
          sameBase &&
          prev &&
          gap >= -wf.rawFontSize * 0.35 &&
          gap <= wf.rawFontSize * 0.13 &&
          prev.isBold === wf.isBold
        ) {
          prev.text += wf.text;
          prev.w = Math.max(prev.w, wf.x + wf.w - prev.x);
          prev.h = Math.max(prev.h, wf.h);
        } else {
          cleanWords.push({ ...wf });
        }
      }

      return cleanWords.map((wd, idx) => {
        let autoBgHex = "#ffffff";
        let autoFgHex = "#22252a";
        let finalFontFamily: PdfFontFamily = wd.fontFamily;

        if (canvasCtx && canvasW && canvasH) {
          const sampled = sampleCanvasStyleForBox(
            canvasCtx,
            canvasW,
            canvasH,
            wd.x * renderScale,
            wd.yTop * renderScale,
            wd.w * renderScale,
            wd.h * renderScale
          );
          autoBgHex = sampled.autoBgHex;
          autoFgHex = sampled.autoFgHex;
          if (sampled.pixelIsSerif && finalFontFamily !== "mono") {
            finalFontFamily = "serif";
          }
        }

        const xPct = Math.max(0, Math.min(98, (wd.x / pageW) * 100));
        const yPct = Math.max(0, Math.min(98, (wd.yTop / pageH) * 100));
        const baseYPct = Math.max(0, Math.min(99, (wd.baselineY / pageH) * 100));
        const wPct = Math.max(0.8, Math.min(100 - xPct, ((wd.w + 1) / pageW) * 100));
        const hPct = Math.max(1.3, ((wd.h + 1.5) / pageH) * 100);

        return {
          id: `p${pageNum}_w_${idx}`,
          pageNumber: pageNum,
          originalText: wd.text,
          currentText: wd.text,
          isNew: false,
          rawFontSizePt: wd.rawFontSize,
          origXPercent: xPct,
          origYPercent: yPct,
          origBaselineYPercent: baseYPct,
          origWidthPercent: wPct,
          origHeightPercent: hPct,
          xPercent: xPct,
          yPercent: yPct,
          widthPercent: wPct,
          heightPercent: hPct,
          origFontSizePt: wd.rawFontSize,
          origFontFamily: finalFontFamily,
          origColor: autoFgHex,
          origIsBold: wd.isBold,
          origIsItalic: wd.isItalic,
          fontSizePt: wd.rawFontSize,
          fontFamily: finalFontFamily,
          color: autoFgHex,
          isBold: wd.isBold,
          isItalic: wd.isItalic,
          textAlign: "left",
          maskBg: "auto",
          autoBgHex,
          customMaskHex: autoBgHex,
        };
      });
    },
    []
  );

  useEffect(() => {
    const pageWords = wordTokensByPage[currentPage];
    if (!pageWords || pageWords.length === 0) return;

    setTextBlocks((prev) => {
      const otherPages = prev.filter((b) => b.pageNumber !== currentPage);
      const modifiedOnCurrent = prev.filter(
        (b) => b.pageNumber === currentPage && isBlockModified(b)
      );

      const uncoveredWords = pageWords.filter((w) => {
        const wxCenter = w.origXPercent + w.origWidthPercent / 2;
        const wyCenter = w.origYPercent + w.origHeightPercent / 2;
        return !modifiedOnCurrent.some(
          (m) =>
            wxCenter >= m.origXPercent - 0.4 &&
            wxCenter <= m.origXPercent + m.origWidthPercent + 0.4 &&
            wyCenter >= m.origYPercent - 0.4 &&
            wyCenter <= m.origYPercent + m.origHeightPercent + 0.4
        );
      });

      const rebuilt = buildBlocksForGranularity(
        uncoveredWords,
        selectionGranularity,
        pageBaseSizePt.width,
        pageBaseSizePt.height
      );
      return [...otherPages, ...modifiedOnCurrent, ...rebuilt];
    });
  }, [
    selectionGranularity,
    currentPage,
    wordTokensByPage,
    pageBaseSizePt.width,
    pageBaseSizePt.height,
    buildBlocksForGranularity,
  ]);

  const handleFileSelected = async (files: File[]) => {
    const selected = files[0];
    if (!selected) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setFile(selected);
    setCurrentPage(1);
    setTextBlocks([]);
    setWordTokensByPage({});
    setHistoryPast([]);
    setHistoryFuture([]);
    setSelectedBlockId(null);
    extractedPagesRef.current = new Set();

    try {
      const pdfjs = await loadPdfJs();
      const buffer = await selected.arrayBuffer();
      docDefaultFontRef.current = detectDocumentDefaultFontFromBytes(buffer);

      const pdf = await pdfjs.getDocument({ data: buffer }).promise;
      setPdfDocProxy(pdf);
      setTotalPages(pdf.numPages);

      if (pdf.numPages > 1) {
        (async () => {
          for (let p = 2; p <= Math.min(pdf.numPages, 40); p++) {
            if (extractedPagesRef.current.has(p)) continue;
            extractedPagesRef.current.add(p);
            try {
              const pg = await pdf.getPage(p);
              const vp = pg.getViewport({ scale: 1.0 });
              const pWords = await extractWordTokensFromPage(pdf, p);
              const pLines = buildBlocksForGranularity(
                pWords,
                selectionGranularity,
                vp.width,
                vp.height
              );
              setWordTokensByPage((old) => ({ ...old, [p]: pWords }));
              setTextBlocks((prev) => {
                if (prev.some((b) => b.pageNumber === p)) return prev;
                return [...prev, ...pLines];
              });
            } catch {
              // Ignore single-page error
            }
          }
        })();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load PDF document.";
      setErrorMessage(msg);
      setFile(null);
    }
  };

  const repaintVisibleCanvas = useCallback(() => {
    const visibleCanvas = pdfCanvasRef.current;
    const baseCanvas = basePageCanvasRef.current;
    if (!visibleCanvas || !baseCanvas) return;

    const ctx = visibleCanvas.getContext("2d");
    if (!ctx) return;

    const cw = baseCanvas.width;
    const ch = baseCanvas.height;
    if (visibleCanvas.width !== cw || visibleCanvas.height !== ch) {
      visibleCanvas.width = cw;
      visibleCanvas.height = ch;
    }

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(baseCanvas, 0, 0);

    const pageBlocks = textBlocks.filter((b) => b.pageNumber === currentPage);
    for (const block of pageBlocks) {
      const modified = isBlockModified(block);
      const isSelected = !previewCleanMode && selectedBlockId === block.id;
      if (!modified && !isSelected) continue;

      const maskHex = resolveMaskHex(block);

      if (!block.isNew && maskHex !== "transparent") {
        const ox = (block.origXPercent / 100) * cw;
        const oy = (block.origYPercent / 100) * ch;
        const ow = (block.origWidthPercent / 100) * cw;
        const oh = (block.origHeightPercent / 100) * ch;
        ctx.fillStyle = maskHex;
        ctx.fillRect(Math.max(0, ox - 1), Math.max(0, oy - 1), ow + 2, oh + 2);
      }

      const bx = (block.xPercent / 100) * cw;
      const by = (block.yPercent / 100) * ch;
      const bw = (block.widthPercent / 100) * cw;
      const bh = (block.heightPercent / 100) * ch;

      if (block.isWhiteoutOnly) {
        ctx.fillStyle = maskHex === "transparent" ? "#ffffff" : maskHex;
        ctx.fillRect(bx, by, bw, bh);
        continue;
      }

      if (modified && !isSelected && block.currentText.trim()) {
        const fontPx = Math.max(6.5, block.fontSizePt) * RENDER_SCALE;
        const fontPrefix = `${block.isItalic ? "italic " : ""}${block.isBold ? "bold " : ""}`;
        ctx.font = `${fontPrefix}${fontPx}px ${FONT_CSS_MAP[block.fontFamily]}`;

        const wrappedLines = wrapTextIntoLines(
          ctx,
          block.currentText,
          bw,
          block.isMultiline
        );
        const lineStepPx = (block.lineHeightPt || block.fontSizePt * 1.3) * RENDER_SCALE;
        const maxLineW = Math.max(
          bw,
          ...wrappedLines.map((l) => ctx.measureText(l).width + 4)
        );
        const totalH =
          wrappedLines.length > 1
            ? (wrappedLines.length - 1) * lineStepPx + fontPx * 1.15
            : Math.max(bh, fontPx * 1.08);

        if (maskHex !== "transparent") {
          ctx.fillStyle = maskHex;
          ctx.fillRect(Math.max(0, bx - 1), Math.max(0, by - 0.5), maxLineW + 2, totalH + 1);
        }

        const isRTL = /[\u0600-\u06FF]/.test(block.currentText);
        ctx.direction = isRTL ? "rtl" : "ltr";
        ctx.fillStyle = block.color;
        ctx.textBaseline = "alphabetic";

        const movedVertically = Math.abs(block.yPercent - block.origYPercent) > 0.1;
        const firstBaselineY = movedVertically
          ? by + fontPx * 0.8
          : (block.origBaselineYPercent / 100) * ch;

        wrappedLines.forEach((lineText, idx) => {
          const lineBaseY = firstBaselineY + idx * lineStepPx;
          if (isRTL || block.textAlign === "right") {
            ctx.textAlign = "right";
            ctx.fillText(lineText, bx + maxLineW - 2, lineBaseY);
          } else if (block.textAlign === "center") {
            ctx.textAlign = "center";
            ctx.fillText(lineText, bx + maxLineW / 2, lineBaseY);
          } else {
            ctx.textAlign = "left";
            ctx.fillText(lineText, bx, lineBaseY);
          }
        });
      }
    }
  }, [textBlocks, currentPage, selectedBlockId, previewCleanMode]);

  const renderAndExtractPage = useCallback(
    async (pageNum: number) => {
      if (!pdfDocProxy || !pdfCanvasRef.current) return;

      setIsRenderingPage(true);
      try {
        const page = await pdfDocProxy.getPage(pageNum);
        const baseViewport = page.getViewport({ scale: 1.0 });
        setPageBaseSizePt({
          width: baseViewport.width,
          height: baseViewport.height,
        });

        const viewport = page.getViewport({ scale: RENDER_SCALE });
        const offscreen = document.createElement("canvas");
        offscreen.width = Math.ceil(viewport.width);
        offscreen.height = Math.ceil(viewport.height);
        const offCtx = offscreen.getContext("2d");
        if (!offCtx) return;

        await page.render({ canvasContext: offCtx, viewport }).promise;
        basePageCanvasRef.current = offscreen;

        if (pdfCanvasRef.current) {
          pdfCanvasRef.current.width = offscreen.width;
          pdfCanvasRef.current.height = offscreen.height;
          const vCtx = pdfCanvasRef.current.getContext("2d");
          vCtx?.drawImage(offscreen, 0, 0);
          if (pdfCanvasRef.current.clientWidth > 0) {
            setContainerCssWidth(pdfCanvasRef.current.clientWidth);
          }
        }

        const pageWords = await extractWordTokensFromPage(
          pdfDocProxy,
          pageNum,
          offCtx,
          offscreen.width,
          offscreen.height,
          RENDER_SCALE
        );
        extractedPagesRef.current.add(pageNum);
        setWordTokensByPage((old) => ({ ...old, [pageNum]: pageWords }));

        const builtBlocks = buildBlocksForGranularity(
          pageWords,
          selectionGranularity,
          baseViewport.width,
          baseViewport.height
        );

        setTextBlocks((old) => {
          const modifiedOnPage = old.filter(
            (b) => b.pageNumber === pageNum && isBlockModified(b)
          );
          if (modifiedOnPage.length > 0) {
            return old;
          }
          return [...old.filter((b) => b.pageNumber !== pageNum), ...builtBlocks];
        });
      } catch (err) {
        console.error("Failed to render/extract PDF page:", err);
      } finally {
        setIsRenderingPage(false);
      }
    },
    [pdfDocProxy, extractWordTokensFromPage, buildBlocksForGranularity, selectionGranularity]
  );

  useEffect(() => {
    if (pdfDocProxy) {
      renderAndExtractPage(currentPage);
    }
  }, [pdfDocProxy, currentPage, renderAndExtractPage]);

  useEffect(() => {
    if (!isRenderingPage && basePageCanvasRef.current) {
      repaintVisibleCanvas();
    }
  }, [isRenderingPage, repaintVisibleCanvas]);

  const handleSelectBlock = useCallback((block: TextBlockItem | null) => {
    if (!block) {
      setSelectedBlockId(null);
      return;
    }
    setSelectedBlockId(block.id);
    if (!block.isWhiteoutOnly && block.currentText) {
      setFindQuery(block.currentText);
      setReplaceQuery(block.currentText);
    }
  }, []);

  /**
   * Moves the active cursor to the previous or next line on the page (like Up/Down arrows in Microsoft Word).
   */
  const handleNavigateLine = useCallback(
    (direction: "up" | "down") => {
      if (!selectedBlockId) return;
      const pageBlocks = textBlocks
        .filter((b) => b.pageNumber === currentPage && !b.isWhiteoutOnly)
        .sort((a, b) => a.yPercent - b.yPercent || a.xPercent - b.xPercent);
      const idx = pageBlocks.findIndex((b) => b.id === selectedBlockId);
      if (idx === -1) return;
      const targetIdx = direction === "down" ? idx + 1 : idx - 1;
      if (targetIdx >= 0 && targetIdx < pageBlocks.length) {
        handleSelectBlock(pageBlocks[targetIdx]);
      }
    },
    [selectedBlockId, textBlocks, currentPage, handleSelectBlock]
  );

  const handleViewportPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (previewCleanMode || !pdfCanvasRef.current) return;
    if (e.button !== 0) return;

    const rect = pdfCanvasRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    if (xPct < 0 || xPct > 100 || yPct < 0 || yPct > 100) return;

    setInteractionMode("marquee");
    setMarqueeRect({ startX: xPct, startY: yPct, curX: xPct, curY: yPct });
  };

  useEffect(() => {
    if (interactionMode !== "marquee") return;

    const handleMove = (e: PointerEvent) => {
      if (!pdfCanvasRef.current) return;
      const rect = pdfCanvasRef.current.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const curX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const curY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      setMarqueeRect((prev) => (prev ? { ...prev, curX, curY } : null));
    };

    const handleUp = () => {
      setInteractionMode("none");
      setMarqueeRect((rect) => {
        if (!rect) return null;
        const minX = Math.min(rect.startX, rect.curX);
        const maxX = Math.max(rect.startX, rect.curX);
        const minY = Math.min(rect.startY, rect.curY);
        const maxY = Math.max(rect.startY, rect.curY);

        if (maxX - minX < 1.2 && maxY - minY < 1.0) {
          handleSelectBlock(null);
          return null;
        }

        const pageWords = wordTokensByPage[currentPage] || [];
        const selectedWords = pageWords.filter((w) => {
          const cx = w.origXPercent + w.origWidthPercent / 2;
          const cy = w.origYPercent + w.origHeightPercent / 2;
          return cx >= minX && cx <= maxX && cy >= minY && cy <= maxY;
        });

        if (selectedWords.length === 0) {
          return null;
        }

        const sorted = [...selectedWords].sort((a, b) => {
          if (Math.abs(a.origBaselineYPercent - b.origBaselineYPercent) > 0.8) {
            return a.origBaselineYPercent - b.origBaselineYPercent;
          }
          return a.origXPercent - b.origXPercent;
        });

        const lineTexts: string[] = [];
        let curLineWords: TextBlockItem[] = [];
        for (const sw of sorted) {
          const prevW = curLineWords[curLineWords.length - 1];
          if (prevW && Math.abs(prevW.origBaselineYPercent - sw.origBaselineYPercent) > 0.8) {
            lineTexts.push(curLineWords.map((x) => x.originalText).join(" "));
            curLineWords = [sw];
          } else {
            curLineWords.push(sw);
          }
        }
        if (curLineWords.length > 0) {
          lineTexts.push(curLineWords.map((x) => x.originalText).join(" "));
        }

        const combinedText = lineTexts.join("\n");
        const firstWord = sorted[0];
        const boxLeft = Math.min(...sorted.map((w) => w.origXPercent));
        const boxTop = Math.min(...sorted.map((w) => w.origYPercent));
        const boxRight = Math.max(...sorted.map((w) => w.origXPercent + w.origWidthPercent));
        const boxBottom = Math.max(...sorted.map((w) => w.origYPercent + w.origHeightPercent));
        const boxW = Math.max(2, boxRight - boxLeft);
        const boxH = Math.max(1.4, boxBottom - boxTop);

        const calibratedPt = calibrateLineFontSizePt(
          lineTexts[0],
          (boxW / 100) * pageBaseSizePt.width,
          firstWord.rawFontSizePt,
          firstWord.origFontFamily,
          firstWord.origIsBold,
          firstWord.origIsItalic
        );

        const customId = `custom_sel_${Date.now()}`;
        const customBlock: TextBlockItem = {
          ...firstWord,
          id: customId,
          originalText: combinedText,
          currentText: combinedText,
          isMultiline: lineTexts.length > 1,
          lineHeightPt: Math.round(firstWord.rawFontSizePt * 1.32 * 10) / 10,
          origFontSizePt: calibratedPt,
          fontSizePt: calibratedPt,
          origXPercent: boxLeft,
          origYPercent: boxTop,
          origBaselineYPercent: firstWord.origBaselineYPercent,
          origWidthPercent: boxW,
          origHeightPercent: boxH,
          xPercent: boxLeft,
          yPercent: boxTop,
          widthPercent: boxW,
          heightPercent: boxH,
        };

        setTextBlocks((prev) => [...prev, customBlock]);
        handleSelectBlock(customBlock);
        return null;
      });
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [interactionMode, currentPage, wordTokensByPage, pageBaseSizePt.width, handleSelectBlock]);

  const handleUpdateBlock = useCallback(
    (id: string, patch: Partial<TextBlockItem>, recordHistory: boolean = true) => {
      setTextBlocks((prev) => {
        if (recordHistory) {
          pushUndoSnapshot(prev);
        }
        return prev.map((b) => (b.id === id ? { ...b, ...patch } : b));
      });
    },
    [pushUndoSnapshot]
  );

  const handleAddFreeText = () => {
    pushUndoSnapshot(textBlocks);
    const newId = `new_txt_${Date.now()}`;
    const newBlock: TextBlockItem = {
      id: newId,
      pageNumber: currentPage,
      originalText: "",
      currentText: "New Text",
      isNew: true,
      rawFontSizePt: 11,
      origXPercent: 25,
      origYPercent: 25,
      origBaselineYPercent: 26.8,
      origWidthPercent: 28,
      origHeightPercent: 3.5,
      xPercent: 25,
      yPercent: 25,
      widthPercent: 28,
      heightPercent: 3.5,
      origFontSizePt: 11,
      origFontFamily: docDefaultFontRef.current,
      origColor: "#22252a",
      origIsBold: false,
      origIsItalic: false,
      fontSizePt: 11,
      fontFamily: docDefaultFontRef.current,
      color: "#22252a",
      isBold: false,
      isItalic: false,
      textAlign: "left",
      maskBg: "transparent",
      autoBgHex: "#ffffff",
      customMaskHex: "#ffffff",
    };
    setTextBlocks((prev) => [...prev, newBlock]);
    handleSelectBlock(newBlock);
    setPreviewCleanMode(false);
  };

  const handleAddWhiteoutBox = () => {
    pushUndoSnapshot(textBlocks);
    const newId = `whiteout_${Date.now()}`;
    const newBlock: TextBlockItem = {
      id: newId,
      pageNumber: currentPage,
      originalText: "__WHITEOUT__",
      currentText: "",
      isNew: true,
      isWhiteoutOnly: true,
      rawFontSizePt: 11,
      origXPercent: 30,
      origYPercent: 35,
      origBaselineYPercent: 37,
      origWidthPercent: 28,
      origHeightPercent: 4.5,
      xPercent: 30,
      yPercent: 35,
      widthPercent: 28,
      heightPercent: 4.5,
      origFontSizePt: 11,
      origFontFamily: docDefaultFontRef.current,
      origColor: "#22252a",
      origIsBold: false,
      origIsItalic: false,
      fontSizePt: 11,
      fontFamily: docDefaultFontRef.current,
      color: "#22252a",
      isBold: false,
      isItalic: false,
      textAlign: "left",
      maskBg: "white",
      autoBgHex: "#ffffff",
      customMaskHex: "#ffffff",
    };
    setTextBlocks((prev) => [...prev, newBlock]);
    handleSelectBlock(newBlock);
    setPreviewCleanMode(false);
  };

  const handleDeleteOrClearBlock = useCallback(
    (block: TextBlockItem) => {
      pushUndoSnapshot(textBlocks);
      if (block.isNew) {
        setTextBlocks((prev) => prev.filter((b) => b.id !== block.id));
      } else {
        setTextBlocks((prev) =>
          prev.map((b) => (b.id === block.id ? { ...b, currentText: "" } : b))
        );
      }
      handleSelectBlock(null);
    },
    [pushUndoSnapshot, textBlocks, handleSelectBlock]
  );

  const handleRestoreOriginalBlock = (id: string) => {
    pushUndoSnapshot(textBlocks);
    setTextBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        return {
          ...b,
          currentText: b.originalText,
          fontSizePt: b.origFontSizePt,
          fontFamily: b.origFontFamily,
          color: b.origColor,
          isBold: b.origIsBold,
          isItalic: b.origIsItalic,
          xPercent: b.origXPercent,
          yPercent: b.origYPercent,
          widthPercent: b.origWidthPercent,
          heightPercent: b.origHeightPercent,
        };
      })
    );
  };

  const matchingBlocks = findQuery.trim()
    ? textBlocks.filter((b) => {
        if (b.isWhiteoutOnly || !b.currentText) return false;
        return caseSensitiveFind
          ? b.currentText.includes(findQuery)
          : b.currentText.toLowerCase().includes(findQuery.toLowerCase());
      })
    : [];

  const handleReplaceMatches = (scope: "page" | "all") => {
    if (!findQuery.trim()) return;
    const escaped = findQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, caseSensitiveFind ? "g" : "gi");

    let replacedCount = 0;
    pushUndoSnapshot(textBlocks);
    setTextBlocks((prev) =>
      prev.map((b) => {
        if (b.isWhiteoutOnly || !b.currentText) return b;
        if (scope === "page" && b.pageNumber !== currentPage) return b;
        if (!regex.test(b.currentText)) return b;
        replacedCount++;
        return {
          ...b,
          currentText: b.currentText.replace(regex, replaceQuery),
        };
      })
    );

    if (replacedCount > 0) {
      handleSelectBlock(null);
      setSuccessMessage(
        `Replaced ${replacedCount} occurrence(s) of "${findQuery}" with "${replaceQuery}" (${
          scope === "all" ? "entire PDF" : `Page ${currentPage}`
        }).`
      );
    }
  };

  useEffect(() => {
    if (!file) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isTypingInInput = activeTag === "input" || activeTag === "textarea";

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        if (!isTypingInInput) {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        if (!isTypingInInput) {
          e.preventDefault();
          handleRedo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setShowFindReplace((v) => !v);
      } else if (e.key === "Escape") {
        handleSelectBlock(null);
      } else if (
        (e.key === "Delete" || e.key === "Backspace") &&
        !isTypingInInput &&
        selectedBlockId
      ) {
        const blk = textBlocks.find((b) => b.id === selectedBlockId);
        if (blk) {
          e.preventDefault();
          handleDeleteOrClearBlock(blk);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [file, selectedBlockId, textBlocks, handleUndo, handleRedo, handleDeleteOrClearBlock, handleSelectBlock]);

  const handleStartInteraction = (
    block: TextBlockItem,
    mode: "drag" | "resize",
    e: React.PointerEvent
  ) => {
    e.stopPropagation();
    e.preventDefault();
    handleSelectBlock(block);
    setInteractionMode(mode);
    interactionRef.current = {
      id: block.id,
      clientX: e.clientX,
      clientY: e.clientY,
      origX: block.xPercent,
      origY: block.yPercent,
      origW: block.widthPercent,
      origH: block.heightPercent,
      snapshotBeforeDrag: textBlocks,
    };
  };

  useEffect(() => {
    if (interactionMode !== "drag" && interactionMode !== "resize") return;

    const handleMove = (e: PointerEvent) => {
      if (!interactionRef.current || !pdfCanvasRef.current) return;
      const rect = pdfCanvasRef.current.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const dx = ((e.clientX - interactionRef.current.clientX) / rect.width) * 100;
      const dy = ((e.clientY - interactionRef.current.clientY) / rect.height) * 100;
      const targetId = interactionRef.current.id;

      if (interactionMode === "drag") {
        const newX = Math.max(0, Math.min(96, interactionRef.current.origX + dx));
        const newY = Math.max(0, Math.min(96, interactionRef.current.origY + dy));
        setTextBlocks((prev) =>
          prev.map((b) => (b.id === targetId ? { ...b, xPercent: newX, yPercent: newY } : b))
        );
      } else if (interactionMode === "resize") {
        const newW = Math.max(
          2,
          Math.min(100 - interactionRef.current.origX, interactionRef.current.origW + dx)
        );
        const newH = Math.max(
          1.2,
          Math.min(100 - interactionRef.current.origY, interactionRef.current.origH + dy)
        );
        setTextBlocks((prev) =>
          prev.map((b) => (b.id === targetId ? { ...b, widthPercent: newW, heightPercent: newH } : b))
        );
      }
    };

    const handleUp = () => {
      if (interactionRef.current) {
        pushUndoSnapshot(interactionRef.current.snapshotBeforeDrag);
      }
      setInteractionMode("none");
      interactionRef.current = null;
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [interactionMode, pushUndoSnapshot]);

  const renderReplacementTextToPng = (
    block: TextBlockItem,
    boxWidthPt: number,
    boxHeightPt: number
  ): { bytes: Uint8Array; widthPt: number; heightPt: number } => {
    const SCALE = 3;
    const measureCanvas = document.createElement("canvas");
    const mCtx = measureCanvas.getContext("2d")!;
    const fontPx = Math.max(6.5, block.fontSizePt) * SCALE;
    const fontStylePrefix = `${block.isItalic ? "italic " : ""}${block.isBold ? "bold " : ""}`;
    const fontSpec = `${fontStylePrefix}${fontPx}px ${FONT_CSS_MAP[block.fontFamily]}`;
    mCtx.font = fontSpec;

    const wrappedLines = wrapTextIntoLines(
      mCtx,
      block.currentText,
      boxWidthPt * SCALE,
      block.isMultiline
    );
    const lineStepPx = (block.lineHeightPt || block.fontSizePt * 1.3) * SCALE;
    const measuredW = Math.max(
      ...wrappedLines.map((l) => mCtx.measureText(l).width + 4 * SCALE)
    );
    const finalW = Math.max(boxWidthPt * SCALE, measuredW);
    const finalH =
      wrappedLines.length > 1
        ? (wrappedLines.length - 1) * lineStepPx + fontPx * 1.18
        : Math.max(boxHeightPt * SCALE, fontPx * 1.12);

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(finalW));
    canvas.height = Math.max(1, Math.ceil(finalH));
    const ctx = canvas.getContext("2d")!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const isRTL = /[\u0600-\u06FF]/.test(block.currentText);
    ctx.direction = isRTL ? "rtl" : "ltr";
    ctx.font = fontSpec;
    ctx.fillStyle = block.color;
    ctx.textBaseline = "alphabetic";

    const firstBaselineY = fontPx * 0.8;

    wrappedLines.forEach((lineText, idx) => {
      const baselineY = firstBaselineY + idx * lineStepPx;
      if (isRTL || block.textAlign === "right") {
        ctx.textAlign = "right";
        ctx.fillText(lineText, canvas.width - 2 * SCALE, baselineY);
      } else if (block.textAlign === "center") {
        ctx.textAlign = "center";
        ctx.fillText(lineText, canvas.width / 2, baselineY);
      } else {
        ctx.textAlign = "left";
        ctx.fillText(lineText, 0, baselineY);
      }
    });

    const dataUrl = canvas.toDataURL("image/png");
    return {
      bytes: dataUrlToUint8Array(dataUrl),
      widthPt: canvas.width / SCALE,
      heightPt: canvas.height / SCALE,
    };
  };

  const modifiedBlocks = textBlocks.filter(isBlockModified);

  const handleSaveEditedPdf = async () => {
    if (!file) return;
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setSelectedBlockId(null);

    try {
      let workingBlocks = [...textBlocks];
      if (findQuery.trim() && workingBlocks.filter(isBlockModified).length === 0) {
        const escaped = findQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, caseSensitiveFind ? "g" : "gi");
        workingBlocks = workingBlocks.map((b) =>
          !b.isWhiteoutOnly && regex.test(b.currentText)
            ? { ...b, currentText: b.currentText.replace(regex, replaceQuery) }
            : b
        );
        setTextBlocks(workingBlocks);
      }

      const blocksToApply = workingBlocks.filter(isBlockModified);
      const arrayBuffer = await file.arrayBuffer();

      try {
        const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const pages = pdfDoc.getPages();

        for (const block of blocksToApply) {
          const pageIdx = block.pageNumber - 1;
          if (pageIdx < 0 || pageIdx >= pages.length) continue;
          const page = pages[pageIdx];
          const { width: pageW, height: pageH } = page.getSize();
          const maskHex = resolveMaskHex(block);

          if (!block.isNew && maskHex !== "transparent") {
            const origW = (block.origWidthPercent / 100) * pageW;
            const origH = (block.origHeightPercent / 100) * pageH;
            const origX = (block.origXPercent / 100) * pageW;
            const origY = pageH - (block.origYPercent / 100) * pageH - origH;
            const { r, g, b } = hexToRgbComponents(maskHex);

            page.drawRectangle({
              x: Math.max(0, origX - 1),
              y: Math.max(0, origY - 1),
              width: origW + 2,
              height: origH + 2,
              color: rgb(r, g, b),
            });
          }

          const curW = (block.widthPercent / 100) * pageW;
          const curH = (block.heightPercent / 100) * pageH;
          const curX = (block.xPercent / 100) * pageW;
          const curTopPt = (block.yPercent / 100) * pageH;

          if (block.isWhiteoutOnly) {
            const fillHex = maskHex === "transparent" ? "#ffffff" : maskHex;
            const { r, g, b } = hexToRgbComponents(fillHex);
            page.drawRectangle({
              x: Math.max(0, curX),
              y: Math.max(0, pageH - curTopPt - curH),
              width: curW,
              height: curH,
              color: rgb(r, g, b),
            });
          } else if (block.currentText.trim()) {
            const rendered = renderReplacementTextToPng(block, curW, curH);
            const drawY = pageH - curTopPt - rendered.heightPt;

            if (maskHex !== "transparent") {
              const { r, g, b } = hexToRgbComponents(maskHex);
              page.drawRectangle({
                x: Math.max(0, curX - 1),
                y: Math.max(0, drawY - 0.5),
                width: rendered.widthPt + 2,
                height: rendered.heightPt + 1,
                color: rgb(r, g, b),
              });
            }

            const pngImg = await pdfDoc.embedPng(rendered.bytes);
            page.drawImage(pngImg, {
              x: curX,
              y: drawY,
              width: rendered.widthPt,
              height: rendered.heightPt,
            });
          }
        }

        const savedBytes = await pdfDoc.save({ useObjectStreams: true });
        const outName = `edited_${file.name}`;
        downloadBlob(savedBytes, outName);
        setSuccessMessage(`Saved ${blocksToApply.length} text edit(s) into "${outName}".`);
      } catch {
        const fallbackDoc = await PDFDocument.create();
        for (let p = 1; p <= totalPages; p++) {
          const pdfPage = await pdfDocProxy.getPage(p);
          const baseVp = pdfPage.getViewport({ scale: 1.0 });
          const hiVp = pdfPage.getViewport({ scale: 2.0 });
          const cnv = document.createElement("canvas");
          cnv.width = Math.ceil(hiVp.width);
          cnv.height = Math.ceil(hiVp.height);
          const ctx = cnv.getContext("2d")!;
          await pdfPage.render({ canvasContext: ctx, viewport: hiVp }).promise;

          const pBlocks = workingBlocks.filter((b) => b.pageNumber === p && isBlockModified(b));
          for (const b of pBlocks) {
            const mHex = resolveMaskHex(b);
            if (!b.isNew && mHex !== "transparent") {
              ctx.fillStyle = mHex;
              ctx.fillRect(
                (b.origXPercent / 100) * cnv.width - 1.5,
                (b.origYPercent / 100) * cnv.height - 1,
                (b.origWidthPercent / 100) * cnv.width + 3,
                (b.origHeightPercent / 100) * cnv.height + 2
              );
            }
            if (!b.isWhiteoutOnly && b.currentText.trim()) {
              const fPx = b.fontSizePt * 2.0;
              ctx.font = `${b.isItalic ? "italic " : ""}${b.isBold ? "bold " : ""}${fPx}px ${
                FONT_CSS_MAP[b.fontFamily]
              }`;
              ctx.fillStyle = b.color;
              ctx.textBaseline = "alphabetic";
              const movedV = Math.abs(b.yPercent - b.origYPercent) > 0.1;
              const baseLine = movedV
                ? (b.yPercent / 100) * cnv.height + fPx * 0.8
                : (b.origBaselineYPercent / 100) * cnv.height;
              const wrapped = wrapTextIntoLines(
                ctx,
                b.currentText,
                (b.widthPercent / 100) * cnv.width,
                b.isMultiline
              );
              const stepPx = (b.lineHeightPt || b.fontSizePt * 1.3) * 2.0;
              wrapped.forEach((lnText, idx) => {
                ctx.fillText(lnText, (b.xPercent / 100) * cnv.width, baseLine + idx * stepPx);
              });
            }
          }

          const pngBytes = dataUrlToUint8Array(cnv.toDataURL("image/png"));
          const embedded = await fallbackDoc.embedPng(pngBytes);
          const newPage = fallbackDoc.addPage([baseVp.width, baseVp.height]);
          newPage.drawImage(embedded, {
            x: 0,
            y: 0,
            width: baseVp.width,
            height: baseVp.height,
          });
        }
        const fallbackBytes = await fallbackDoc.save();
        const outName = `edited_${file.name}`;
        downloadBlob(fallbackBytes, outName);
        setSuccessMessage(`Saved ${blocksToApply.length} text edit(s) into "${outName}".`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save edited PDF.";
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const currentPageBlocks = textBlocks.filter((b) => b.pageNumber === currentPage);
  const selectedBlock = textBlocks.find((b) => b.id === selectedBlockId) || null;
  const displayScale =
    pageBaseSizePt.width > 0 ? containerCssWidth / pageBaseSizePt.width : 1.15;

  return (
    <ToolLayout
      title="Edit PDF Text Online"
      description="Click any word, line, or paragraph in your PDF to edit it directly in-place just like a Microsoft Word document—preserving exact original font family, size, weight, and ink color."
      faqs={[
        {
          question: "How does it preserve the exact original font style and size?",
          answer:
            "When your PDF loads, our engine reads the embedded PDF font table and locks each line's exact point size, weight (Regular vs Bold), and style (Serif, Calibri, Sans, or Monospace). When you click to edit, your typed text inherits those exact locked settings.",
        },
        {
          question: "Can I edit just a single word, a line, or a full paragraph?",
          answer:
            "Yes! Use the 'Word | Line | Paragraph' selector in the top ribbon—or simply drag your mouse across any exact words on the page—to edit as much or as little text as you want.",
        },
        {
          question: "Can I use Up and Down arrow keys like in Microsoft Word?",
          answer:
            "Yes. While editing a line on the page, press the Up or Down arrow keys (or Enter) to move seamlessly between lines.",
        },
      ]}
    >
      <div className="space-y-6">
        {!file && (
          <FileDropzone
            accept="application/pdf,.pdf"
            multiple={false}
            onFilesSelected={handleFileSelected}
            title="Drop a PDF document to edit existing text"
            description="Click anywhere on your PDF page to edit text directly in-place like a Word document with locked original font size and style."
          />
        )}

        {file && (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-5 dark:border-slate-800 dark:bg-slate-900/60">
            {/* Row 1: Document Bar + Granularity + Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-400">
                  <FileEdit className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate max-w-[180px] sm:max-w-xs">
                    {file.name}
                  </h2>
                  <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    Page {currentPage} of {totalPages}
                    {modifiedBlocks.length > 0 && (
                      <span className="ml-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                        • {modifiedBlocks.length} edited
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {/* Selection Mode: Word | Line | Paragraph */}
                <div
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-0.5 text-xs dark:border-slate-800 dark:bg-slate-900"
                  title="Choose click granularity (or drag across any custom words)"
                >
                  <span className="hidden xl:inline-flex items-center gap-1 px-2 text-[11px] font-semibold text-slate-400">
                    <MousePointerClick className="h-3.5 w-3.5 text-blue-600" />
                    <span>Mode:</span>
                  </span>
                  {(
                    [
                      { id: "word", label: "Word" },
                      { id: "line", label: "Line" },
                      { id: "paragraph", label: "Paragraph" },
                    ] as const
                  ).map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => {
                        setSelectionGranularity(mode.id);
                        handleSelectBlock(null);
                      }}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                        selectionGranularity === mode.id
                          ? "bg-blue-600 text-white shadow-2xs"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>

                {/* Undo / Redo */}
                <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-0.5">
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={historyPast.length === 0}
                    title="Undo (Ctrl+Z)"
                    className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 disabled:opacity-30"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRedo}
                    disabled={historyFuture.length === 0}
                    title="Redo (Ctrl+Y)"
                    className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 disabled:opacity-30"
                  >
                    <Redo2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowFindReplace((v) => !v)}
                  className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    showFindReplace
                      ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  }`}
                >
                  <Search className="h-3.5 w-3.5 text-blue-600" />
                  <span>Find & Replace</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddFreeText}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5 text-blue-600" />
                  <span>+ Text</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddWhiteoutBox}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                >
                  <Eraser className="h-3.5 w-3.5 text-blue-600" />
                  <span>+ Whiteout</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPreviewCleanMode((v) => !v);
                    handleSelectBlock(null);
                  }}
                  className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    previewCleanMode
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  }`}
                >
                  {previewCleanMode ? (
                    <EyeOff className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">Preview</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveEditedPdf}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm disabled:opacity-50 transition-all"
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  <span>
                    Save PDF{modifiedBlocks.length > 0 ? ` (${modifiedBlocks.length})` : ""}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setTextBlocks([]);
                    setWordTokensByPage({});
                    handleSelectBlock(null);
                  }}
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-1.5 text-slate-500 hover:bg-slate-50"
                  title="Close PDF"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Row 2: Constant-Height Microsoft Word Style Formatting Ribbon (Never jumps the page!) */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <Type className="h-3.5 w-3.5 text-blue-600" />
                  <span>Font:</span>
                </span>

                {/* Font Family */}
                <select
                  disabled={!selectedBlock || Boolean(selectedBlock.isWhiteoutOnly)}
                  value={selectedBlock ? selectedBlock.fontFamily : docDefaultFontRef.current}
                  onChange={(e) =>
                    selectedBlock &&
                    handleUpdateBlock(selectedBlock.id, {
                      fontFamily: e.target.value as PdfFontFamily,
                    })
                  }
                  aria-label="Font Family"
                  className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="serif">Times New Roman / Serif</option>
                  <option value="calibri">Calibri (Word Body)</option>
                  <option value="sans">Arial / Helvetica</option>
                  <option value="mono">Courier New (Mono)</option>
                </select>

                {/* Font Size */}
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.5"
                    min={6}
                    max={72}
                    disabled={!selectedBlock || Boolean(selectedBlock.isWhiteoutOnly)}
                    value={selectedBlock ? selectedBlock.fontSizePt : 11}
                    onChange={(e) =>
                      selectedBlock &&
                      handleUpdateBlock(selectedBlock.id, {
                        fontSizePt: Math.max(6, Math.min(72, Number(e.target.value) || 11)),
                      })
                    }
                    title="Font Size (pt)"
                    className="w-14 rounded border border-slate-200 bg-slate-50 px-1.5 py-1 font-mono text-xs text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <span className="text-[11px] text-slate-400">pt</span>
                </div>

                {/* Bold & Italic */}
                <div className="inline-flex items-center rounded border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 overflow-hidden">
                  <button
                    type="button"
                    disabled={!selectedBlock || Boolean(selectedBlock.isWhiteoutOnly)}
                    onClick={() =>
                      selectedBlock &&
                      handleUpdateBlock(selectedBlock.id, { isBold: !selectedBlock.isBold })
                    }
                    title="Bold"
                    className={`px-2 py-1 font-bold disabled:opacity-40 ${
                      selectedBlock?.isBold
                        ? "bg-blue-600 text-white"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-200/60"
                    }`}
                  >
                    <Bold className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={!selectedBlock || Boolean(selectedBlock.isWhiteoutOnly)}
                    onClick={() =>
                      selectedBlock &&
                      handleUpdateBlock(selectedBlock.id, { isItalic: !selectedBlock.isItalic })
                    }
                    title="Italic"
                    className={`px-2 py-1 border-l border-slate-200 dark:border-slate-700 disabled:opacity-40 ${
                      selectedBlock?.isItalic
                        ? "bg-blue-600 text-white"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-200/60"
                    }`}
                  >
                    <Italic className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Text Alignment */}
                <div className="hidden sm:inline-flex items-center rounded border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 overflow-hidden">
                  {(
                    [
                      { id: "left", icon: AlignLeft, label: "Align Left" },
                      { id: "center", icon: AlignCenter, label: "Align Center" },
                      { id: "right", icon: AlignRight, label: "Align Right" },
                    ] as const
                  ).map((al) => {
                    const Icon = al.icon;
                    return (
                      <button
                        key={al.id}
                        type="button"
                        disabled={!selectedBlock || Boolean(selectedBlock.isWhiteoutOnly)}
                        onClick={() =>
                          selectedBlock &&
                          handleUpdateBlock(selectedBlock.id, { textAlign: al.id })
                        }
                        title={al.label}
                        className={`px-1.5 py-1 disabled:opacity-40 ${
                          selectedBlock?.textAlign === al.id
                            ? "bg-blue-600 text-white"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-200/60"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </button>
                    );
                  })}
                </div>

                {/* Ink Color */}
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-[11px]">Color:</span>
                  <input
                    type="color"
                    disabled={!selectedBlock || Boolean(selectedBlock.isWhiteoutOnly)}
                    value={selectedBlock ? selectedBlock.color : "#22252a"}
                    onChange={(e) =>
                      selectedBlock &&
                      handleUpdateBlock(selectedBlock.id, { color: e.target.value })
                    }
                    title="Text Ink Color (Auto-matched to original PDF text)"
                    className="h-5 w-6 cursor-pointer rounded border border-slate-300 bg-white p-0 disabled:opacity-40"
                  />
                </div>

                {/* Mask Mode */}
                {selectedBlock && (
                  <div className="flex items-center gap-1 border-l border-slate-200 pl-2 dark:border-slate-700">
                    <span className="text-slate-400 text-[11px]">Paper:</span>
                    {(
                      [
                        { id: "auto", label: "Auto" },
                        { id: "white", label: "White" },
                        { id: "black", label: "Redact" },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleUpdateBlock(selectedBlock.id, { maskBg: m.id })}
                        className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                          selectedBlock.maskBg === m.id
                            ? "border-blue-600 bg-blue-50 text-blue-700 font-bold"
                            : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Restore / Blank Out when a block is selected */}
                {selectedBlock && (
                  <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2 dark:border-slate-700">
                    {!selectedBlock.isNew && isBlockModified(selectedBlock) && (
                      <button
                        type="button"
                        onClick={() => handleRestoreOriginalBlock(selectedBlock.id)}
                        className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Reset</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteOrClearBlock(selectedBlock)}
                      className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600 hover:bg-red-100"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>{selectedBlock.isNew ? "Delete" : "Erase"}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Right Side of Ribbon: Zoom & Page Navigation */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-0.5 dark:border-slate-800 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setZoomPercent((z) => Math.max(75, z - 25))}
                    disabled={zoomPercent <= 75}
                    title="Zoom Out"
                    className="p-0.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 dark:text-slate-300"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <span className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200 min-w-[38px] text-center">
                    {zoomPercent}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomPercent((z) => Math.min(200, z + 25))}
                    disabled={zoomPercent >= 200}
                    title="Zoom In"
                    className="p-0.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 dark:text-slate-300"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => currentPage > 1 && setCurrentPage((p) => p - 1)}
                    disabled={currentPage <= 1 || isRenderingPage}
                    className="rounded border border-slate-200 p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="font-mono text-[11px] text-slate-900 dark:text-white font-bold px-1">
                    {currentPage}/{totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => currentPage < totalPages && setCurrentPage((p) => p + 1)}
                    disabled={currentPage >= totalPages || isRenderingPage}
                    className="rounded border border-slate-200 p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Optional Collapsible Find & Replace Bar */}
            {showFindReplace && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-xs shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                    <Replace className="h-3.5 w-3.5 text-blue-600" />
                    <span>Find & Replace:</span>
                  </span>

                  <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 flex-1 min-w-[160px] dark:border-slate-700 dark:bg-slate-800">
                    <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={findQuery}
                      onChange={(e) => setFindQuery(e.target.value)}
                      placeholder="Find text..."
                      className="w-full bg-transparent text-xs text-slate-900 dark:text-white outline-none"
                    />
                    {findQuery && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-blue-700 shrink-0">
                        {matchingBlocks.length}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 flex-1 min-w-[160px] dark:border-slate-700 dark:bg-slate-800">
                    <Replace className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={replaceQuery}
                      onChange={(e) => setReplaceQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && matchingBlocks.length > 0) {
                          handleReplaceMatches("all");
                        }
                      }}
                      placeholder="Replace with..."
                      className="w-full bg-transparent text-xs text-slate-900 dark:text-white outline-none"
                    />
                  </div>

                  <label className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 cursor-pointer select-none px-1">
                    <input
                      type="checkbox"
                      checked={caseSensitiveFind}
                      onChange={(e) => setCaseSensitiveFind(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600"
                    />
                    <span>Match case</span>
                  </label>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={matchingBlocks.length === 0}
                    onClick={() => handleReplaceMatches("page")}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                  >
                    Replace Page
                  </button>
                  <button
                    type="button"
                    disabled={matchingBlocks.length === 0}
                    onClick={() => handleReplaceMatches("all")}
                    className="rounded-lg bg-blue-600 px-3 py-1 font-bold text-white hover:bg-blue-500 disabled:opacity-40"
                  >
                    Replace All
                  </button>
                </div>
              </div>
            )}

            {/* Scanned / Image-Only PDF Detection Banner */}
            {!isRenderingPage && currentPageBlocks.filter((b) => !b.isNew).length === 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-2.5 text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <ScanText className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Scanned image PDF detected on Page {currentPage}.</strong> Use{" "}
                    <strong>+ Whiteout</strong> and <strong>+ Text</strong> above, or run OCR first.
                  </span>
                </div>
                <Link
                  href="/tools/ocr-pdf"
                  className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1 font-bold text-white hover:bg-amber-500 shrink-0"
                >
                  <span>Open OCR Tool →</span>
                </Link>
              </div>
            )}

            {/* Word-Document Style Page Canvas */}
            <div
              onPointerDown={handleViewportPointerDown}
              className="relative block overflow-auto rounded-2xl border border-slate-200 bg-slate-200/70 p-4 sm:p-6 max-h-[82vh] cursor-text dark:border-slate-800 dark:bg-slate-950"
            >
              {isRenderingPage && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/60 dark:bg-slate-950/60 backdrop-blur-2xs">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              )}

              <div
                ref={pageContainerRef}
                style={{
                  width: `${Math.round(pageBaseSizePt.width * 1.35 * (zoomPercent / 100))}px`,
                  maxWidth: zoomPercent > 100 ? "none" : "100%",
                }}
                className="relative mx-auto block h-fit select-none shadow-2xl border border-slate-300/80 bg-white leading-none antialiased"
              >
                <canvas ref={pdfCanvasRef} className="block w-full h-auto" />

                {/* Live Drag-Select Marquee Rectangle */}
                {marqueeRect &&
                  (Math.abs(marqueeRect.curX - marqueeRect.startX) > 1.2 ||
                    Math.abs(marqueeRect.curY - marqueeRect.startY) > 1.0) && (
                    <div
                      style={{
                        left: `${Math.min(marqueeRect.startX, marqueeRect.curX)}%`,
                        top: `${Math.min(marqueeRect.startY, marqueeRect.curY)}%`,
                        width: `${Math.abs(marqueeRect.curX - marqueeRect.startX)}%`,
                        height: `${Math.abs(marqueeRect.curY - marqueeRect.startY)}%`,
                      }}
                      className="pointer-events-none absolute z-40 border border-blue-600 bg-blue-500/15"
                    />
                  )}

                {currentPageBlocks.map((block) => {
                  const isSelected = !previewCleanMode && selectedBlockId === block.id;
                  const isModified = isBlockModified(block);
                  const isFindHit =
                    findQuery.trim().length > 0 &&
                    !block.isWhiteoutOnly &&
                    (caseSensitiveFind
                      ? block.currentText.includes(findQuery)
                      : block.currentText.toLowerCase().includes(findQuery.toLowerCase()));

                  if (previewCleanMode) {
                    return null;
                  }

                  const maskHex = resolveMaskHex(block);
                  const scaledFontPx = Math.max(8, block.fontSizePt * displayScale);
                  const scaledLineHeightPx =
                    (block.lineHeightPt || block.fontSizePt * 1.3) * displayScale;

                  return (
                    <div
                      key={block.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectBlock(block);
                      }}
                      onPointerDown={(e) => {
                        if (block.isWhiteoutOnly || isSelected) {
                          e.stopPropagation();
                          if (block.isWhiteoutOnly) {
                            handleStartInteraction(block, "drag", e);
                          }
                        }
                      }}
                      style={{
                        left: `${block.xPercent}%`,
                        top: `${block.yPercent}%`,
                        minWidth: `${block.widthPercent}%`,
                        minHeight: `${block.heightPercent}%`,
                        backgroundColor: isSelected
                          ? maskHex === "transparent"
                            ? "#ffffff"
                            : maskHex
                          : "transparent",
                        justifyContent:
                          block.textAlign === "center"
                            ? "center"
                            : block.textAlign === "right"
                              ? "flex-end"
                              : "flex-start",
                      }}
                      className={`group absolute flex items-start rounded-[1px] transition-colors ${
                        isSelected
                          ? "z-30 ring-1 ring-blue-500/60"
                          : isFindHit
                            ? "z-25 bg-amber-300/35 ring-1 ring-amber-500"
                            : "z-10 hover:bg-blue-500/[0.06] cursor-text"
                      }`}
                    >
                      {/* Unobtrusive left drag handle & corner resize handle only when selected */}
                      {isSelected && (
                        <>
                          <button
                            type="button"
                            onPointerDown={(e) => handleStartInteraction(block, "drag", e)}
                            title="Drag to move"
                            className="absolute -left-4 top-0 z-40 flex h-4 w-3.5 items-center justify-center rounded-l bg-blue-600 text-white opacity-75 hover:opacity-100 cursor-move"
                          >
                            <Move className="h-2.5 w-2.5" />
                          </button>

                          <div
                            onPointerDown={(e) => handleStartInteraction(block, "resize", e)}
                            title="Resize"
                            className="absolute -bottom-1 -right-1 z-40 h-2.5 w-2.5 border border-white bg-blue-600 cursor-nwse-resize"
                          />
                        </>
                      )}

                      {block.isWhiteoutOnly ? (
                        <div className="w-full h-full min-h-[14px] cursor-move" />
                      ) : isSelected && block.isMultiline ? (
                        <textarea
                          autoFocus
                          rows={Math.max(2, block.currentText.split("\n").length)}
                          value={block.currentText}
                          onChange={(e) => {
                            handleUpdateBlock(block.id, { currentText: e.target.value });
                          }}
                          style={{
                            color: block.color,
                            fontFamily: FONT_CSS_MAP[block.fontFamily],
                            fontWeight: block.isBold ? 700 : 400,
                            fontStyle: block.isItalic ? "italic" : "normal",
                            fontSize: `${scaledFontPx}px`,
                            lineHeight: `${scaledLineHeightPx}px`,
                            textAlign: block.textAlign,
                          }}
                          className="w-full min-w-full bg-transparent outline-none p-0 m-0 resize-none antialiased selection:bg-blue-500/20"
                        />
                      ) : isSelected ? (
                        /* Seamless Word-like inline input that expands naturally as you type */
                        <div className="inline-grid w-full items-center">
                          <span
                            aria-hidden="true"
                            style={{
                              fontFamily: FONT_CSS_MAP[block.fontFamily],
                              fontWeight: block.isBold ? 700 : 400,
                              fontStyle: block.isItalic ? "italic" : "normal",
                              fontSize: `${scaledFontPx}px`,
                            }}
                            className="invisible col-start-1 row-start-1 whitespace-pre pr-2 pointer-events-none select-none leading-none"
                          >
                            {block.currentText || " "}
                          </span>
                          <input
                            type="text"
                            autoFocus
                            value={block.currentText}
                            onChange={(e) => {
                              handleUpdateBlock(block.id, { currentText: e.target.value });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleNavigateLine("down");
                              } else if (e.key === "ArrowDown") {
                                e.preventDefault();
                                handleNavigateLine("down");
                              } else if (e.key === "ArrowUp") {
                                e.preventDefault();
                                handleNavigateLine("up");
                              }
                            }}
                            style={{
                              color: block.color,
                              fontFamily: FONT_CSS_MAP[block.fontFamily],
                              fontWeight: block.isBold ? 700 : 400,
                              fontStyle: block.isItalic ? "italic" : "normal",
                              fontSize: `${scaledFontPx}px`,
                              textAlign: block.textAlign,
                            }}
                            className="col-start-1 row-start-1 w-full min-w-full bg-transparent outline-none leading-none p-0 m-0 antialiased selection:bg-blue-500/20"
                          />
                        </div>
                      ) : isModified ? (
                        /* Invisible sizer keeps the hit-box matching the edited text width with zero visible border clutter */
                        <span
                          aria-hidden="true"
                          style={{
                            fontFamily: FONT_CSS_MAP[block.fontFamily],
                            fontWeight: block.isBold ? 700 : 400,
                            fontStyle: block.isItalic ? "italic" : "normal",
                            fontSize: `${scaledFontPx}px`,
                          }}
                          className="invisible whitespace-pre pr-1 pointer-events-none select-none leading-none"
                        >
                          {block.currentText.split("\n")[0] || " "}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
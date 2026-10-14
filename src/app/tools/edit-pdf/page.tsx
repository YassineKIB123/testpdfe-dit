"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileDropzone } from "@/components/tools/FileDropzone";
import { downloadBlob, loadPdfJs } from "@/lib/pdf/pdf-utils";
import { PDFDocument } from "pdf-lib";
import {
  Type,
  Link as LinkIcon,
  CheckSquare,
  Image as ImageIcon,
  PenTool,
  Eraser,
  Highlighter,
  Shapes,
  Undo2,
  Redo2,
  Palette,
  Move,
  Copy,
  Trash2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Search,
  Replace,
  Check,
  X,
  Loader2,
  Download,
  Square,
  Circle,
  Minus,
  ArrowRight,
} from "lucide-react";

// ============================================================================
// MODULE 1: TYPES & FONT / TEXT-LAYER ENGINE
// ============================================================================

export type SejdaToolMode =
  | "text"
  | "links"
  | "forms"
  | "images"
  | "sign"
  | "whiteout"
  | "annotate"
  | "shapes";

export type FormSubTool = "check" | "cross" | "dot" | "textfield";
export type AnnotateSubTool = "highlight" | "strike" | "underline" | "freehand";
export type ShapeSubTool = "rect" | "ellipse" | "line" | "arrow";

export type EditorFontId =
  | "serif"
  | "cambria"
  | "times"
  | "calibri"
  | "arial"
  | "mono";

export const EDITOR_FONTS: { id: EditorFontId; label: string; css: string }[] = [
  {
    id: "serif",
    label: "Computer Modern / Serif",
    css: '"Computer Modern Serif", "Latin Modern Roman", Georgia, "Times New Roman", serif',
  },
  {
    id: "cambria",
    label: "Cambria / Caladea",
    css: 'Cambria, Caladea, Georgia, "Times New Roman", serif',
  },
  {
    id: "times",
    label: "Times New Roman",
    css: '"Times New Roman", Times, Tinos, Georgia, serif',
  },
  {
    id: "calibri",
    label: "Calibri / Carlito",
    css: 'Calibri, Carlito, "Segoe UI", Candara, Arial, sans-serif',
  },
  {
    id: "arial",
    label: "Arial / Helvetica",
    css: 'Arial, Helvetica, "Liberation Sans", Arimo, sans-serif',
  },
  {
    id: "mono",
    label: "Courier / Monospace",
    css: '"Computer Modern Typewriter", "Courier New", Courier, Consolas, monospace',
  },
];

export function getFontCss(fontId: EditorFontId): string {
  return EDITOR_FONTS.find((f) => f.id === fontId)?.css || EDITOR_FONTS[0].css;
}

export interface LiveTextLine {
  id: string;
  pageNumber: number;
  originalText: string;
  text: string;
  isNew: boolean;
  // Position & bounds in PDF points (scale 1.0)
  origXPt: number;
  origYPt: number;
  origBaselineYPt: number;
  origWidthPt: number;
  origHeightPt: number;
  xPt: number;
  yPt: number;
  widthPt: number;
  heightPt: number;
  // Locked PDF typography
  fontSizePt: number;
  fontId: EditorFontId;
  color: string;
  isBold: boolean;
  isItalic: boolean;
  linkUrl?: string;
  bgHex: string;
}

export interface OverlayItem {
  id: string;
  pageNumber: number;
  kind:
    | "whiteout"
    | "highlight"
    | "strike"
    | "underline"
    | "link"
    | "rect"
    | "ellipse"
    | "line"
    | "arrow"
    | "check"
    | "cross"
    | "dot"
    | "textfield"
    | "image"
    | "signature"
    | "freehand";
  xPt: number;
  yPt: number;
  wPt: number;
  hPt: number;
  color: string;
  fillColor?: string;
  strokeWidthPt?: number;
  text?: string;
  linkUrl?: string;
  dataUrl?: string;
  points?: { x: number; y: number }[];
}

interface EditorSnapshot {
  lines: LiveTextLine[];
  overlays: OverlayItem[];
}

const BG_RENDER_SCALE = 2.0;

const PRESET_COLORS = [
  "#000000",
  "#1e293b",
  "#dc2626",
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#7c3aed",
  "#ffffff",
];

function multiplyMatrix(m1: number[], m2: number[]): number[] {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    "#" +
    [c(r), c(g), c(b)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const parts = dataUrl.split(",");
  const base64 = parts.length > 1 ? parts[1] : parts[0];
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

function detectDefaultFontFromPdfBuffer(buffer: ArrayBuffer): EditorFontId {
  try {
    const slice = buffer.slice(0, Math.min(buffer.byteLength, 2 * 1024 * 1024));
    const ascii = new TextDecoder("latin1").decode(slice);
    const matches = ascii.match(/\/BaseFont\s*\/([^\s\/\[\]<>()]+)/g) || [];
    let cmScore = 0;
    let cambriaScore = 0;
    let timesScore = 0;
    let calibriScore = 0;
    let arialScore = 0;

    for (const raw of matches) {
      const name = raw.toLowerCase();
      if (/cmr|cmbx|cmti|cmsl|cmcsc|sfrm|sfbx|sfti|lmroman/.test(name)) {
        cmScore += 2;
      } else if (/cambria|caladea|georgia|palatino|garamond|charter/.test(name)) {
        cambriaScore += 2;
      } else if (/times|nimbusrom|termes/.test(name)) {
        timesScore += 2;
      } else if (/calibri|carlito|aptos|candara|segoe/.test(name)) {
        calibriScore += 2;
      } else if (/arial|helvetica|inter|roboto|verdana|tahoma|sans/.test(name)) {
        arialScore += 1;
      }
    }

    const maxScore = Math.max(cmScore, cambriaScore, timesScore, calibriScore, arialScore);
    if (maxScore === 0) return "cambria";
    if (cambriaScore === maxScore) return "cambria";
    if (cmScore === maxScore) return "serif";
    if (timesScore === maxScore) return "times";
    if (calibriScore === maxScore) return "calibri";
    return "arial";
  } catch {
    return "cambria";
  }
}

function classifyFontItem(
  rawFontName: string,
  styleFamily: string,
  shear: number,
  fontSize: number,
  defaultFontId: EditorFontId,
  fObj?: any
): { fontId: EditorFontId; isBold: boolean; isItalic: boolean } {
  const cleaned = rawFontName
    .replace(/\b[A-Z]{6}\+/g, "")
    .replace(/\bg_d\d+_f\d+\b/gi, "")
    .toLowerCase();
  const lowerStyle = styleFamily.toLowerCase();

  let fontId: EditorFontId = defaultFontId;
  if (
    Boolean(fObj?.isMonospace) ||
    /mono|courier|consolas|menlo|typewriter|cmtt|sftt|lmmono/.test(cleaned) ||
    lowerStyle === "monospace"
  ) {
    fontId = "mono";
  } else if (/cmr|cmbx|cmti|cmsl|sfrm|sfbx|sfti|lmroman/.test(cleaned)) {
    fontId = "serif";
  } else if (/cambria|caladea|georgia|palatino|garamond/.test(cleaned)) {
    fontId = "cambria";
  } else if (/times|nimbusrom|termes/.test(cleaned)) {
    fontId = "times";
  } else if (/calibri|carlito|aptos|candara|segoe/.test(cleaned)) {
    fontId = "calibri";
  } else if (/arial|helvetica|inter|roboto|verdana|tahoma|cmss|sfss|lmsans/.test(cleaned)) {
    fontId = "arial";
  } else if (lowerStyle === "serif" && (defaultFontId === "calibri" || defaultFontId === "arial")) {
    fontId = "cambria";
  }

  const isBold =
    /(?:^|[-_\s])(bold|black|heavy|demi|semibold|extrabold)|-bd\b|cmbx|sfbx|lmroman.*bold|nimbusrom.*(bold|medi)/i.test(
      cleaned
    );

  const isItalic =
    Boolean(fObj?.italic) ||
    /italic|oblique|slanted|-it\b|cmti|sfti|cmsl|sfsl|cmmi|lmroman.*italic/.test(cleaned) ||
    Math.abs(shear) > 0.08 * fontSize;

  return { fontId, isBold, isItalic };
}

/**
 * Samples the rendered PDF canvas at `box` to extract:
 * - Paper background color (`bgHex`)
 * - True ink color (`fgHex`, e.g. `#000000` or colored heading ink)
 * - Horizontal stem thickness (`isThinRegular`, `isThickBold`)
 */
function sampleBoxFromFullCanvas(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  xPx: number,
  yPx: number,
  wPx: number,
  hPx: number,
  fontPx: number
): { bgHex: string; fgHex: string; isThinRegular: boolean; isThickBold: boolean } {
  try {
    const sx = Math.max(0, Math.floor(xPx - 2));
    const sy = Math.max(0, Math.floor(yPx - 2));
    const sw = Math.min(cw - sx, Math.ceil(wPx + 4));
    const sh = Math.min(ch - sy, Math.ceil(hPx + 4));
    if (sw <= 3 || sh <= 3) {
      return { bgHex: "#ffffff", fgHex: "#000000", isThinRegular: true, isThickBold: false };
    }

    const data = ctx.getImageData(sx, sy, sw, sh).data;
    const edgeR: number[] = [];
    const edgeG: number[] = [];
    const edgeB: number[] = [];

    for (let x = 0; x < sw; x += 2) {
      for (const y of [0, sh - 1]) {
        const idx = (y * sw + x) * 4;
        edgeR.push(data[idx]);
        edgeG.push(data[idx + 1]);
        edgeB.push(data[idx + 2]);
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

    const ink: { r: number; g: number; b: number; dist: number }[] = [];
    const runs: number[] = [];

    for (let y = 1; y < sh - 1; y++) {
      let run = 0;
      for (let x = 1; x < sw - 1; x++) {
        const idx = (y * sw + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const dist = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
        if (dist > 80) {
          ink.push({ r, g, b, dist });
        }
        if (dist > 110) {
          run++;
        } else if (run > 0) {
          runs.push(run);
          run = 0;
        }
      }
      if (run > 0) runs.push(run);
    }

    if (ink.length === 0) {
      return {
        bgHex: rgbToHex(bgR, bgG, bgB),
        fgHex: "#000000",
        isThinRegular: true,
        isThickBold: false,
      };
    }

    let meanRun = 1.6;
    let medianRun = 1.0;
    if (runs.length >= 4) {
      runs.sort((a, b) => a - b);
      meanRun = runs.reduce((a, b) => a + b, 0) / runs.length;
      medianRun = runs[Math.floor(runs.length * 0.5)];
    }

    const isThinRegular = medianRun <= 1.5 && meanRun < Math.max(2.2, fontPx * 0.118);
    const isThickBold = medianRun >= 2.0 && meanRun >= Math.max(2.5, fontPx * 0.135);

    ink.sort((a, b) => b.dist - a.dist);
    const top = ink[0];
    const sat = Math.max(top.r, top.g, top.b) - Math.min(top.r, top.g, top.b);

    if (sat <= 30 && (top.r + top.g + top.b) / 3 < 75) {
      return {
        bgHex: rgbToHex(bgR, bgG, bgB),
        fgHex: "#000000",
        isThinRegular,
        isThickBold,
      };
    }

    const count = Math.max(1, Math.floor(ink.length * 0.25));
    let sr = 0,
      sg = 0,
      sb = 0;
    for (let i = 0; i < count; i++) {
      sr += ink[i].r;
      sg += ink[i].g;
      sb += ink[i].b;
    }
    return {
      bgHex: rgbToHex(bgR, bgG, bgB),
      fgHex: rgbToHex(sr / count, sg / count, sb / count),
      isThinRegular,
      isThickBold,
    };
  } catch {
    return { bgHex: "#ffffff", fgHex: "#000000", isThinRegular: true, isThickBold: false };
  }
}

export default function EditPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDocProxy, setPdfDocProxy] = useState<any>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Active Sejda Tool & Subtools
  const [activeTool, setActiveTool] = useState<SejdaToolMode>("text");
  const [formSubTool, setFormSubTool] = useState<FormSubTool>("check");
  const [annotateSubTool, setAnnotateSubTool] = useState<AnnotateSubTool>("highlight");
  const [shapeSubTool, setShapeSubTool] = useState<ShapeSubTool>("rect");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Live Full-Page Text Lines & Overlays (All Pages)
  const [lines, setLines] = useState<LiveTextLine[]>([]);
  const [overlays, setOverlays] = useState<OverlayItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Undo / Redo History
  const [historyPast, setHistoryPast] = useState<EditorSnapshot[]>([]);
  const [historyFuture, setHistoryFuture] = useState<EditorSnapshot[]>([]);

  // Find & Replace Drawer
  const [showFindReplace, setShowFindReplace] = useState<boolean>(false);
  const [findText, setFindText] = useState<string>("");
  const [replaceText, setReplaceText] = useState<string>("");
  const [matchCase, setMatchCase] = useState<boolean>(false);

  // Signature Creation Modal
  const [showSignModal, setShowSignModal] = useState<boolean>(false);
  const [signMode, setSignMode] = useState<"draw" | "type">("draw");
  const [typedSignature, setTypedSignature] = useState<string>("");
  const [signColor, setSignColor] = useState<string>("#0f172a");
  const signPadCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingSignRef = useRef<boolean>(false);

  // Page Geometry & Zoom
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [pageSizePt, setPageSizePt] = useState<{ width: number; height: number }>({
    width: 595.28,
    height: 841.89,
  });
  const [isRenderingPage, setIsRenderingPage] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [readyDownloadBlob, setReadyDownloadBlob] = useState<{
    bytes: Uint8Array;
    name: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs for clean background canvases per page
  const cleanBgCanvasByPageRef = useRef<Record<number, HTMLCanvasElement>>({});
  const extractedPagesRef = useRef<Set<number>>(new Set());
  const defaultFontIdRef = useRef<EditorFontId>("cambria");
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pageWrapperRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // Drag / Draw interaction state
  const [dragState, setDragState] = useState<{
    kind: "move-line" | "move-overlay" | "resize-overlay" | "draw-box" | "freehand";
    targetId?: string;
    startClientX: number;
    startClientY: number;
    startXPt: number;
    startYPt: number;
    startWPt: number;
    startHPt: number;
    curXPt: number;
    curYPt: number;
    points?: { x: number; y: number }[];
    snapshotBefore: EditorSnapshot;
  } | null>(null);

  // Load Computer Modern & Google Fonts (Caladea/Carlito/Arimo/Dancing Script) for 1:1 matching
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!document.getElementById("sejda-editor-fonts")) {
      const link1 = document.createElement("link");
      link1.id = "sejda-editor-fonts";
      link1.rel = "stylesheet";
      link1.href =
        "https://cdn.jsdelivr.net/gh/dreampulse/computer-modern-web-font@master/fonts.css";
      document.head.appendChild(link1);

      const link2 = document.createElement("link");
      link2.rel = "stylesheet";
      link2.href =
        "https://fonts.googleapis.com/css2?family=Arimo:ital,wght@0,400;0,700;1,400;1,700&family=Caladea:ital,wght@0,400;0,700;1,400;1,700&family=Carlito:ital,wght@0,400;0,700;1,400;1,700&family=Dancing+Script:wght@700&family=Tinos:ital,wght@0,400;0,700;1,400;1,700&display=swap";
      document.head.appendChild(link2);
    }
  }, []);

  const pushHistory = useCallback(
    (snap?: EditorSnapshot) => {
      const entry = snap || { lines, overlays };
      setHistoryPast((prev) => [...prev.slice(-39), entry]);
      setHistoryFuture([]);
      setReadyDownloadBlob(null);
    },
    [lines, overlays]
  );

  const handleUndo = useCallback(() => {
    setHistoryPast((past) => {
      if (past.length === 0) return past;
      const last = past[past.length - 1];
      setHistoryFuture((f) => [{ lines, overlays }, ...f.slice(0, 39)]);
      setLines(last.lines);
      setOverlays(last.overlays);
      setReadyDownloadBlob(null);
      return past.slice(0, -1);
    });
  }, [lines, overlays]);

  const handleRedo = useCallback(() => {
    setHistoryFuture((future) => {
      if (future.length === 0) return future;
      const next = future[0];
      setHistoryPast((p) => [...p.slice(-39), { lines, overlays }]);
      setLines(next.lines);
      setOverlays(next.overlays);
      setReadyDownloadBlob(null);
      return future.slice(1);
    });
  }, [lines, overlays]);

  /**
   * Renders a PDF page into TWO offscreen canvases:
   * 1) `fullCanvas`: Full PDF render (used to sample true ink colors & stem thicknesses)
   * 2) `cleanBgCanvas`: Text-free background render (`fillText` & `strokeText` suppressed + residual glyph scrubber)
   *    so that 100% of text on the page can be rendered as live Sejda DOM text lines with zero double-vision!
   */
  const extractAndRenderPage = useCallback(
    async (pdf: any, pageNum: number) => {
      const page = await pdf.getPage(pageNum);
      const baseVp = page.getViewport({ scale: 1.0 });
      const pageW = baseVp.width;
      const pageH = baseVp.height;
      const vpTransform: number[] = baseVp.transform || [1, 0, 0, -1, 0, pageH];

      const renderVp = page.getViewport({ scale: BG_RENDER_SCALE });
      const cw = Math.ceil(renderVp.width);
      const ch = Math.ceil(renderVp.height);

      // 1. Render full page (for accurate color/stroke sampling)
      const fullCanvas = document.createElement("canvas");
      fullCanvas.width = cw;
      fullCanvas.height = ch;
      const fullCtx = fullCanvas.getContext("2d")!;
      await page.render({ canvasContext: fullCtx, viewport: renderVp }).promise;

      // 2. Render text-free background canvas (suppressing fillText and strokeText)
      const cleanCanvas = document.createElement("canvas");
      cleanCanvas.width = cw;
      cleanCanvas.height = ch;
      const cleanCtx = cleanCanvas.getContext("2d")!;
      cleanCtx.fillText = () => {};
      cleanCtx.strokeText = () => {};
      await page.render({ canvasContext: cleanCtx, viewport: renderVp }).promise;

      // 3. Extract text items & merge into Sejda-style horizontal text lines
      const textContent = await page.getTextContent();
      const rawItems: any[] = textContent.items || [];
      const stylesDict: Record<string, any> = textContent.styles || {};

      interface RawSegment {
        str: string;
        xPt: number;
        yTopPt: number;
        baselineYPt: number;
        wPt: number;
        hPt: number;
        fontSizePt: number;
        fontId: EditorFontId;
        isBold: boolean;
        isItalic: boolean;
      }

      const segments: RawSegment[] = [];

      for (const item of rawItems) {
        if (!item.str || !item.str.trim()) continue;
        const m = multiplyMatrix(vpTransform, item.transform);
        const vx = m[4];
        const vBaseY = m[5];
        const fontSizePt = Math.max(
          6.5,
          Math.round((Math.hypot(m[2], m[3]) || Math.hypot(m[0], m[1])) * 10) / 10
        );
        const wPt = Math.max(fontSizePt * 0.35, item.width || item.str.length * fontSizePt * 0.5);
        const hPt = Math.max(fontSizePt * 1.15, item.height || fontSizePt * 1.15);
        const yTopPt = vBaseY - fontSizePt * 0.84;

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

        const { fontId, isBold, isItalic } = classifyFontItem(
          realFontName,
          styleObj.fontFamily || "",
          item.transform[2],
          fontSizePt,
          defaultFontIdRef.current,
          fObj
        );

        segments.push({
          str: item.str,
          xPt: vx,
          yTopPt,
          baselineYPt: vBaseY,
          wPt,
          hPt,
          fontSizePt,
          fontId,
          isBold,
          isItalic,
        });
      }

      // Sort top-to-bottom, then left-to-right
      segments.sort((a, b) => {
        if (Math.abs(a.baselineYPt - b.baselineYPt) > Math.min(a.fontSizePt, b.fontSizePt) * 0.45) {
          return a.baselineYPt - b.baselineYPt;
        }
        return a.xPt - b.xPt;
      });

      // Group segments on the same baseline with matching typography into Sejda horizontal lines
      const mergedLines: RawSegment[] = [];
      for (const seg of segments) {
        const prev = mergedLines[mergedLines.length - 1];
        const sameBase =
          prev &&
          Math.abs(prev.baselineYPt - seg.baselineYPt) <
            Math.min(prev.fontSizePt, seg.fontSizePt) * 0.45;
        const gapPt = prev ? seg.xPt - (prev.xPt + prev.wPt) : Infinity;
        const maxGapPt = Math.max(prev?.fontSizePt || 10, seg.fontSizePt) * 2.5;

        if (
          sameBase &&
          prev &&
          gapPt >= -seg.fontSizePt * 0.5 &&
          gapPt <= maxGapPt &&
          Math.abs(prev.fontSizePt - seg.fontSizePt) <= 1.0 &&
          prev.isBold === seg.isBold &&
          prev.isItalic === seg.isItalic &&
          prev.fontId === seg.fontId
        ) {
          const needsSpace =
            gapPt > seg.fontSizePt * 0.14 &&
            !prev.str.endsWith(" ") &&
            !seg.str.startsWith(" ") &&
            !/['’ʼ`-]$/.test(prev.str);
          prev.str = `${prev.str}${needsSpace ? " " : ""}${seg.str}`;
          prev.wPt = Math.max(prev.wPt, seg.xPt + seg.wPt - prev.xPt);
          prev.hPt = Math.max(prev.hPt, seg.hPt);
        } else {
          mergedLines.push({ ...seg });
        }
      }

      const builtLines: LiveTextLine[] = mergedLines.map((ln, idx) => {
        const sampled = sampleBoxFromFullCanvas(
          fullCtx,
          cw,
          ch,
          ln.xPt * BG_RENDER_SCALE,
          ln.yTopPt * BG_RENDER_SCALE,
          ln.wPt * BG_RENDER_SCALE,
          ln.hPt * BG_RENDER_SCALE,
          ln.fontSizePt * BG_RENDER_SCALE
        );

        // Scrub any residual path-drawn Type1/Type3 glyph pixels from cleanCanvas inside this text box
        cleanCtx.fillStyle = sampled.bgHex;
        cleanCtx.fillRect(
          Math.max(0, ln.xPt * BG_RENDER_SCALE - 1.5),
          Math.max(0, ln.yTopPt * BG_RENDER_SCALE - 1.5),
          ln.wPt * BG_RENDER_SCALE + 3,
          ln.hPt * BG_RENDER_SCALE + 3
        );

        let finalBold = ln.isBold;
        if (sampled.isThinRegular) {
          finalBold = false;
        } else if (sampled.isThickBold) {
          finalBold = true;
        }

        return {
          id: `p${pageNum}_line_${idx}`,
          pageNumber: pageNum,
          originalText: ln.str,
          text: ln.str,
          isNew: false,
          origXPt: ln.xPt,
          origYPt: ln.yTopPt,
          origBaselineYPt: ln.baselineYPt,
          origWidthPt: ln.wPt,
          origHeightPt: ln.hPt,
          xPt: ln.xPt,
          yPt: ln.yTopPt,
          widthPt: ln.wPt,
          heightPt: ln.hPt,
          fontSizePt: ln.fontSizePt,
          fontId: ln.fontId,
          color: sampled.fgHex,
          isBold: finalBold,
          isItalic: ln.isItalic,
          bgHex: sampled.bgHex,
        };
      });

      cleanBgCanvasByPageRef.current[pageNum] = cleanCanvas;
      return { pageW, pageH, cleanCanvas, builtLines };
    },
    []
  );

  const handleFileSelected = async (files: File[]) => {
    const selected = files[0];
    if (!selected) return;

    setFile(selected);
    setCurrentPage(1);
    setLines([]);
    setOverlays([]);
    setSelectedId(null);
    setHistoryPast([]);
    setHistoryFuture([]);
    setReadyDownloadBlob(null);
    setErrorMessage(null);
    cleanBgCanvasByPageRef.current = {};
    extractedPagesRef.current = new Set();

    try {
      const pdfjs = await loadPdfJs();
      const buffer = await selected.arrayBuffer();
      defaultFontIdRef.current = detectDefaultFontFromPdfBuffer(buffer);

      const pdf = await pdfjs.getDocument({ data: buffer }).promise;
      setPdfDocProxy(pdf);
      setTotalPages(pdf.numPages);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load PDF file.");
      setFile(null);
    }
  };

  useEffect(() => {
    if (!pdfDocProxy) return;
    let cancelled = false;

    (async () => {
      setIsRenderingPage(true);
      try {
        const page = await pdfDocProxy.getPage(currentPage);
        const vp = page.getViewport({ scale: 1.0 });
        if (!cancelled) {
          setPageSizePt({ width: vp.width, height: vp.height });
        }

        if (!extractedPagesRef.current.has(currentPage)) {
          extractedPagesRef.current.add(currentPage);
          const { cleanCanvas, builtLines } = await extractAndRenderPage(
            pdfDocProxy,
            currentPage
          );
          if (!cancelled) {
            setLines((prev) => [
              ...prev.filter((l) => l.pageNumber !== currentPage),
              ...builtLines,
            ]);
            if (bgCanvasRef.current) {
              bgCanvasRef.current.width = cleanCanvas.width;
              bgCanvasRef.current.height = cleanCanvas.height;
              bgCanvasRef.current.getContext("2d")?.drawImage(cleanCanvas, 0, 0);
            }
          }
        } else {
          const cached = cleanBgCanvasByPageRef.current[currentPage];
          if (cached && bgCanvasRef.current && !cancelled) {
            bgCanvasRef.current.width = cached.width;
            bgCanvasRef.current.height = cached.height;
            bgCanvasRef.current.getContext("2d")?.drawImage(cached, 0, 0);
          }
        }
      } catch (err) {
        console.error("Error rendering page:", err);
      } finally {
        if (!cancelled) setIsRenderingPage(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfDocProxy, currentPage, extractAndRenderPage]);

  // Update Line helper
  const updateLine = useCallback(
    (id: string, patch: Partial<LiveTextLine>, recordUndo: boolean = true) => {
      setLines((prev) => {
        if (recordUndo) {
          pushHistory({ lines: prev, overlays });
        }
        return prev.map((l) => (l.id === id ? { ...l, ...patch } : l));
      });
    },
    [overlays, pushHistory]
  );

  // Update Overlay helper
  const updateOverlay = useCallback(
    (id: string, patch: Partial<OverlayItem>, recordUndo: boolean = true) => {
      setOverlays((prev) => {
        if (recordUndo) {
          pushHistory({ lines, overlays: prev });
        }
        return prev.map((o) => (o.id === id ? { ...o, ...patch } : o));
      });
    },
    [lines, pushHistory]
  );

  // Duplicate Line or Overlay (Sejda Duplicate button)
  const handleDuplicateSelected = () => {
    if (!selectedId) return;
    const ln = lines.find((l) => l.id === selectedId);
    if (ln) {
      pushHistory();
      const copyId = `line_copy_${Date.now()}`;
      const copyLine: LiveTextLine = {
        ...ln,
        id: copyId,
        isNew: true,
        xPt: Math.min(pageSizePt.width - 40, ln.xPt + 12),
        yPt: Math.min(pageSizePt.height - 20, ln.yPt + 16),
      };
      setLines((prev) => [...prev, copyLine]);
      setSelectedId(copyId);
      return;
    }
    const ov = overlays.find((o) => o.id === selectedId);
    if (ov) {
      pushHistory();
      const copyId = `ov_copy_${Date.now()}`;
      const copyOv: OverlayItem = {
        ...ov,
        id: copyId,
        xPt: Math.min(pageSizePt.width - 30, ov.xPt + 14),
        yPt: Math.min(pageSizePt.height - 30, ov.yPt + 14),
      };
      setOverlays((prev) => [...prev, copyOv]);
      setSelectedId(copyId);
    }
  };

  // Delete Line or Overlay (Sejda Trash button)
  const handleDeleteSelected = useCallback(() => {
    if (!selectedId) return;
    pushHistory();
    setLines((prev) => prev.filter((l) => l.id !== selectedId));
    setOverlays((prev) => prev.filter((o) => o.id !== selectedId));
    setSelectedId(null);
  }, [selectedId, pushHistory]);

  // Find & Replace across all extracted lines
  const findMatches = findText.trim()
    ? lines.filter((l) =>
        matchCase
          ? l.text.includes(findText)
          : l.text.toLowerCase().includes(findText.toLowerCase())
      )
    : [];

  const handleReplaceAll = () => {
    if (!findText.trim()) return;
    const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(escaped, matchCase ? "g" : "gi");
    pushHistory();
    setLines((prev) =>
      prev.map((l) => (rx.test(l.text) ? { ...l, text: l.text.replace(rx, replaceText) } : l))
    );
  };

  // Click on page canvas to add "Type your text", form mark, or start drawing box
  const handlePagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !pageWrapperRef.current) return;
    setOpenDropdown(null);

    const rect = pageWrapperRef.current.getBoundingClientRect();
    const scale = rect.width / pageSizePt.width;
    const clickXPt = (e.clientX - rect.left) / scale;
    const clickYPt = (e.clientY - rect.top) / scale;

    if (activeTool === "text") {
      // If user already had a line selected, first click on blank paper deselects;
      // clicking blank paper when nothing is selected drops a Sejda "Type your text" box!
      if (selectedId) {
        setSelectedId(null);
        return;
      }
      pushHistory();
      const newId = `new_line_${Date.now()}`;
      const newLine: LiveTextLine = {
        id: newId,
        pageNumber: currentPage,
        originalText: "",
        text: "Type your text",
        isNew: true,
        origXPt: clickXPt,
        origYPt: clickYPt - 10,
        origBaselineYPt: clickYPt,
        origWidthPt: 95,
        origHeightPt: 16,
        xPt: Math.max(10, Math.min(pageSizePt.width - 100, clickXPt)),
        yPt: Math.max(10, Math.min(pageSizePt.height - 24, clickYPt - 10)),
        widthPt: 95,
        heightPt: 16,
        fontSizePt: 12,
        fontId: defaultFontIdRef.current,
        color: "#000000",
        isBold: false,
        isItalic: false,
        bgHex: "transparent",
      };
      setLines((prev) => [...prev, newLine]);
      setSelectedId(newId);
      return;
    }

    if (activeTool === "forms") {
      pushHistory();
      const id = `form_${Date.now()}`;
      const isField = formSubTool === "textfield";
      const newOv: OverlayItem = {
        id,
        pageNumber: currentPage,
        kind: formSubTool,
        xPt: clickXPt - (isField ? 50 : 8),
        yPt: clickYPt - 9,
        wPt: isField ? 120 : 18,
        hPt: 18,
        color: "#0f172a",
        text: isField ? "Text field" : formSubTool === "check" ? "✓" : formSubTool === "cross" ? "✕" : "•",
      };
      setOverlays((prev) => [...prev, newOv]);
      setSelectedId(id);
      return;
    }

    if (activeTool === "sign") {
      setShowSignModal(true);
      return;
    }

    if (activeTool === "images") {
      imageInputRef.current?.click();
      return;
    }

    if (activeTool === "annotate" && annotateSubTool === "freehand") {
      setDragState({
        kind: "freehand",
        startClientX: e.clientX,
        startClientY: e.clientY,
        startXPt: clickXPt,
        startYPt: clickYPt,
        startWPt: 0,
        startHPt: 0,
        curXPt: clickXPt,
        curYPt: clickYPt,
        points: [{ x: clickXPt, y: clickYPt }],
        snapshotBefore: { lines, overlays },
      });
      return;
    }

    if (
      activeTool === "whiteout" ||
      activeTool === "links" ||
      activeTool === "annotate" ||
      activeTool === "shapes"
    ) {
      setDragState({
        kind: "draw-box",
        startClientX: e.clientX,
        startClientY: e.clientY,
        startXPt: clickXPt,
        startYPt: clickYPt,
        startWPt: 0,
        startHPt: 0,
        curXPt: clickXPt,
        curYPt: clickYPt,
        snapshotBefore: { lines, overlays },
      });
    }
  };

  // Global pointer move / up for dragging lines, resizing overlays, or drawing shapes/highlights
  useEffect(() => {
    if (!dragState) return;

    const onMove = (e: PointerEvent) => {
      if (!pageWrapperRef.current) return;
      const rect = pageWrapperRef.current.getBoundingClientRect();
      const scale = rect.width / pageSizePt.width;
      const dxPt = (e.clientX - dragState.startClientX) / scale;
      const dyPt = (e.clientY - dragState.startClientY) / scale;
      const curXPt = Math.max(0, Math.min(pageSizePt.width, (e.clientX - rect.left) / scale));
      const curYPt = Math.max(0, Math.min(pageSizePt.height, (e.clientY - rect.top) / scale));

      if (dragState.kind === "move-line" && dragState.targetId) {
        setLines((prev) =>
          prev.map((l) =>
            l.id === dragState.targetId
              ? {
                  ...l,
                  xPt: Math.max(0, Math.min(pageSizePt.width - 20, dragState.startXPt + dxPt)),
                  yPt: Math.max(0, Math.min(pageSizePt.height - 12, dragState.startYPt + dyPt)),
                }
              : l
          )
        );
      } else if (dragState.kind === "move-overlay" && dragState.targetId) {
        setOverlays((prev) =>
          prev.map((o) =>
            o.id === dragState.targetId
              ? {
                  ...o,
                  xPt: Math.max(0, Math.min(pageSizePt.width - 10, dragState.startXPt + dxPt)),
                  yPt: Math.max(0, Math.min(pageSizePt.height - 10, dragState.startYPt + dyPt)),
                }
              : o
          )
        );
      } else if (dragState.kind === "resize-overlay" && dragState.targetId) {
        setOverlays((prev) =>
          prev.map((o) =>
            o.id === dragState.targetId
              ? {
                  ...o,
                  wPt: Math.max(12, dragState.startWPt + dxPt),
                  hPt: Math.max(10, dragState.startHPt + dyPt),
                }
              : o
          )
        );
      } else if (dragState.kind === "freehand") {
        setDragState((prev) =>
          prev
            ? {
                ...prev,
                curXPt,
                curYPt,
                points: [...(prev.points || []), { x: curXPt, y: curYPt }],
              }
            : null
        );
      } else if (dragState.kind === "draw-box") {
        setDragState((prev) => (prev ? { ...prev, curXPt, curYPt } : null));
      }
    };

    const onUp = () => {
      if (dragState.kind === "move-line" || dragState.kind === "move-overlay" || dragState.kind === "resize-overlay") {
        pushHistory(dragState.snapshotBefore);
      } else if (dragState.kind === "freehand" && dragState.points && dragState.points.length > 2) {
        pushHistory(dragState.snapshotBefore);
        const xs = dragState.points.map((p) => p.x);
        const ys = dragState.points.map((p) => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);
        const id = `freehand_${Date.now()}`;
        setOverlays((prev) => [
          ...prev,
          {
            id,
            pageNumber: currentPage,
            kind: "freehand",
            xPt: minX,
            yPt: minY,
            wPt: Math.max(10, maxX - minX),
            hPt: Math.max(10, maxY - minY),
            color: "#dc2626",
            strokeWidthPt: 2,
            points: dragState.points,
          },
        ]);
        setSelectedId(id);
      } else if (dragState.kind === "draw-box") {
        const minX = Math.min(dragState.startXPt, dragState.curXPt);
        const minY = Math.min(dragState.startYPt, dragState.curYPt);
        const w = Math.abs(dragState.curXPt - dragState.startXPt);
        const h = Math.abs(dragState.curYPt - dragState.startYPt);

        if (w > 6 || h > 6) {
          pushHistory(dragState.snapshotBefore);
          const id = `ov_${Date.now()}`;
          let kind: OverlayItem["kind"] = "whiteout";
          let color = "#2563eb";
          let fillColor = "transparent";
          let linkUrl: string | undefined;

          if (activeTool === "whiteout") {
            kind = "whiteout";
            color = "#ffffff";
            fillColor = "#ffffff";
          } else if (activeTool === "links") {
            kind = "link";
            color = "#2563eb";
            linkUrl = "https://";
          } else if (activeTool === "annotate") {
            kind = annotateSubTool;
            color =
              annotateSubTool === "highlight"
                ? "#facc15"
                : annotateSubTool === "strike"
                  ? "#dc2626"
                  : "#2563eb";
          } else if (activeTool === "shapes") {
            kind = shapeSubTool;
            color = "#1e293b";
          }

          setOverlays((prev) => [
            ...prev,
            {
              id,
              pageNumber: currentPage,
              kind,
              xPt: minX,
              yPt: minY,
              wPt: Math.max(16, w),
              hPt: Math.max(12, h),
              color,
              fillColor,
              strokeWidthPt: 2,
              linkUrl,
            },
          ]);
          setSelectedId(id);
        }
      }
      setDragState(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragState, pageSizePt, currentPage, activeTool, annotateSubTool, shapeSubTool, pushHistory]);

  // Handle Image Upload onto Page
  const handleImageFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const imgFile = e.target.files?.[0];
    if (!imgFile) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        pushHistory();
        const aspect = img.width / Math.max(1, img.height);
        const wPt = 140;
        const hPt = Math.round(wPt / aspect);
        const id = `img_${Date.now()}`;
        setOverlays((prev) => [
          ...prev,
          {
            id,
            pageNumber: currentPage,
            kind: "image",
            xPt: pageSizePt.width / 2 - wPt / 2,
            yPt: pageSizePt.height / 3,
            wPt,
            hPt,
            color: "#000000",
            dataUrl,
          },
        ]);
        setSelectedId(id);
        setActiveTool("text");
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(imgFile);
    e.target.value = "";
  };

  // Signature Modal: Save Drawn or Typed Signature onto Page
  const handlePlaceSignature = () => {
    let dataUrl = "";
    if (signMode === "draw" && signPadCanvasRef.current) {
      dataUrl = signPadCanvasRef.current.toDataURL("image/png");
    } else if (signMode === "type" && typedSignature.trim()) {
      const c = document.createElement("canvas");
      c.width = 480;
      c.height = 140;
      const ctx = c.getContext("2d")!;
      ctx.font = '700 64px "Dancing Script", "Brush Script MT", cursive';
      ctx.fillStyle = signColor;
      ctx.textBaseline = "middle";
      ctx.fillText(typedSignature.trim(), 20, 75);
      dataUrl = c.toDataURL("image/png");
    }
    if (!dataUrl) return;

    pushHistory();
    const id = `sig_${Date.now()}`;
    setOverlays((prev) => [
      ...prev,
      {
        id,
        pageNumber: currentPage,
        kind: "signature",
        xPt: pageSizePt.width / 2 - 75,
        yPt: pageSizePt.height * 0.65,
        wPt: 150,
        hPt: 45,
        color: signColor,
        dataUrl,
      },
    ]);
    setSelectedId(id);
    setShowSignModal(false);
    setActiveTool("text");
  };

  // ============================================================================
  // MODULE 4: SEJDA "APPLY CHANGES >" HIGH-FIDELITY PDF EXPORT ENGINE
  // ============================================================================
  const handleApplyChanges = async () => {
    if (!file || !pdfDocProxy) return;
    setIsApplying(true);
    setErrorMessage(null);
    setSelectedId(null);

    try {
      const EXPORT_SCALE = 2.5;
      const outPdf = await PDFDocument.create();

      const workingLines = [...lines];
      for (let p = 1; p <= totalPages; p++) {
        if (!extractedPagesRef.current.has(p)) {
          extractedPagesRef.current.add(p);
          const { builtLines } = await extractAndRenderPage(pdfDocProxy, p);
          workingLines.push(...builtLines);
        }

        const page = await pdfDocProxy.getPage(p);
        const baseVp = page.getViewport({ scale: 1.0 });
        const pW = baseVp.width;
        const pH = baseVp.height;

        const expVp = page.getViewport({ scale: EXPORT_SCALE });
        const cnv = document.createElement("canvas");
        cnv.width = Math.ceil(expVp.width);
        cnv.height = Math.ceil(expVp.height);
        const ctx = cnv.getContext("2d")!;

        // 1. Draw clean text-free background at high DPI
        const cachedClean = cleanBgCanvasByPageRef.current[p];
        if (cachedClean) {
          ctx.drawImage(cachedClean, 0, 0, cnv.width, cnv.height);
        } else {
          ctx.fillText = () => {};
          ctx.strokeText = () => {};
          await page.render({ canvasContext: ctx, viewport: expVp }).promise;
        }

        // 2. Draw all Whiteouts & Highlights behind text
        const pageOverlays = overlays.filter((o) => o.pageNumber === p);
        for (const ov of pageOverlays) {
          const ox = ov.xPt * EXPORT_SCALE;
          const oy = ov.yPt * EXPORT_SCALE;
          const ow = ov.wPt * EXPORT_SCALE;
          const oh = ov.hPt * EXPORT_SCALE;

          if (ov.kind === "whiteout") {
            ctx.fillStyle = ov.fillColor || "#ffffff";
            ctx.fillRect(ox, oy, ow, oh);
          } else if (ov.kind === "highlight") {
            ctx.save();
            ctx.globalAlpha = 0.38;
            ctx.fillStyle = ov.color || "#facc15";
            ctx.fillRect(ox, oy, ow, oh);
            ctx.restore();
          }
        }

        // 3. Draw 100% of live text lines on the page with identical typography
        const pageLines = workingLines.filter((l) => l.pageNumber === p);
        for (const ln of pageLines) {
          if (!ln.text.trim()) continue;
          const fontPx = ln.fontSizePt * EXPORT_SCALE;
          const prefix = `${ln.isItalic ? "italic " : ""}${ln.isBold ? "700 " : "400 "}`;
          ctx.font = `${prefix}${fontPx}px ${getFontCss(ln.fontId)}`;
          ctx.fillStyle = ln.color;
          ctx.textBaseline = "alphabetic";
          const baselineY = (ln.yPt + ln.fontSizePt * 0.84) * EXPORT_SCALE;
          ctx.fillText(ln.text, ln.xPt * EXPORT_SCALE, baselineY);
        }

        // 4. Draw foreground Shapes, Forms, Images, Signatures, Freehand
        for (const ov of pageOverlays) {
          const ox = ov.xPt * EXPORT_SCALE;
          const oy = ov.yPt * EXPORT_SCALE;
          const ow = ov.wPt * EXPORT_SCALE;
          const oh = ov.hPt * EXPORT_SCALE;

          if (ov.kind === "strike") {
            ctx.strokeStyle = ov.color || "#dc2626";
            ctx.lineWidth = 2 * EXPORT_SCALE;
            ctx.beginPath();
            ctx.moveTo(ox, oy + oh / 2);
            ctx.lineTo(ox + ow, oy + oh / 2);
            ctx.stroke();
          } else if (ov.kind === "underline") {
            ctx.strokeStyle = ov.color || "#2563eb";
            ctx.lineWidth = 2 * EXPORT_SCALE;
            ctx.beginPath();
            ctx.moveTo(ox, oy + oh);
            ctx.lineTo(ox + ow, oy + oh);
            ctx.stroke();
          } else if (ov.kind === "rect") {
            ctx.strokeStyle = ov.color;
            ctx.lineWidth = (ov.strokeWidthPt || 2) * EXPORT_SCALE;
            ctx.strokeRect(ox, oy, ow, oh);
          } else if (ov.kind === "ellipse") {
            ctx.strokeStyle = ov.color;
            ctx.lineWidth = (ov.strokeWidthPt || 2) * EXPORT_SCALE;
            ctx.beginPath();
            ctx.ellipse(ox + ow / 2, oy + oh / 2, ow / 2, oh / 2, 0, 0, Math.PI * 2);
            ctx.stroke();
          } else if (ov.kind === "line" || ov.kind === "arrow") {
            ctx.strokeStyle = ov.color;
            ctx.lineWidth = (ov.strokeWidthPt || 2) * EXPORT_SCALE;
            ctx.beginPath();
            ctx.moveTo(ox, oy + oh / 2);
            ctx.lineTo(ox + ow, oy + oh / 2);
            ctx.stroke();
            if (ov.kind === "arrow") {
              const head = 7 * EXPORT_SCALE;
              ctx.beginPath();
              ctx.moveTo(ox + ow, oy + oh / 2);
              ctx.lineTo(ox + ow - head, oy + oh / 2 - head * 0.6);
              ctx.lineTo(ox + ow - head, oy + oh / 2 + head * 0.6);
              ctx.closePath();
              ctx.fillStyle = ov.color;
              ctx.fill();
            }
          } else if (
            ov.kind === "check" ||
            ov.kind === "cross" ||
            ov.kind === "dot" ||
            ov.kind === "textfield"
          ) {
            ctx.font = `700 ${14 * EXPORT_SCALE}px Arial, sans-serif`;
            ctx.fillStyle = ov.color || "#0f172a";
            ctx.textBaseline = "top";
            ctx.fillText(ov.text || "✓", ox, oy);
          } else if (ov.kind === "freehand" && ov.points && ov.points.length > 1) {
            ctx.strokeStyle = ov.color || "#dc2626";
            ctx.lineWidth = (ov.strokeWidthPt || 2) * EXPORT_SCALE;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.beginPath();
            ctx.moveTo(ov.points[0].x * EXPORT_SCALE, ov.points[0].y * EXPORT_SCALE);
            for (let i = 1; i < ov.points.length; i++) {
              ctx.lineTo(ov.points[i].x * EXPORT_SCALE, ov.points[i].y * EXPORT_SCALE);
            }
            ctx.stroke();
          } else if ((ov.kind === "image" || ov.kind === "signature") && ov.dataUrl) {
            await new Promise<void>((resolve) => {
              const im = new Image();
              im.onload = () => {
                ctx.drawImage(im, ox, oy, ow, oh);
                resolve();
              };
              im.onerror = () => resolve();
              im.src = ov.dataUrl!;
            });
          }
        }

        const pngBytes = dataUrlToBytes(cnv.toDataURL("image/png"));
        const embeddedPng = await outPdf.embedPng(pngBytes);
        const pdfPage = outPdf.addPage([pW, pH]);
        pdfPage.drawImage(embeddedPng, {
          x: 0,
          y: 0,
          width: pW,
          height: pH,
        });
      }

      const finalBytes = await outPdf.save({ useObjectStreams: true });
      const outName = `edited_${file.name}`;
      downloadBlob(finalBytes, outName);
      setReadyDownloadBlob({ bytes: finalBytes, name: outName });
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to export edited PDF.");
    } finally {
      setIsApplying(false);
    }
  };

  const displayScale = 1.48 * (zoomPercent / 100);
  const pageCssWidth = Math.round(pageSizePt.width * displayScale);
  const pageCssHeight = Math.round(pageSizePt.height * displayScale);

  const currentPageLines = lines.filter((l) => l.pageNumber === currentPage);
  const currentPageOverlays = overlays.filter((o) => o.pageNumber === currentPage);

  return (
    <ToolLayout
      title="Online PDF Editor (Sejda Style)"
      description="Click directly on any line of text in your PDF to type and edit in-place with 100% matching typography, plus add Links, Forms, Images, Signatures, Whiteout, Annotations, and Shapes."
      faqs={[
        {
          question: "Why does edited text match the rest of the page 100%?",
          answer:
            "Just like Sejda PDF Editor, our engine renders the clean non-text page background on the canvas and converts every line on the page into a live editable DOM text layer—so newly typed words and existing words share the exact same font rendering.",
        },
        {
          question: "How do I edit existing text vs adding new text?",
          answer:
            "With the 'Text' tool active, click directly on any existing sentence to type right inside it, or click on any blank space on the page to insert a new 'Type your text' block.",
        },
        {
          question: "Can I sign, whiteout, highlight, or insert images?",
          answer:
            "Yes! Use the Sejda-style top floating pill bar to switch between Text, Links, Forms, Images, Sign, Whiteout, Annotate, and Shapes, then click 'Apply changes' at the bottom.",
        },
      ]}
    >
      <div className="space-y-4">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleImageFileSelected}
        />

        {!file && (
          <FileDropzone
            accept="application/pdf,.pdf"
            multiple={false}
            onFilesSelected={handleFileSelected}
            title="Upload PDF file to edit"
            description="Files stay 100% private in your browser. Click any text line to type in-place just like Sejda PDF Editor."
          />
        )}

        {file && (
          <div className="relative flex flex-col items-center rounded-2xl border border-slate-300 bg-[#e8eaed] dark:border-slate-800 dark:bg-slate-950 min-h-[86vh] pb-24 overflow-hidden">
            {/* ================================================================ */}
            {/* MODULE 3: SEJDA TOP FLOATING PILL TOOLBAR                        */}
            {/* ================================================================ */}
            <div className="sticky top-0 z-40 flex w-full flex-col items-center bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 py-2.5 px-3 shadow-xs backdrop-blur-xs">
              <div className="flex flex-wrap items-center justify-center gap-0.5 rounded-lg border border-sky-300/90 bg-white dark:bg-slate-900 shadow-sm p-0.5">
                {/* 1. TEXT TOOL */}
                <div className="relative flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTool("text");
                      setOpenDropdown(null);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-l-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeTool === "text"
                        ? "bg-sky-100/90 text-sky-800 font-semibold"
                        : "text-sky-700 hover:bg-sky-50"
                    }`}
                  >
                    <Type className="h-3.5 w-3.5 text-sky-600" />
                    <span>Text</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenDropdown(openDropdown === "text" ? null : "text")
                    }
                    className="border-l border-sky-200 px-1.5 py-1.5 text-sky-600 hover:bg-sky-50"
                    title="Text options & Find/Replace"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>

                  {openDropdown === "text" && (
                    <div className="absolute left-0 top-full mt-1 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-xl z-50 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTool("text");
                          setSelectedId(null);
                          setOpenDropdown(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-sky-50"
                      >
                        <Type className="h-3.5 w-3.5 text-sky-600" />
                        <span>Edit / Add Text</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowFindReplace((v) => !v);
                          setOpenDropdown(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-sky-50"
                      >
                        <Search className="h-3.5 w-3.5 text-sky-600" />
                        <span>Find & Replace (Ctrl+F)</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. LINKS TOOL */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTool("links");
                    setOpenDropdown(null);
                  }}
                  className={`inline-flex items-center gap-1.5 border-l border-sky-200 px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeTool === "links"
                      ? "bg-sky-100/90 text-sky-800 font-semibold"
                      : "text-sky-700 hover:bg-sky-50"
                  }`}
                >
                  <LinkIcon className="h-3.5 w-3.5 text-sky-600" />
                  <span>Links</span>
                </button>

                {/* 3. FORMS TOOL */}
                <div className="relative flex items-center border-l border-sky-200">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTool("forms");
                      setOpenDropdown(openDropdown === "forms" ? null : "forms");
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeTool === "forms"
                        ? "bg-sky-100/90 text-sky-800 font-semibold"
                        : "text-sky-700 hover:bg-sky-50"
                    }`}
                  >
                    <CheckSquare className="h-3.5 w-3.5 text-sky-600" />
                    <span>Forms</span>
                    <ChevronDown className="h-3 w-3 opacity-70" />
                  </button>

                  {openDropdown === "forms" && (
                    <div className="absolute left-0 top-full mt-1 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-xl z-50 text-xs">
                      {(
                        [
                          { id: "check", label: "✓ Checkmark" },
                          { id: "cross", label: "✕ Cross mark" },
                          { id: "dot", label: "• Radio dot" },
                          { id: "textfield", label: "[Abc] Text field" },
                        ] as const
                      ).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setFormSubTool(item.id);
                            setActiveTool("forms");
                            setOpenDropdown(null);
                          }}
                          className="flex w-full items-center justify-between px-3 py-1.5 text-left text-slate-700 hover:bg-sky-50"
                        >
                          <span>{item.label}</span>
                          {formSubTool === item.id && (
                            <Check className="h-3.5 w-3.5 text-sky-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. IMAGES TOOL */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTool("images");
                    setOpenDropdown(null);
                    imageInputRef.current?.click();
                  }}
                  className={`inline-flex items-center gap-1.5 border-l border-sky-200 px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeTool === "images"
                      ? "bg-sky-100/90 text-sky-800 font-semibold"
                      : "text-sky-700 hover:bg-sky-50"
                  }`}
                >
                  <ImageIcon className="h-3.5 w-3.5 text-sky-600" />
                  <span>Images</span>
                  <ChevronDown className="h-3 w-3 opacity-70" />
                </button>

                {/* 5. SIGN TOOL */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTool("sign");
                    setOpenDropdown(null);
                    setShowSignModal(true);
                  }}
                  className={`inline-flex items-center gap-1.5 border-l border-sky-200 px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeTool === "sign"
                      ? "bg-sky-100/90 text-sky-800 font-semibold"
                      : "text-sky-700 hover:bg-sky-50"
                  }`}
                >
                  <PenTool className="h-3.5 w-3.5 text-sky-600" />
                  <span>Sign</span>
                  <ChevronDown className="h-3 w-3 opacity-70" />
                </button>

                {/* 6. WHITEOUT TOOL */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTool("whiteout");
                    setOpenDropdown(null);
                  }}
                  className={`inline-flex items-center gap-1.5 border-l border-sky-200 px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeTool === "whiteout"
                      ? "bg-sky-100/90 text-sky-800 font-semibold"
                      : "text-sky-700 hover:bg-sky-50"
                  }`}
                >
                  <Eraser className="h-3.5 w-3.5 text-sky-600" />
                  <span>Whiteout</span>
                </button>

                {/* 7. ANNOTATE TOOL */}
                <div className="relative flex items-center border-l border-sky-200">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTool("annotate");
                      setOpenDropdown(
                        openDropdown === "annotate" ? null : "annotate"
                      );
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeTool === "annotate"
                        ? "bg-sky-100/90 text-sky-800 font-semibold"
                        : "text-sky-700 hover:bg-sky-50"
                    }`}
                  >
                    <Highlighter className="h-3.5 w-3.5 text-sky-600" />
                    <span>Annotate</span>
                    <ChevronDown className="h-3 w-3 opacity-70" />
                  </button>

                  {openDropdown === "annotate" && (
                    <div className="absolute left-0 top-full mt-1 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-xl z-50 text-xs">
                      {(
                        [
                          { id: "highlight", label: "Highlight area" },
                          { id: "strike", label: "Strikethrough" },
                          { id: "underline", label: "Underline" },
                          { id: "freehand", label: "Freehand Draw" },
                        ] as const
                      ).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setAnnotateSubTool(item.id);
                            setActiveTool("annotate");
                            setOpenDropdown(null);
                          }}
                          className="flex w-full items-center justify-between px-3 py-1.5 text-left text-slate-700 hover:bg-sky-50"
                        >
                          <span>{item.label}</span>
                          {annotateSubTool === item.id && (
                            <Check className="h-3.5 w-3.5 text-sky-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 8. SHAPES TOOL */}
                <div className="relative flex items-center border-l border-sky-200">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTool("shapes");
                      setOpenDropdown(openDropdown === "shapes" ? null : "shapes");
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeTool === "shapes"
                        ? "bg-sky-100/90 text-sky-800 font-semibold"
                        : "text-sky-700 hover:bg-sky-50"
                    }`}
                  >
                    <Shapes className="h-3.5 w-3.5 text-sky-600" />
                    <span>Shapes</span>
                    <ChevronDown className="h-3 w-3 opacity-70" />
                  </button>

                  {openDropdown === "shapes" && (
                    <div className="absolute left-0 top-full mt-1 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-xl z-50 text-xs">
                      {(
                        [
                          { id: "rect", label: "Rectangle", icon: Square },
                          { id: "ellipse", label: "Ellipse / Circle", icon: Circle },
                          { id: "line", label: "Straight Line", icon: Minus },
                          { id: "arrow", label: "Arrow", icon: ArrowRight },
                        ] as const
                      ).map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setShapeSubTool(item.id);
                              setActiveTool("shapes");
                              setOpenDropdown(null);
                            }}
                            className="flex w-full items-center justify-between px-3 py-1.5 text-left text-slate-700 hover:bg-sky-50"
                          >
                            <span className="flex items-center gap-2">
                              <Icon className="h-3.5 w-3.5 text-sky-600" />
                              {item.label}
                            </span>
                            {shapeSubTool === item.id && (
                              <Check className="h-3.5 w-3.5 text-sky-600" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 9. UNDO / REDO */}
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={historyPast.length === 0}
                  className="inline-flex items-center gap-1 border-l border-sky-200 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50 disabled:opacity-40"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="h-3.5 w-3.5 text-sky-600" />
                  <span>Undo</span>
                </button>
                {historyFuture.length > 0 && (
                  <button
                    type="button"
                    onClick={handleRedo}
                    className="inline-flex items-center gap-1 border-l border-sky-200 px-2.5 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50"
                    title="Redo (Ctrl+Y)"
                  >
                    <Redo2 className="h-3.5 w-3.5 text-sky-600" />
                  </button>
                )}
              </div>

              {/* Optional Collapsible Find & Replace Bar */}
              {showFindReplace && (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-sky-200 bg-sky-50/70 px-3 py-1.5 text-xs shadow-2xs">
                  <Search className="h-3.5 w-3.5 text-sky-600" />
                  <input
                    type="text"
                    value={findText}
                    onChange={(e) => setFindText(e.target.value)}
                    placeholder="Find text..."
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-sky-500"
                  />
                  <Replace className="h-3.5 w-3.5 text-sky-600" />
                  <input
                    type="text"
                    value={replaceText}
                    onChange={(e) => setReplaceText(e.target.value)}
                    placeholder="Replace with..."
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-sky-500"
                  />
                  <label className="inline-flex items-center gap-1 text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={matchCase}
                      onChange={(e) => setMatchCase(e.target.checked)}
                    />
                    <span>Match case</span>
                  </label>
                  <button
                    type="button"
                    disabled={findMatches.length === 0}
                    onClick={handleReplaceAll}
                    className="rounded bg-sky-600 px-2.5 py-1 font-semibold text-white hover:bg-sky-500 disabled:opacity-40"
                  >
                    Replace All ({findMatches.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFindReplace(false)}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Right-Side Sejda Floating Page & Zoom Controls */}
            <div className="fixed right-5 top-28 z-30 flex flex-col items-center gap-1.5">
              <div className="flex flex-col items-center rounded-lg border border-sky-300 bg-white p-1 shadow-md text-xs text-sky-700">
                <button
                  type="button"
                  onClick={() => setZoomPercent((z) => Math.min(175, z + 15))}
                  className="p-1.5 hover:bg-sky-50 rounded"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <span className="font-mono text-[10px] font-bold py-0.5">
                  {zoomPercent}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomPercent((z) => Math.max(70, z - 15))}
                  className="p-1.5 hover:bg-sky-50 rounded"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
              </div>

              {totalPages > 1 && (
                <div className="flex flex-col items-center rounded-lg border border-sky-300 bg-white p-1 shadow-md text-xs text-sky-700">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1 hover:bg-sky-50 rounded disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="font-mono text-[10px] font-bold px-1">
                    {currentPage}/{totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1 hover:bg-sky-50 rounded disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setLines([]);
                  setOverlays([]);
                }}
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-500 hover:text-red-600 shadow-md"
                title="Close PDF"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* ================================================================ */}
            {/* MAIN SEJDA PAGE WORKSPACE (CLEAN CANVAS + LIVE DOM TEXT LAYER)   */}
            {/* ================================================================ */}
            <div className="w-full flex-1 overflow-auto py-6 px-4 flex justify-center">
              <div
                ref={pageWrapperRef}
                onPointerDown={handlePagePointerDown}
                style={{
                  width: `${pageCssWidth}px`,
                  height: `${pageCssHeight}px`,
                }}
                className={`relative bg-white shadow-[0_4px_24px_rgba(0,0,0,0.12)] select-none ${
                  activeTool === "text" ? "cursor-text" : "cursor-crosshair"
                }`}
              >
                {isRenderingPage && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70">
                    <Loader2 className="h-7 w-7 animate-spin text-sky-600" />
                  </div>
                )}

                {/* Clean Text-Free PDF Background Canvas */}
                <canvas
                  ref={bgCanvasRef}
                  className="pointer-events-none block w-full h-full"
                />

                {/* Live Drag-Draw Preview Box */}
                {dragState?.kind === "draw-box" && (
                  <div
                    style={{
                      left: `${Math.min(dragState.startXPt, dragState.curXPt) * displayScale}px`,
                      top: `${Math.min(dragState.startYPt, dragState.curYPt) * displayScale}px`,
                      width: `${Math.abs(dragState.curXPt - dragState.startXPt) * displayScale}px`,
                      height: `${Math.abs(dragState.curYPt - dragState.startYPt) * displayScale}px`,
                    }}
                    className="pointer-events-none absolute z-40 border border-sky-500 bg-sky-400/15"
                  />
                )}

                {/* ============================================================ */}
                {/* OVERLAY ITEMS (Whiteouts, Highlights, Shapes, Forms, Images) */}
                {/* ============================================================ */}
                {currentPageOverlays.map((ov) => {
                  const isSel = selectedId === ov.id;
                  const leftPx = ov.xPt * displayScale;
                  const topPx = ov.yPt * displayScale;
                  const widthPx = ov.wPt * displayScale;
                  const heightPx = ov.hPt * displayScale;

                  return (
                    <div
                      key={ov.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(ov.id);
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setSelectedId(ov.id);
                        setDragState({
                          kind: "move-overlay",
                          targetId: ov.id,
                          startClientX: e.clientX,
                          startClientY: e.clientY,
                          startXPt: ov.xPt,
                          startYPt: ov.yPt,
                          startWPt: ov.wPt,
                          startHPt: ov.hPt,
                          curXPt: ov.xPt,
                          curYPt: ov.yPt,
                          snapshotBefore: { lines, overlays },
                        });
                      }}
                      style={{
                        left: `${leftPx}px`,
                        top: `${topPx}px`,
                        width: `${widthPx}px`,
                        height: `${heightPx}px`,
                      }}
                      className={`group absolute cursor-move ${
                        isSel
                          ? "z-30 ring-1 ring-sky-500"
                          : "z-20 hover:ring-1 hover:ring-sky-400/60"
                      }`}
                    >
                      {/* Floating Mini-Toolbar for Selected Overlay */}
                      {isSel && (
                        <div
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute -top-9 left-0 z-50 flex items-center rounded-md border border-sky-400 bg-white shadow-md text-xs text-sky-700"
                        >
                          {ov.kind === "link" && (
                            <input
                              type="text"
                              value={ov.linkUrl || ""}
                              onChange={(e) =>
                                updateOverlay(ov.id, { linkUrl: e.target.value })
                              }
                              placeholder="https://example.com"
                              className="w-40 px-2 py-1 text-xs text-slate-800 outline-none"
                            />
                          )}
                          <input
                            type="color"
                            value={ov.color || "#2563eb"}
                            onChange={(e) =>
                              updateOverlay(ov.id, { color: e.target.value })
                            }
                            className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0.5"
                            title="Color"
                          />
                          <button
                            type="button"
                            onClick={handleDuplicateSelected}
                            className="border-l border-sky-200 px-2 py-1 hover:bg-sky-50"
                            title="Duplicate"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={handleDeleteSelected}
                            className="border-l border-sky-200 px-2 py-1 text-red-600 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      {ov.kind === "whiteout" && (
                        <div
                          style={{ backgroundColor: ov.fillColor || "#ffffff" }}
                          className="w-full h-full border border-dashed border-slate-300/60"
                        />
                      )}
                      {ov.kind === "highlight" && (
                        <div
                          style={{ backgroundColor: ov.color || "#facc15" }}
                          className="w-full h-full opacity-40"
                        />
                      )}
                      {ov.kind === "link" && (
                        <div className="w-full h-full border border-sky-500/70 bg-sky-400/15 flex items-center justify-center">
                          <LinkIcon className="h-3.5 w-3.5 text-sky-600 opacity-70" />
                        </div>
                      )}
                      {ov.kind === "strike" && (
                        <div className="w-full h-full flex items-center">
                          <div
                            style={{ backgroundColor: ov.color || "#dc2626" }}
                            className="w-full h-[2px]"
                          />
                        </div>
                      )}
                      {ov.kind === "underline" && (
                        <div className="w-full h-full flex items-end">
                          <div
                            style={{ backgroundColor: ov.color || "#2563eb" }}
                            className="w-full h-[2px]"
                          />
                        </div>
                      )}
                      {ov.kind === "rect" && (
                        <div
                          style={{ borderColor: ov.color, borderWidth: "2px" }}
                          className="w-full h-full"
                        />
                      )}
                      {ov.kind === "ellipse" && (
                        <div
                          style={{ borderColor: ov.color, borderWidth: "2px" }}
                          className="w-full h-full rounded-full"
                        />
                      )}
                      {(ov.kind === "line" || ov.kind === "arrow") && (
                        <div className="w-full h-full flex items-center">
                          <div
                            style={{ backgroundColor: ov.color }}
                            className="w-full h-[2px]"
                          />
                        </div>
                      )}
                      {(ov.kind === "check" ||
                        ov.kind === "cross" ||
                        ov.kind === "dot") && (
                        <div
                          style={{
                            color: ov.color,
                            fontSize: `${14 * displayScale}px`,
                          }}
                          className="font-bold leading-none select-none"
                        >
                          {ov.text}
                        </div>
                      )}
                      {ov.kind === "textfield" && (
                        <input
                          type="text"
                          value={ov.text || ""}
                          onChange={(e) =>
                            updateOverlay(ov.id, { text: e.target.value })
                          }
                          onPointerDown={(e) => e.stopPropagation()}
                          style={{
                            fontSize: `${11 * displayScale}px`,
                            color: ov.color,
                          }}
                          className="w-full h-full border border-sky-400 bg-sky-50/40 px-1 outline-none"
                        />
                      )}
                      {(ov.kind === "image" || ov.kind === "signature") &&
                        ov.dataUrl && (
                          <img
                            src={ov.dataUrl}
                            alt={ov.kind}
                            draggable={false}
                            className="w-full h-full object-contain pointer-events-none"
                          />
                        )}

                      {/* Corner Resize Handle */}
                      {isSel && (
                        <div
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            setDragState({
                              kind: "resize-overlay",
                              targetId: ov.id,
                              startClientX: e.clientX,
                              startClientY: e.clientY,
                              startXPt: ov.xPt,
                              startYPt: ov.yPt,
                              startWPt: ov.wPt,
                              startHPt: ov.hPt,
                              curXPt: ov.xPt,
                              curYPt: ov.yPt,
                              snapshotBefore: { lines, overlays },
                            });
                          }}
                          className="absolute -bottom-1.5 -right-1.5 h-3 w-3 rounded-xs border border-white bg-sky-600 cursor-nwse-resize"
                        />
                      )}
                    </div>
                  );
                })}

                {/* ============================================================ */}
                {/* MODULE 1 & 2: FULL-PAGE LIVE DOM TEXT LINES + MINI-TOOLBAR   */}
                {/* ============================================================ */}
                {currentPageLines.map((ln) => {
                  const isSelected = selectedId === ln.id;
                  const isFindHit =
                    findText.trim().length > 0 &&
                    (matchCase
                      ? ln.text.includes(findText)
                      : ln.text.toLowerCase().includes(findText.toLowerCase()));

                  const leftPx = ln.xPt * displayScale;
                  const topPx = ln.yPt * displayScale;
                  const minWidthPx = Math.max(24, ln.widthPt * displayScale);
                  const fontPx = ln.fontSizePt * displayScale;

                  return (
                    <div
                      key={ln.id}
                      onPointerDown={(e) => {
                        if (activeTool !== "text") return;
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        if (activeTool !== "text") return;
                        e.stopPropagation();
                        if (selectedId !== ln.id) {
                          setSelectedId(ln.id);
                          setOpenDropdown(null);
                        }
                      }}
                      style={{
                        left: `${leftPx}px`,
                        top: `${topPx}px`,
                        minWidth: `${minWidthPx}px`,
                      }}
                      className={`group absolute flex items-center rounded-[2px] transition-shadow ${
                        isSelected
                          ? "z-30 ring-1 ring-sky-400/90 bg-sky-50/10"
                          : isFindHit
                            ? "z-25 bg-amber-300/40 ring-1 ring-amber-500"
                            : activeTool === "text"
                              ? "z-10 hover:ring-1 hover:ring-sky-300/80"
                              : "z-10 pointer-events-none"
                      }`}
                    >
                      {/* ====================================================== */}
                      {/* MODULE 2: SEJDA FLOATING CONTEXT MINI-TOOLBAR          */}
                      {/* [ B | I | T↕▾ | Aa▾ | 🎨▾ | 🔗 | ✥ | ❐ | 🗑 ]          */}
                      {/* ====================================================== */}
                      {isSelected && (
                        <div
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute -top-9 left-0 z-50 flex items-center rounded-[5px] border border-sky-400/90 bg-white shadow-md text-xs text-sky-700 select-none whitespace-nowrap"
                        >
                          {/* Bold */}
                          <button
                            type="button"
                            onClick={() =>
                              updateLine(ln.id, { isBold: !ln.isBold })
                            }
                            className={`px-2.5 py-1.5 font-serif font-bold transition-colors ${
                              ln.isBold
                                ? "bg-sky-100 text-sky-900"
                                : "hover:bg-sky-50"
                            }`}
                            title="Bold"
                          >
                            B
                          </button>

                          {/* Italic */}
                          <button
                            type="button"
                            onClick={() =>
                              updateLine(ln.id, { isItalic: !ln.isItalic })
                            }
                            className={`border-l border-sky-200 px-2.5 py-1.5 font-serif italic transition-colors ${
                              ln.isItalic
                                ? "bg-sky-100 text-sky-900"
                                : "hover:bg-sky-50"
                            }`}
                            title="Italic"
                          >
                            I
                          </button>

                          {/* Font Size (T↕ ▾) */}
                          <div className="relative border-l border-sky-200">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenDropdown(
                                  openDropdown === "line-size" ? null : "line-size"
                                )
                              }
                              className="inline-flex items-center gap-0.5 px-2 py-1.5 hover:bg-sky-50 font-medium"
                              title="Font size"
                            >
                              <span>T↕</span>
                              <ChevronDown className="h-3 w-3 opacity-70" />
                            </button>
                            {openDropdown === "line-size" && (
                              <div className="absolute left-0 top-full mt-1 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-2 shadow-xl z-50">
                                <input
                                  type="number"
                                  min={6}
                                  max={72}
                                  step={0.5}
                                  value={ln.fontSizePt}
                                  onChange={(e) =>
                                    updateLine(ln.id, {
                                      fontSizePt: Math.max(
                                        6,
                                        Math.min(72, Number(e.target.value) || 11)
                                      ),
                                    })
                                  }
                                  className="w-16 rounded border border-slate-300 px-1.5 py-1 font-mono text-xs text-slate-900"
                                />
                                <span className="text-[11px] text-slate-500">pt</span>
                              </div>
                            )}
                          </div>

                          {/* Font Family (Aa ▾) */}
                          <div className="relative border-l border-sky-200">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenDropdown(
                                  openDropdown === "line-font" ? null : "line-font"
                                )
                              }
                              className="inline-flex items-center gap-0.5 px-2 py-1.5 hover:bg-sky-50 font-medium"
                              title="Font family"
                            >
                              <span>Aa</span>
                              <ChevronDown className="h-3 w-3 opacity-70" />
                            </button>
                            {openDropdown === "line-font" && (
                              <div className="absolute left-0 top-full mt-1 w-52 rounded-lg border border-slate-200 bg-white py-1 shadow-xl z-50">
                                {EDITOR_FONTS.map((f) => (
                                  <button
                                    key={f.id}
                                    type="button"
                                    style={{ fontFamily: f.css }}
                                    onClick={() => {
                                      updateLine(ln.id, { fontId: f.id });
                                      setOpenDropdown(null);
                                    }}
                                    className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs text-slate-800 hover:bg-sky-50"
                                  >
                                    <span>{f.label}</span>
                                    {ln.fontId === f.id && (
                                      <Check className="h-3.5 w-3.5 text-sky-600" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Color Swatch (🎨 ▾) */}
                          <div className="relative border-l border-sky-200">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenDropdown(
                                  openDropdown === "line-color"
                                    ? null
                                    : "line-color"
                                )
                              }
                              className="inline-flex items-center gap-1 px-2 py-1.5 hover:bg-sky-50"
                              title="Text color"
                            >
                              <Palette className="h-3.5 w-3.5" />
                              <ChevronDown className="h-3 w-3 opacity-70" />
                            </button>
                            {openDropdown === "line-color" && (
                              <div className="absolute left-0 top-full mt-1 flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-xl z-50">
                                {PRESET_COLORS.map((hex) => (
                                  <button
                                    key={hex}
                                    type="button"
                                    onClick={() => {
                                      updateLine(ln.id, { color: hex });
                                      setOpenDropdown(null);
                                    }}
                                    style={{ backgroundColor: hex }}
                                    className="h-5 w-5 rounded-full border border-slate-300"
                                  />
                                ))}
                                <input
                                  type="color"
                                  value={ln.color}
                                  onChange={(e) =>
                                    updateLine(ln.id, { color: e.target.value })
                                  }
                                  className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
                                />
                              </div>
                            )}
                          </div>

                          {/* Link (🔗) */}
                          <button
                            type="button"
                            onClick={() => {
                              const url = window.prompt(
                                "Enter URL for this text:",
                                ln.linkUrl || "https://"
                              );
                              if (url !== null) {
                                updateLine(ln.id, { linkUrl: url });
                              }
                            }}
                            className="border-l border-sky-200 px-2 py-1.5 hover:bg-sky-50"
                            title="Add link"
                          >
                            <LinkIcon className="h-3.5 w-3.5" />
                          </button>

                          {/* Move Handle (✥) */}
                          <button
                            type="button"
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              setDragState({
                                kind: "move-line",
                                targetId: ln.id,
                                startClientX: e.clientX,
                                startClientY: e.clientY,
                                startXPt: ln.xPt,
                                startYPt: ln.yPt,
                                startWPt: ln.widthPt,
                                startHPt: ln.heightPt,
                                curXPt: ln.xPt,
                                curYPt: ln.yPt,
                                snapshotBefore: { lines, overlays },
                              });
                            }}
                            className="border-l border-sky-200 px-2 py-1.5 hover:bg-sky-50 cursor-move"
                            title="Drag to move text line"
                          >
                            <Move className="h-3.5 w-3.5" />
                          </button>

                          {/* Duplicate (❐) */}
                          <button
                            type="button"
                            onClick={handleDuplicateSelected}
                            className="border-l border-sky-200 px-2 py-1.5 hover:bg-sky-50"
                            title="Duplicate text"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete (🗑) */}
                          <button
                            type="button"
                            onClick={handleDeleteSelected}
                            className="border-l border-sky-200 px-2 py-1.5 text-red-600 hover:bg-red-50"
                            title="Delete text line"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Live Auto-Expanding In-Place Text Input (100% Unified Rendering!) */}
                      <div className="inline-grid items-center">
                        <span
                          aria-hidden="true"
                          style={{
                            fontFamily: getFontCss(ln.fontId),
                            fontSize: `${fontPx}px`,
                            fontWeight: ln.isBold ? 700 : 400,
                            fontStyle: ln.isItalic ? "italic" : "normal",
                            lineHeight: 1.15,
                          }}
                          className="invisible col-start-1 row-start-1 whitespace-pre pr-1 pointer-events-none select-none"
                        >
                          {ln.text || " "}
                        </span>
                        <input
                          type="text"
                          spellCheck={false}
                          value={ln.text}
                          onFocus={() => {
                            if (selectedId !== ln.id) {
                              setSelectedId(ln.id);
                            }
                            if (ln.isNew && ln.text === "Type your text") {
                              updateLine(ln.id, { text: "" }, false);
                            }
                          }}
                          onChange={(e) =>
                            updateLine(ln.id, { text: e.target.value })
                          }
                          style={{
                            fontFamily: getFontCss(ln.fontId),
                            fontSize: `${fontPx}px`,
                            fontWeight: ln.isBold ? 700 : 400,
                            fontStyle: ln.isItalic ? "italic" : "normal",
                            color: ln.color,
                            lineHeight: 1.15,
                            WebkitFontSmoothing: "antialiased",
                          }}
                          className="col-start-1 row-start-1 w-full min-w-full bg-transparent p-0 m-0 outline-none border-0 selection:bg-sky-500/25"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ================================================================ */}
            {/* MODULE 4: SEJDA STICKY BOTTOM "APPLY CHANGES >" BAR              */}
            {/* ================================================================ */}
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl bg-[#fde6cc]/95 dark:bg-slate-900/95 p-2 shadow-xl border border-amber-200/80">
              <button
                type="button"
                onClick={handleApplyChanges}
                disabled={isApplying}
                className="inline-flex items-center gap-2 rounded-lg bg-[#00b050] hover:bg-[#009a46] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing PDF...</span>
                  </>
                ) : (
                  <>
                    <span>Apply changes</span>
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {readyDownloadBlob && (
                <button
                  type="button"
                  onClick={() =>
                    downloadBlob(readyDownloadBlob.bytes, readyDownloadBlob.name)
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download ({readyDownloadBlob.name})</span>
                </button>
              )}
            </div>

            {/* ================================================================ */}
            {/* SIGNATURE PAD MODAL (DRAW OR TYPE CURSIVE SIGNATURE)             */}
            {/* ================================================================ */}
            {showSignModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs">
                <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <PenTool className="h-4 w-4 text-sky-600" />
                      <span>Create Signature</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowSignModal(false)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setSignMode("draw")}
                      className={`flex-1 rounded-lg py-1.5 font-semibold ${
                        signMode === "draw"
                          ? "bg-sky-600 text-white"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      Draw Signature
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignMode("type")}
                      className={`flex-1 rounded-lg py-1.5 font-semibold ${
                        signMode === "type"
                          ? "bg-sky-600 text-white"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      Type Signature
                    </button>
                  </div>

                  {signMode === "draw" ? (
                    <div className="space-y-2">
                      <canvas
                        ref={signPadCanvasRef}
                        width={400}
                        height={140}
                        onPointerDown={(e) => {
                          const c = signPadCanvasRef.current;
                          if (!c) return;
                          isDrawingSignRef.current = true;
                          const r = c.getBoundingClientRect();
                          const ctx = c.getContext("2d")!;
                          ctx.strokeStyle = signColor;
                          ctx.lineWidth = 2.8;
                          ctx.lineCap = "round";
                          ctx.beginPath();
                          ctx.moveTo(e.clientX - r.left, e.clientY - r.top);
                        }}
                        onPointerMove={(e) => {
                          if (!isDrawingSignRef.current || !signPadCanvasRef.current)
                            return;
                          const c = signPadCanvasRef.current;
                          const r = c.getBoundingClientRect();
                          const ctx = c.getContext("2d")!;
                          ctx.lineTo(e.clientX - r.left, e.clientY - r.top);
                          ctx.stroke();
                        }}
                        onPointerUp={() => {
                          isDrawingSignRef.current = false;
                        }}
                        className="w-full h-36 rounded-xl border border-slate-300 bg-slate-50 cursor-crosshair"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const c = signPadCanvasRef.current;
                          if (c) {
                            c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
                          }
                        }}
                        className="text-xs text-slate-500 hover:text-slate-800 underline"
                      >
                        Clear pad
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={typedSignature}
                      onChange={(e) => setTypedSignature(e.target.value)}
                      placeholder="Type your full name..."
                      style={{
                        fontFamily: '"Dancing Script", cursive',
                        color: signColor,
                      }}
                      className="w-full rounded-xl border border-slate-300 px-4 py-4 text-3xl outline-none focus:border-sky-500"
                    />
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1.5">
                      {(["#0f172a", "#1d4ed8", "#dc2626"] as const).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setSignColor(c)}
                          style={{ backgroundColor: c }}
                          className={`h-6 w-6 rounded-full border-2 ${
                            signColor === c ? "border-sky-500 scale-110" : "border-white"
                          }`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowSignModal(false)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handlePlaceSignature}
                        className="rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-sky-500"
                      >
                        Place Signature
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
                {errorMessage}
              </div>
            )}
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
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
  Sparkles,
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
} from "lucide-react";

export type PdfFontFamily = "sans" | "serif" | "mono";
export type MaskBgMode = "auto" | "white" | "cream" | "black" | "transparent" | "custom";
export type TextAlignMode = "left" | "center" | "right";

export interface TextBlockItem {
  id: string;
  pageNumber: number;
  originalText: string;
  currentText: string;
  isNew: boolean;
  isWhiteoutOnly?: boolean;
  // Original PDF coordinates in percentages (top-left origin, 0–100)
  origXPercent: number;
  origYPercent: number;
  origWidthPercent: number;
  origHeightPercent: number;
  // Current interactive coordinates (top-left origin, 0–100)
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  // Baseline position from top in points (for accurate baseline alignment)
  baselinePt: number;
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
  sans: "Inter, Helvetica, Arial, system-ui, -apple-system, sans-serif",
  serif: '"Times New Roman", Times, Georgia, Cambria, serif',
  mono: '"Courier New", Courier, Consolas, Menlo, monospace',
};

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

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function sampleCanvasColorsForBox(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  boxXPx: number,
  boxYPx: number,
  boxWPx: number,
  boxHPx: number
): { autoBgHex: string; autoFgHex: string } {
  try {
    const pad = 3;
    const sx = Math.max(0, Math.floor(boxXPx - pad));
    const sy = Math.max(0, Math.floor(boxYPx - pad));
    const sw = Math.min(canvasW - sx, Math.ceil(boxWPx + pad * 2));
    const sh = Math.min(canvasH - sy, Math.ceil(boxHPx + pad * 2));

    if (sw <= 2 || sh <= 2) {
      return { autoBgHex: "#ffffff", autoFgHex: "#0f172a" };
    }

    const imgData = ctx.getImageData(sx, sy, sw, sh).data;
    const edgeR: number[] = [];
    const edgeG: number[] = [];
    const edgeB: number[] = [];

    for (let x = 0; x < sw; x += 2) {
      for (const y of [0, 1, sh - 2, sh - 1]) {
        if (y >= 0 && y < sh) {
          const idx = (y * sw + x) * 4;
          edgeR.push(imgData[idx]);
          edgeG.push(imgData[idx + 1]);
          edgeB.push(imgData[idx + 2]);
        }
      }
    }

    let bgR = 255;
    let bgG = 255;
    let bgB = 255;
    if (edgeR.length > 0) {
      edgeR.sort((a, b) => a - b);
      edgeG.sort((a, b) => a - b);
      edgeB.sort((a, b) => a - b);
      const mid = Math.floor(edgeR.length / 2);
      bgR = edgeR[mid];
      bgG = edgeG[mid];
      bgB = edgeB[mid];
    }

    let bestFgR = 15;
    let bestFgG = 23;
    let bestFgB = 42;
    let maxDist = 0;

    for (let y = 2; y < sh - 2; y += 2) {
      for (let x = 2; x < sw - 2; x += 2) {
        const idx = (y * sw + x) * 4;
        const r = imgData[idx];
        const g = imgData[idx + 1];
        const b = imgData[idx + 2];
        const dist = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
        if (dist > maxDist && dist > 80) {
          maxDist = dist;
          bestFgR = r;
          bestFgG = g;
          bestFgB = b;
        }
      }
    }

    return {
      autoBgHex: rgbToHex(bgR, bgG, bgB),
      autoFgHex: rgbToHex(bestFgR, bestFgG, bestFgB),
    };
  } catch {
    return { autoBgHex: "#ffffff", autoFgHex: "#0f172a" };
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

export default function EditPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pdfDocProxy, setPdfDocProxy] = useState<any>(null);

  const [textBlocks, setTextBlocks] = useState<TextBlockItem[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // Undo / Redo
  const [historyPast, setHistoryPast] = useState<TextBlockItem[][]>([]);
  const [historyFuture, setHistoryFuture] = useState<TextBlockItem[][]>([]);

  // Find & Replace
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [caseSensitiveFind, setCaseSensitiveFind] = useState(false);

  // Viewport & Zoom
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [previewCleanMode, setPreviewCleanMode] = useState<boolean>(false);
  const [pageBaseSizePt, setPageBaseSizePt] = useState<{ width: number; height: number }>({
    width: 612,
    height: 792,
  });
  const [containerCssWidth, setContainerCssWidth] = useState<number>(612);

  const [isRenderingPage, setIsRenderingPage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const extractedPagesRef = useRef<Set<number>>(new Set());
  const colorSampledPagesRef = useRef<Set<number>>(new Set());

  // Dragging & Resizing
  const [interactionMode, setInteractionMode] = useState<"none" | "drag" | "resize">("none");
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

  const pageContainerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = pageContainerRef.current;
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
   * Deterministic 2-Pass Line Extraction:
   * Pass 1: Maps user-space coordinates accurately via viewport.convertToViewportPoint.
   * Pass 2: Groups into baseline bands and strictly sorts left-to-right to prevent scrambling.
   */
  const extractTextBlocksFromPage = useCallback(
    async (
      pdf: any,
      pageNum: number,
      canvasCtx?: CanvasRenderingContext2D | null,
      canvasW?: number,
      canvasH?: number,
      renderScale: number = 1.5
    ): Promise<TextBlockItem[]> => {
      const page = await pdf.getPage(pageNum);
      const baseViewport = page.getViewport({ scale: 1.0 });
      const pageW = baseViewport.width;
      const pageH = baseViewport.height;

      const textContent = await page.getTextContent();
      const rawItems: any[] = textContent.items || [];
      const stylesDict: Record<string, any> = textContent.styles || {};

      interface RawFragment {
        text: string;
        x: number;
        baselineY: number;
        yTop: number;
        w: number;
        h: number;
        fontSize: number;
        fontFamily: PdfFontFamily;
        isBold: boolean;
        isItalic: boolean;
      }

      const fragments: RawFragment[] = [];

      for (const item of rawItems) {
        if (!item.str || !item.str.trim()) continue;

        // Viewport coordinate transformation (Top-Left origin)
        const [vx, vy] = baseViewport.convertToViewportPoint(item.transform[4], item.transform[5]);

        const fontScaleX = Math.hypot(item.transform[0], item.transform[1]);
        const fontScaleY = Math.hypot(item.transform[2], item.transform[3]);
        const fontSize = Math.max(7, Math.round(fontScaleY || fontScaleX || 12));

        const itemW = item.width || item.str.length * (fontSize * 0.52);
        const ascent = fontSize * 0.82;
        const descent = fontSize * 0.28;
        const itemH = ascent + descent;
        const yTop = vy - ascent;

        const styleObj = stylesDict[item.fontName] || {};
        let rawFontMeta = `${item.fontName || ""} ${styleObj.fontFamily || ""}`;
        try {
          if (page.commonObjs?.has?.(item.fontName)) {
            const fObj = page.commonObjs.get(item.fontName);
            if (fObj?.name) rawFontMeta += ` ${fObj.name}`;
          }
        } catch {}

        const lowerFont = rawFontMeta.toLowerCase();
        let fontFamily: PdfFontFamily = "sans";
        if (/mono|courier|consolas|menlo|fixed|typewriter|code/.test(lowerFont)) {
          fontFamily = "mono";
        } else if (
          /serif|times|georgia|garamond|cambria|palatino|mincho|baskerville/.test(lowerFont) &&
          !/sans/.test(lowerFont)
        ) {
          fontFamily = "serif";
        }

        const isBold = /bold|black|heavy|demi|semibold|extrabold|-bd|700|800|900/.test(lowerFont);
        const isItalic =
          /italic|oblique|slanted|-it/.test(lowerFont) ||
          Math.abs(item.transform[2]) > 0.08 * fontSize;

        fragments.push({
          text: item.str,
          x: vx,
          baselineY: vy,
          yTop,
          w: Math.max(itemW, fontSize * 0.5),
          h: itemH,
          fontSize,
          fontFamily,
          isBold,
          isItalic,
        });
      }

      // Step A: Sort strictly by baseline Y (transitive, no cycles)
      fragments.sort((a, b) => a.baselineY - b.baselineY);

      // Step B: Cluster fragments that share a line baseline
      const lines: RawFragment[][] = [];
      for (const frag of fragments) {
        let placed = false;
        for (const line of lines) {
          const rep = line[0];
          const fontTolerance = Math.min(rep.fontSize, frag.fontSize) * 0.35;
          if (Math.abs(rep.baselineY - frag.baselineY) <= Math.max(3, fontTolerance)) {
            line.push(frag);
            placed = true;
            break;
          }
        }
        if (!placed) {
          lines.push([frag]);
        }
      }

      // Step C: Sort lines top-to-bottom
      lines.sort((l1, l2) => l1[0].baselineY - l2[0].baselineY);

      // Step D: Sort words strictly left-to-right within each line and merge phrases
      const mergedLines: RawFragment[] = [];
      for (const line of lines) {
        line.sort((a, b) => a.x - b.x);

        let current = { ...line[0] };
        for (let i = 1; i < line.length; i++) {
          const next = line[i];
          const gap = next.x - (current.x + current.w);
          const maxGap = Math.max(current.fontSize, next.fontSize) * 2.2;

          if (gap >= -current.fontSize * 0.4 && gap < maxGap) {
            const needsSpace =
              gap > current.fontSize * 0.12 &&
              !current.text.endsWith(" ") &&
              !next.text.startsWith(" ");
            current.text += (needsSpace ? " " : "") + next.text;
            current.w = next.x + next.w - current.x;
            current.h = Math.max(current.h, next.h);
            current.yTop = Math.min(current.yTop, next.yTop);
            current.fontSize = Math.max(current.fontSize, next.fontSize);
          } else {
            mergedLines.push(current);
            current = { ...next };
          }
        }
        mergedLines.push(current);
      }

      return mergedLines.map((ln, idx) => {
        let autoBgHex = "#ffffff";
        let autoFgHex = "#0f172a";

        if (canvasCtx && canvasW && canvasH) {
          const sampled = sampleCanvasColorsForBox(
            canvasCtx,
            canvasW,
            canvasH,
            ln.x * renderScale,
            ln.yTop * renderScale,
            ln.w * renderScale,
            ln.h * renderScale
          );
          autoBgHex = sampled.autoBgHex;
          autoFgHex = sampled.autoFgHex;
        }

        const xPct = Math.max(0, Math.min(96, (ln.x / pageW) * 100));
        const yPct = Math.max(0, Math.min(96, (ln.yTop / pageH) * 100));
        const wPct = Math.max(2, Math.min(100 - xPct, ((ln.w + 4) / pageW) * 100));
        const hPct = Math.max(1.5, ((ln.h + 2) / pageH) * 100);

        return {
          id: `p${pageNum}_txt_${idx}`,
          pageNumber: pageNum,
          originalText: ln.text,
          currentText: ln.text,
          isNew: false,
          origXPercent: xPct,
          origYPercent: yPct,
          origWidthPercent: wPct,
          origHeightPercent: hPct,
          xPercent: xPct,
          yPercent: yPct,
          widthPercent: wPct,
          heightPercent: hPct,
          baselinePt: ln.baselineY,
          fontSizePt: ln.fontSize,
          fontFamily: ln.fontFamily,
          color: autoFgHex,
          isBold: ln.isBold,
          isItalic: ln.isItalic,
          textAlign: "left",
          maskBg: "auto",
          autoBgHex,
          customMaskHex: autoBgHex,
        };
      });
    },
    []
  );

  const handleFileSelected = async (files: File[]) => {
    const selected = files[0];
    if (!selected) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setFile(selected);
    setCurrentPage(1);
    setTextBlocks([]);
    setHistoryPast([]);
    setHistoryFuture([]);
    setSelectedBlockId(null);
    extractedPagesRef.current = new Set();
    colorSampledPagesRef.current = new Set();

    try {
      const pdfjs = await loadPdfJs();
      const buffer = await selected.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: buffer }).promise;
      setPdfDocProxy(pdf);
      setTotalPages(pdf.numPages);

      // Pre-extract other pages for global Find & Replace
      if (pdf.numPages > 1) {
        (async () => {
          const otherBlocks: TextBlockItem[] = [];
          for (let p = 2; p <= Math.min(pdf.numPages, 50); p++) {
            if (extractedPagesRef.current.has(p)) continue;
            extractedPagesRef.current.add(p);
            try {
              const pBlocks = await extractTextBlocksFromPage(pdf, p);
              otherBlocks.push(...pBlocks);
            } catch {}
          }
          if (otherBlocks.length > 0) {
            setTextBlocks((prev) => {
              const existingPages = new Set(prev.map((b) => b.pageNumber));
              return [...prev, ...otherBlocks.filter((b) => !existingPages.has(b.pageNumber))];
            });
          }
        })();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load PDF document.");
      setFile(null);
    }
  };

  const renderAndExtractPage = useCallback(
    async (pageNum: number) => {
      if (!pdfDocProxy || !pdfCanvasRef.current) return;

      setIsRenderingPage(true);
      try {
        const page = await pdfDocProxy.getPage(pageNum);
        const canvas = pdfCanvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const baseViewport = page.getViewport({ scale: 1.0 });
        setPageBaseSizePt({
          width: baseViewport.width,
          height: baseViewport.height,
        });

        const RENDER_SCALE = 1.5;
        const viewport = page.getViewport({ scale: RENDER_SCALE });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport }).promise;

        if (!extractedPagesRef.current.has(pageNum)) {
          extractedPagesRef.current.add(pageNum);
          colorSampledPagesRef.current.add(pageNum);
          const pageBlocks = await extractTextBlocksFromPage(
            pdfDocProxy,
            pageNum,
            ctx,
            canvas.width,
            canvas.height,
            RENDER_SCALE
          );
          setTextBlocks((old) => [
            ...old.filter((b) => b.pageNumber !== pageNum || b.isNew),
            ...pageBlocks,
          ]);
        } else if (!colorSampledPagesRef.current.has(pageNum)) {
          colorSampledPagesRef.current.add(pageNum);
          setTextBlocks((old) =>
            old.map((b) => {
              if (b.pageNumber !== pageNum || b.isNew) return b;
              const sampled = sampleCanvasColorsForBox(
                ctx,
                canvas.width,
                canvas.height,
                (b.origXPercent / 100) * canvas.width,
                (b.origYPercent / 100) * canvas.height,
                (b.origWidthPercent / 100) * canvas.width,
                (b.origHeightPercent / 100) * canvas.height
              );
              return {
                ...b,
                autoBgHex: sampled.autoBgHex,
                customMaskHex: sampled.autoBgHex,
                color: b.color === "#0f172a" ? sampled.autoFgHex : b.color,
              };
            })
          );
        }
      } catch (err) {
        console.error("Failed to render/extract PDF page:", err);
      } finally {
        setIsRenderingPage(false);
      }
    },
    [pdfDocProxy, extractTextBlocksFromPage]
  );

  useEffect(() => {
    if (pdfDocProxy) {
      renderAndExtractPage(currentPage);
    }
  }, [pdfDocProxy, currentPage, renderAndExtractPage]);

  const handleUpdateBlock = useCallback(
    (id: string, patch: Partial<TextBlockItem>, recordHistory = false) => {
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
      origXPercent: 20,
      origYPercent: 20,
      origWidthPercent: 30,
      origHeightPercent: 4,
      xPercent: 20,
      yPercent: 20,
      widthPercent: 30,
      heightPercent: 4,
      baselinePt: (20 / 100) * pageBaseSizePt.height + 12,
      fontSizePt: 14,
      fontFamily: "sans",
      color: "#0f172a",
      isBold: false,
      isItalic: false,
      textAlign: "left",
      maskBg: "transparent",
      autoBgHex: "#ffffff",
      customMaskHex: "#ffffff",
    };
    setTextBlocks((prev) => [...prev, newBlock]);
    setSelectedBlockId(newId);
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
      origXPercent: 25,
      origYPercent: 30,
      origWidthPercent: 25,
      origHeightPercent: 5,
      xPercent: 25,
      yPercent: 30,
      widthPercent: 25,
      heightPercent: 5,
      baselinePt: (30 / 100) * pageBaseSizePt.height + 12,
      fontSizePt: 12,
      fontFamily: "sans",
      color: "#0f172a",
      isBold: false,
      isItalic: false,
      textAlign: "left",
      maskBg: "white",
      autoBgHex: "#ffffff",
      customMaskHex: "#ffffff",
    };
    setTextBlocks((prev) => [...prev, newBlock]);
    setSelectedBlockId(newId);
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
      setSelectedBlockId(null);
    },
    [pushUndoSnapshot, textBlocks]
  );

  const handleRestoreOriginalBlock = (id: string) => {
    pushUndoSnapshot(textBlocks);
    setTextBlocks((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              currentText: b.originalText,
              xPercent: b.origXPercent,
              yPercent: b.origYPercent,
              widthPercent: b.origWidthPercent,
              heightPercent: b.origHeightPercent,
            }
          : b
      )
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

    let count = 0;
    pushUndoSnapshot(textBlocks);
    setTextBlocks((prev) =>
      prev.map((b) => {
        if (b.isWhiteoutOnly || !b.currentText) return b;
        if (scope === "page" && b.pageNumber !== currentPage) return b;
        if (!regex.test(b.currentText)) return b;
        count++;
        return { ...b, currentText: b.currentText.replace(regex, replaceQuery) };
      })
    );

    if (count > 0) {
      setSuccessMessage(
        `Replaced ${count} occurrence(s) of "${findQuery}" with "${replaceQuery}".`
      );
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    if (!file) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const isInput = ["input", "textarea"].includes(
        document.activeElement?.tagName.toLowerCase() || ""
      );

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        if (!isInput) {
          e.preventDefault();
          if (e.shiftKey) handleRedo();
          else handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        if (!isInput) {
          e.preventDefault();
          handleRedo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setShowFindReplace((v) => !v);
      } else if (e.key === "Escape") {
        setSelectedBlockId(null);
      } else if ((e.key === "Delete" || e.key === "Backspace") && !isInput && selectedBlockId) {
        const blk = textBlocks.find((b) => b.id === selectedBlockId);
        if (blk) {
          e.preventDefault();
          handleDeleteOrClearBlock(blk);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [file, selectedBlockId, textBlocks, handleUndo, handleRedo, handleDeleteOrClearBlock]);

  // Pointer drag & resize
  const handleStartInteraction = (
    block: TextBlockItem,
    mode: "drag" | "resize",
    e: React.PointerEvent
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedBlockId(block.id);
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
    if (interactionMode === "none") return;

    const handleMove = (e: PointerEvent) => {
      if (!interactionRef.current || !pageContainerRef.current) return;
      const rect = pageContainerRef.current.getBoundingClientRect();
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
          prev.map((b) =>
            b.id === targetId ? { ...b, widthPercent: newW, heightPercent: newH } : b
          )
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

  /**
   * High-DPI Replacement Canvas Stamp with accurate typography rendering
   */
  const renderReplacementTextToPng = (
    block: TextBlockItem,
    boxWidthPt: number,
    boxHeightPt: number
  ): { dataUrl: string; widthPt: number; heightPt: number } => {
    const SCALE = 3;
    const measureCanvas = document.createElement("canvas");
    const mCtx = measureCanvas.getContext("2d")!;
    const fontPx = Math.max(8, block.fontSizePt) * SCALE;
    const fontStylePrefix = `${block.isItalic ? "italic " : ""}${block.isBold ? "bold " : ""}`;
    const fontSpec = `${fontStylePrefix}${fontPx}px ${FONT_CSS_MAP[block.fontFamily]}`;
    mCtx.font = fontSpec;

    const measuredW = mCtx.measureText(block.currentText).width + 6 * SCALE;
    const finalW = Math.max(boxWidthPt * SCALE, measuredW);
    const finalH = Math.max(boxHeightPt * SCALE, fontPx * 1.25);

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(finalW);
    canvas.height = Math.ceil(finalH);
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const isRTL = /[\u0600-\u06FF]/.test(block.currentText);
    ctx.direction = isRTL ? "rtl" : "ltr";
    ctx.font = fontSpec;
    ctx.fillStyle = block.color;
    ctx.textBaseline = "alphabetic";

    const baselineY = fontPx * 0.85;

    if (isRTL || block.textAlign === "right") {
      ctx.textAlign = "right";
      ctx.fillText(block.currentText, canvas.width - 2 * SCALE, baselineY);
    } else if (block.textAlign === "center") {
      ctx.textAlign = "center";
      ctx.fillText(block.currentText, canvas.width / 2, baselineY);
    } else {
      ctx.textAlign = "left";
      ctx.fillText(block.currentText, 2 * SCALE, baselineY);
    }

    return {
      dataUrl: canvas.toDataURL("image/png"),
      widthPt: canvas.width / SCALE,
      heightPt: canvas.height / SCALE,
    };
  };

  const isBlockModified = (b: TextBlockItem): boolean =>
    b.isNew ||
    b.currentText !== b.originalText ||
    Math.abs(b.xPercent - b.origXPercent) > 0.1 ||
    Math.abs(b.yPercent - b.origYPercent) > 0.1 ||
    Math.abs(b.widthPercent - b.origWidthPercent) > 0.1 ||
    Math.abs(b.heightPercent - b.origHeightPercent) > 0.1;

  const modifiedBlocks = textBlocks.filter(isBlockModified);

  const handleSaveEditedPdf = async () => {
    if (!file) return;
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: false });
      const pages = pdfDoc.getPages();

      for (const block of modifiedBlocks) {
        const pageIdx = block.pageNumber - 1;
        if (pageIdx < 0 || pageIdx >= pages.length) continue;
        const page = pages[pageIdx];
        const { width: pageW, height: pageH } = page.getSize();
        const maskHex = resolveMaskHex(block);

        // 1. Mask out original text (Bottom-Left origin in pdf-lib)
        if (!block.isNew && maskHex !== "transparent") {
          const origW = (block.origWidthPercent / 100) * pageW;
          const origH = (block.origHeightPercent / 100) * pageH;
          const origX = (block.origXPercent / 100) * pageW;
          const origYBottom = pageH - ((block.origYPercent + block.origHeightPercent) / 100) * pageH;
          const { r, g, b } = hexToRgbComponents(maskHex);

          page.drawRectangle({
            x: Math.max(0, origX - 1.5),
            y: Math.max(0, origYBottom - 1.5),
            width: origW + 3,
            height: origH + 3,
            color: rgb(r, g, b),
          });
        }

        // 2. Render new text or whiteout box
        const curW = (block.widthPercent / 100) * pageW;
        const curH = (block.heightPercent / 100) * pageH;
        const curX = (block.xPercent / 100) * pageW;
        const curYBottom = pageH - ((block.yPercent + block.heightPercent) / 100) * pageH;

        if (block.isWhiteoutOnly) {
          const fillHex = maskHex === "transparent" ? "#ffffff" : maskHex;
          const { r, g, b } = hexToRgbComponents(fillHex);
          page.drawRectangle({
            x: Math.max(0, curX),
            y: Math.max(0, curYBottom),
            width: curW,
            height: curH,
            color: rgb(r, g, b),
          });
        } else if (block.currentText.trim()) {
          const rendered = renderReplacementTextToPng(block, curW, curH);
          const drawY = pageH - (block.yPercent / 100) * pageH - rendered.heightPt;

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

          const pngBytes = dataUrlToBytes(rendered.dataUrl);
          const pngImg = await pdfDoc.embedPng(pngBytes);

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
      setSuccessMessage(`Saved ${modifiedBlocks.length} edit(s) into "${outName}".`);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to save edited PDF.");
    } finally {
      setIsSaving(false);
    }
  };

  const currentPageBlocks = textBlocks.filter((b) => b.pageNumber === currentPage);
  const detectedExistingLinesOnPage = currentPageBlocks.filter((b) => !b.isNew).length;
  const selectedBlock = textBlocks.find((b) => b.id === selectedBlockId) || null;
  const displayScale = pageBaseSizePt.width > 0 ? containerCssWidth / pageBaseSizePt.width : 1.15;

  return (
    <ToolLayout
      title="Edit PDF Text Online"
      description="Click any existing text in your PDF to edit, replace, or delete it in-place with automatic font and background color matching. Includes Find & Replace, Undo/Redo, freeform text, and redaction—100% private in your browser."
      faqs={[
        {
          question: "How does automatic font and background matching work?",
          answer:
            "When you open a PDF, our engine inspects the embedded font family (Sans-Serif, Serif, or Monospace), weight (Bold/Italic), and size, and samples the exact pixel color around each line so edits inside shaded tables or cream paper blend seamlessly.",
        },
        {
          question: "Can I Find and Replace text across the entire PDF?",
          answer:
            "Yes! Click the 'Find & Replace' button (or press Ctrl+F / ⌘F) to search for any name, date, or number and replace it on the current page or across all pages in one click.",
        },
        {
          question: "Does this PDF text editor support Arabic, Russian, and accented characters?",
          answer:
            "Yes. Replacement text is rendered using a 300-DPI Unicode graphics layer, so English, French, Spanish, Russian (Cyrillic), and Arabic (RTL) scripts embed cleanly without font encoding errors.",
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
            description="Click any sentence, number, date, or heading inside your PDF to modify it in-place with auto-matched fonts and background colors."
          />
        )}

        {file && (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900/60">
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-400">
                  <FileEdit className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-xs">
                    {file.name}
                  </h2>
                  <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    Page {currentPage} of {totalPages} •{" "}
                    <span className="text-rose-600 dark:text-rose-400 font-bold">
                      {detectedExistingLinesOnPage} existing lines
                    </span>
                    {modifiedBlocks.length > 0 && (
                      <span className="ml-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                        ({modifiedBlocks.length} edited)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-0.5">
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={historyPast.length === 0}
                    title="Undo (Ctrl+Z)"
                    className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                  >
                    <Undo2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRedo}
                    disabled={historyFuture.length === 0}
                    title="Redo (Ctrl+Y)"
                    className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                  >
                    <Redo2 className="h-4 w-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowFindReplace((v) => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                    showFindReplace
                      ? "border-rose-600 bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  }`}
                >
                  <Search className="h-3.5 w-3.5 text-rose-600" />
                  <span>Find & Replace</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddFreeText}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-all"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ Add Text</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddWhiteoutBox}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <Eraser className="h-3.5 w-3.5 text-rose-600" />
                  <span>+ Whiteout / Redact</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPreviewCleanMode((v) => !v);
                    setSelectedBlockId(null);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                    previewCleanMode
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  }`}
                >
                  {previewCleanMode ? <EyeOff className="h-3.5 w-3.5 text-emerald-600" /> : <Eye className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">{previewCleanMode ? "Exit Preview" : "Preview"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setTextBlocks([]);
                    setSelectedBlockId(null);
                  }}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-2.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Close</span>
                </button>
              </div>
            </div>

            {/* Find & Replace Drawer */}
            {showFindReplace && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800">
                    <Search className="h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={findQuery}
                      onChange={(e) => setFindQuery(e.target.value)}
                      placeholder="Find text in PDF..."
                      className="w-36 sm:w-44 bg-transparent text-xs text-slate-900 dark:text-white outline-none"
                    />
                    {findQuery && (
                      <span className="rounded bg-rose-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                        {matchingBlocks.length} match{matchingBlocks.length === 1 ? "" : "es"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800">
                    <Replace className="h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={replaceQuery}
                      onChange={(e) => setReplaceQuery(e.target.value)}
                      placeholder="Replace with..."
                      className="w-36 sm:w-44 bg-transparent text-xs text-slate-900 dark:text-white outline-none"
                    />
                  </div>

                  <label className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400 cursor-pointer select-none px-1">
                    <input
                      type="checkbox"
                      checked={caseSensitiveFind}
                      onChange={(e) => setCaseSensitiveFind(e.target.checked)}
                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    <span>Match case</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={matchingBlocks.length === 0}
                    onClick={() => handleReplaceMatches("page")}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    Replace Page
                  </button>
                  <button
                    type="button"
                    disabled={matchingBlocks.length === 0}
                    onClick={() => handleReplaceMatches("all")}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 font-bold text-white hover:bg-rose-500 disabled:opacity-40"
                  >
                    Replace All ({matchingBlocks.length})
                  </button>
                </div>
              </div>
            )}

            {/* Typography & Background Mask Inspector */}
            {selectedBlock ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs dark:border-rose-900/50 dark:bg-rose-950/30">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1">
                    <Type className="h-3.5 w-3.5" />
                    <span>{selectedBlock.isWhiteoutOnly ? "Whiteout / Redact:" : "Typography:"}</span>
                  </span>

                  {!selectedBlock.isWhiteoutOnly && (
                    <>
                      <select
                        value={selectedBlock.fontFamily}
                        onChange={(e) =>
                          handleUpdateBlock(selectedBlock.id, {
                            fontFamily: e.target.value as PdfFontFamily,
                          }, true)
                        }
                        aria-label="Font Family"
                        className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="sans">Sans-Serif (Helvetica / Inter)</option>
                        <option value="serif">Serif (Times / Georgia)</option>
                        <option value="mono">Monospace (Courier)</option>
                      </select>

                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">Size:</span>
                        <input
                          type="number"
                          min={6}
                          max={72}
                          value={selectedBlock.fontSizePt}
                          onChange={(e) =>
                            handleUpdateBlock(selectedBlock.id, {
                              fontSizePt: Math.max(6, Math.min(72, Number(e.target.value) || 12)),
                            }, true)
                          }
                          className="w-14 rounded border border-slate-200 bg-white px-2 py-1 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>

                      <div className="inline-flex items-center rounded border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateBlock(selectedBlock.id, { isBold: !selectedBlock.isBold }, true)
                          }
                          title="Bold"
                          className={`px-2 py-1 font-bold ${
                            selectedBlock.isBold
                              ? "bg-rose-600 text-white"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          <Bold className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateBlock(selectedBlock.id, { isItalic: !selectedBlock.isItalic }, true)
                          }
                          title="Italic"
                          className={`px-2 py-1 border-l border-slate-200 dark:border-slate-700 ${
                            selectedBlock.isItalic
                              ? "bg-rose-600 text-white"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          <Italic className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="inline-flex items-center rounded border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
                        {[
                          { id: "left", icon: AlignLeft, label: "Align Left" },
                          { id: "center", icon: AlignCenter, label: "Align Center" },
                          { id: "right", icon: AlignRight, label: "Align Right" },
                        ].map((al) => {
                          const Icon = al.icon;
                          return (
                            <button
                              key={al.id}
                              type="button"
                              onClick={() =>
                                handleUpdateBlock(selectedBlock.id, { textAlign: al.id as TextAlignMode }, true)
                              }
                              title={al.label}
                              className={`px-2 py-1 ${
                                selectedBlock.textAlign === al.id
                                  ? "bg-rose-600 text-white"
                                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                              }`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Ink:</span>
                        {[
                          { hex: "#0f172a", label: "Black / Slate" },
                          { hex: "#1d4ed8", label: "Royal Blue" },
                          { hex: "#dc2626", label: "Crimson Red" },
                          { hex: "#059669", label: "Emerald Green" },
                        ].map((c) => (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() => handleUpdateBlock(selectedBlock.id, { color: c.hex }, true)}
                            style={{ backgroundColor: c.hex }}
                            className={`h-5 w-5 rounded-full border-2 ${
                              selectedBlock.color.toLowerCase() === c.hex ? "border-rose-500 scale-110" : "border-white"
                            }`}
                            title={c.label}
                          />
                        ))}
                        <input
                          type="color"
                          value={selectedBlock.color}
                          onChange={(e) => handleUpdateBlock(selectedBlock.id, { color: e.target.value }, true)}
                          title="Custom Color"
                          className="h-5 w-6 cursor-pointer rounded border border-slate-300 bg-white p-0"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-slate-500">Mask:</span>
                    {[
                      { id: "auto", label: `Auto (${selectedBlock.autoBgHex})` },
                      { id: "white", label: "White" },
                      { id: "cream", label: "Warm" },
                      { id: "black", label: "Redact" },
                      ...(selectedBlock.isNew && !selectedBlock.isWhiteoutOnly
                        ? [{ id: "transparent" as const, label: "None" }]
                        : []),
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleUpdateBlock(selectedBlock.id, { maskBg: m.id as MaskBgMode }, true)}
                        className={`rounded border px-2 py-0.5 text-[11px] font-semibold ${
                          selectedBlock.maskBg === m.id
                            ? "border-rose-600 bg-white text-rose-600 font-bold"
                            : "border-slate-200 bg-white/70 text-slate-600"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                    <input
                      type="color"
                      value={selectedBlock.maskBg === "custom" ? selectedBlock.customMaskHex : selectedBlock.autoBgHex}
                      onChange={(e) =>
                        handleUpdateBlock(selectedBlock.id, { maskBg: "custom", customMaskHex: e.target.value }, true)
                      }
                      title="Custom Mask Color"
                      className="h-5 w-6 cursor-pointer rounded border border-slate-300 bg-white p-0"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!selectedBlock.isNew && isBlockModified(selectedBlock) && (
                    <button
                      type="button"
                      onClick={() => handleRestoreOriginalBlock(selectedBlock.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-600 hover:text-slate-900"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Restore Original</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteOrClearBlock(selectedBlock)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 font-semibold text-red-600 hover:bg-red-100"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>{selectedBlock.isNew ? "Delete Box" : "Blank Out Line"}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                <span className="flex items-center gap-2 font-medium">
                  <Sparkles className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>
                    Click any text line on the page to edit it in-place with <strong>auto-matched font & background</strong>.
                  </span>
                </span>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-0.5 dark:border-slate-800 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => setZoomPercent((z) => Math.max(75, z - 25))}
                      disabled={zoomPercent <= 75}
                      title="Zoom Out"
                      className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 dark:text-slate-300"
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </button>
                    <span className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200 min-w-[40px] text-center">
                      {zoomPercent}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoomPercent((z) => Math.min(200, z + 25))}
                      disabled={zoomPercent >= 200}
                      title="Zoom In"
                      className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 dark:text-slate-300"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => currentPage > 1 && setCurrentPage((p) => p - 1)}
                      disabled={currentPage <= 1 || isRenderingPage}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-400 disabled:opacity-30"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="font-mono text-slate-900 dark:text-white font-bold">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => currentPage < totalPages && setCurrentPage((p) => p + 1)}
                      disabled={currentPage >= totalPages || isRenderingPage}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-400 disabled:opacity-30"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Interactive PDF Page Viewport */}
            <div
              onClick={() => setSelectedBlockId(null)}
              className="relative flex justify-center overflow-auto rounded-2xl border border-slate-200 bg-slate-100 p-4 min-h-[540px] max-h-[82vh] dark:border-slate-800 dark:bg-slate-950"
            >
              {isRenderingPage && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/60 dark:bg-slate-950/60 backdrop-blur-2xs">
                  <Loader2 className="h-6 w-6 animate-spin text-rose-600" />
                </div>
              )}

              <div
                ref={pageContainerRef}
                style={{
                  width: `${Math.round(pageBaseSizePt.width * 1.35 * (zoomPercent / 100))}px`,
                  maxWidth: zoomPercent > 100 ? "none" : "100%",
                }}
                className="relative inline-block select-none shadow-xl border border-slate-200/80 bg-white shrink-0"
              >
                <canvas ref={pdfCanvasRef} className="block w-full h-auto rounded-xs" />

                {/* Mask for moved blocks */}
                {currentPageBlocks
                  .filter(
                    (b) =>
                      !b.isNew &&
                      (Math.abs(b.xPercent - b.origXPercent) > 0.1 ||
                        Math.abs(b.yPercent - b.origYPercent) > 0.1)
                  )
                  .map((b) => {
                    const maskHex = resolveMaskHex(b);
                    if (maskHex === "transparent") return null;
                    return (
                      <div
                        key={`orig_mask_${b.id}`}
                        style={{
                          left: `${b.origXPercent}%`,
                          top: `${b.origYPercent}%`,
                          width: `${b.origWidthPercent}%`,
                          height: `${b.origHeightPercent}%`,
                          backgroundColor: maskHex,
                        }}
                        className="pointer-events-none absolute z-10"
                      />
                    );
                  })}

                {/* Overlays with bounded width/height and pixel-accurate hitboxes */}
                {currentPageBlocks.map((block) => {
                  const isSelected = !previewCleanMode && selectedBlockId === block.id;
                  const isModified = isBlockModified(block);
                  const isFindHit =
                    findQuery.trim().length > 0 &&
                    !block.isWhiteoutOnly &&
                    (caseSensitiveFind
                      ? block.currentText.includes(findQuery)
                      : block.currentText.toLowerCase().includes(findQuery.toLowerCase()));

                  if (previewCleanMode && !isModified) return null;

                  const maskHex = resolveMaskHex(block);
                  const showOpaqueBg =
                    block.isWhiteoutOnly ||
                    ((isSelected || isModified) && maskHex !== "transparent");

                  const scaledFontPx = Math.max(9, block.fontSizePt * displayScale);

                  return (
                    <div
                      key={block.id}
                      data-block-id={block.id}
                      data-original-text={block.originalText}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!previewCleanMode) {
                          pushUndoSnapshot(textBlocks);
                          setSelectedBlockId(block.id);
                        }
                      }}
                      onPointerDown={(e) => {
                        if (block.isWhiteoutOnly && !previewCleanMode) {
                          handleStartInteraction(block, "drag", e);
                        }
                      }}
                      style={{
                        left: `${block.xPercent}%`,
                        top: `${block.yPercent}%`,
                        width: `${Math.max(block.widthPercent, 1.8)}%`,
                        height: `${Math.max(block.heightPercent, 1.4)}%`,
                        boxSizing: "border-box",
                        backgroundColor: showOpaqueBg
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
                      className={`group absolute flex items-center transition-shadow rounded-xs ${
                        previewCleanMode
                          ? "z-20 pointer-events-none"
                          : isSelected
                            ? "z-30 ring-2 ring-rose-600 shadow-md"
                            : isFindHit
                              ? "z-25 ring-2 ring-amber-500 bg-amber-200/40"
                              : isModified
                                ? "z-20 border border-emerald-500/60"
                                : "z-10 border border-transparent hover:border-rose-400/80 hover:bg-rose-500/10 cursor-pointer"
                      }`}
                    >
                      {isSelected && (
                        <>
                          <button
                            type="button"
                            onPointerDown={(e) => handleStartInteraction(block, "drag", e)}
                            title="Drag to move"
                            className="absolute -top-5 left-0 z-40 inline-flex items-center gap-0.5 rounded-t bg-rose-600 px-1.5 py-0.5 text-[9px] font-mono font-bold text-white cursor-move shadow-xs"
                          >
                            <Move className="h-2.5 w-2.5" />
                            <span>Move</span>
                          </button>

                          <div
                            onPointerDown={(e) => handleStartInteraction(block, "resize", e)}
                            title="Drag corner to resize"
                            className="absolute -bottom-1.5 -right-1.5 z-40 h-3 w-3 rounded-xs border border-white bg-rose-600 cursor-nwse-resize shadow-xs"
                          />
                        </>
                      )}

                      {block.isWhiteoutOnly ? (
                        <div className="w-full h-full min-h-[16px] cursor-move flex items-center justify-center text-[9px] font-mono text-slate-400">
                          {isSelected ? "Drag or Resize" : ""}
                        </div>
                      ) : isSelected ? (
                        <input
                          type="text"
                          autoFocus
                          value={block.currentText}
                          onChange={(e) =>
                            handleUpdateBlock(block.id, { currentText: e.target.value }, false)
                          }
                          style={{
                            color: block.color,
                            fontFamily: FONT_CSS_MAP[block.fontFamily],
                            fontWeight: block.isBold ? 700 : 400,
                            fontStyle: block.isItalic ? "italic" : "normal",
                            fontSize: `${scaledFontPx}px`,
                            textAlign: block.textAlign,
                          }}
                          className="w-full h-full bg-transparent outline-none leading-none px-0.5"
                        />
                      ) : isModified ? (
                        <span
                          style={{
                            color: block.color,
                            fontFamily: FONT_CSS_MAP[block.fontFamily],
                            fontWeight: block.isBold ? 700 : 400,
                            fontStyle: block.isItalic ? "italic" : "normal",
                            fontSize: `${scaledFontPx}px`,
                            textAlign: block.textAlign,
                          }}
                          className="whitespace-nowrap leading-none px-0.5 select-none"
                        >
                          {block.currentText}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Bottom Save Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>
                  {modifiedBlocks.length > 0
                    ? `${modifiedBlocks.length} text change(s) ready to apply.`
                    : "Click any text above to edit it."}
                </span>
                <span className="hidden md:inline font-mono text-[11px] text-slate-400">
                  • Shortcuts: Ctrl+Z Undo • Ctrl+F Find & Replace • Esc Deselect
                </span>
              </div>

              <button
                type="button"
                onClick={handleSaveEditedPdf}
                disabled={modifiedBlocks.length === 0 || isSaving}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-rose-600/20 disabled:opacity-40 transition-all"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Saving Edited PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 text-white" />
                    <span>Save & Download Edited PDF ({modifiedBlocks.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
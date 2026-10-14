"use client";

import React, { useState, useEffect } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileDropzone } from "@/components/tools/FileDropzone";
import { downloadBlob, loadPdfJs } from "@/lib/pdf/pdf-utils";
import { PDFDocument, degrees } from "pdf-lib";
import {
  RotateCw,
  RotateCcw,
  RefreshCw,
  Download,
  Loader2,
  Trash2,
  FileText,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface PageThumbnail {
  pageNumber: number;
  objectUrl: string;
}

export default function RotatePdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [rotations, setRotations] = useState<number[]>([]);
  const [progressText, setProgressText] = useState<string>("");

  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      thumbnails.forEach((t) => URL.revokeObjectURL(t.objectUrl));
    };
  }, [thumbnails]);

  const handleFileSelected = async (files: File[]) => {
    const selected = files[0];
    if (!selected) return;

    thumbnails.forEach((t) => URL.revokeObjectURL(t.objectUrl));
    setThumbnails([]);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoadingDoc(true);
    setFile(selected);

    try {
      const pdfjs = await loadPdfJs();
      const arrayBuffer = await selected.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const loadedThumbnails: PageThumbnail[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        setProgressText(`Rendering page ${i} of ${pdf.numPages}...`);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.4 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
          const blob = await new Promise<Blob | null>((res) =>
            canvas.toBlob((b) => res(b), "image/jpeg", 0.72)
          );
          if (blob) {
            loadedThumbnails.push({
              pageNumber: i,
              objectUrl: URL.createObjectURL(blob),
            });
          }
        }
      }

      setThumbnails(loadedThumbnails);
      setRotations(new Array(pdf.numPages).fill(0));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load PDF.";
      setErrorMessage(msg);
      setFile(null);
    } finally {
      setIsLoadingDoc(false);
      setProgressText("");
    }
  };

  const handleRotatePage = (index: number, delta: number) => {
    setRotations((prev) => {
      const next = [...prev];
      next[index] = (next[index] + delta + 360) % 360;
      return next;
    });
  };

  const handleRotateAll = (delta: number) => {
    setRotations((prev) => prev.map((angle) => (angle + delta + 360) % 360));
  };

  const handleResetAll = () => {
    setRotations(new Array(thumbnails.length).fill(0));
  };

  const handleClear = () => {
    thumbnails.forEach((t) => URL.revokeObjectURL(t.objectUrl));
    setFile(null);
    setThumbnails([]);
    setRotations([]);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSaveAndDownload = async () => {
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: false });
      const pages = pdfDoc.getPages();

      pages.forEach((page, idx) => {
        const addedDegrees = rotations[idx] || 0;
        if (addedDegrees !== 0) {
          const originalRotation = page.getRotation().angle;
          page.setRotation(degrees((originalRotation + addedDegrees) % 360));
        }
      });

      const rotatedBytes = await pdfDoc.save({ useObjectStreams: true });
      const fileName = `rotated_${file.name}`;
      downloadBlob(rotatedBytes, fileName);
      setSuccessMessage(`Success! Saved and downloaded "${fileName}".`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to rotate PDF.";
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolLayout
      title="Rotate PDF Pages"
      description="Rotate individual pages or entire documents permanently. Changes are rendered locally in browser memory."
    >
      <div className="space-y-6">
        {!file && (
          <FileDropzone
            accept="application/pdf,.pdf"
            multiple={false}
            onFilesSelected={handleFileSelected}
            title="Drop a PDF document here to rotate"
            description="Select a single PDF file. Preview all pages and change orientation on demand."
          />
        )}

        {isLoadingDoc && (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-8 text-slate-500 dark:border-slate-800 dark:bg-slate-900/40">
            <Loader2 className="h-5 w-5 animate-spin text-rose-600" />
            <span className="text-sm font-semibold">
              {progressText || "Generating page thumbnails..."}
            </span>
          </div>
        )}

        {file && !isLoadingDoc && (
          <div className="space-y-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                    {file.name}
                  </p>
                  <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {thumbnails.length} Pages
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRotateAll(90)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <RotateCw className="h-3.5 w-3.5 text-rose-600" />
                  <span>Rotate All +90°</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetAll}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {thumbnails.map((thumb, idx) => {
                const angle = rotations[idx] || 0;

                return (
                  <div
                    key={thumb.pageNumber}
                    className="flex flex-col items-center justify-between rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-3 space-y-3 shadow-2xs"
                  >
                    <div className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded bg-slate-50 dark:bg-slate-900 p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumb.objectUrl}
                        alt={`Page ${thumb.pageNumber}`}
                        style={{
                          transform: `rotate(${angle}deg)`,
                          transition: "transform 0.25s ease-in-out",
                        }}
                        className="max-h-full max-w-full object-contain rounded shadow-xs"
                      />
                      <span className="absolute bottom-1 left-1 rounded bg-slate-900/90 px-1.5 py-0.5 font-mono text-[10px] text-white">
                        P.{thumb.pageNumber}
                      </span>
                    </div>

                    <div className="flex items-center justify-between w-full border-t border-slate-100 dark:border-slate-800 pt-2 px-1">
                      <button
                        type="button"
                        onClick={() => handleRotatePage(idx, -90)}
                        title="Rotate Left (-90°)"
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>

                      <span className="font-mono text-[10px] font-bold text-slate-600 dark:text-slate-400">
                        {angle}°
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRotatePage(idx, 90)}
                        title="Rotate Right (+90°)"
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {errorMessage && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleSaveAndDownload}
                disabled={isProcessing}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-rose-600/20 disabled:cursor-not-allowed disabled:opacity-40 transition-all"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Applying Rotations...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 text-white" />
                    <span>Save & Download PDF</span>
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
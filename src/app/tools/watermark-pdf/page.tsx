"use client";

import React, { useState } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileDropzone } from "@/components/tools/FileDropzone";
import { downloadBlob } from "@/lib/pdf/pdf-utils";
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";
import {
  Stamp,
  Hash,
  FileText,
  Download,
  Loader2,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

type PageNumberPosition = "none" | "bottom-center" | "bottom-right" | "top-right";
type WatermarkColor = "red" | "slate" | "blue";

export default function WatermarkPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [watermarkText, setWatermarkText] = useState<string>("CONFIDENTIAL");
  const [watermarkColor, setWatermarkColor] = useState<WatermarkColor>("red");
  const [opacity, setOpacity] = useState<number>(0.18);
  const [pageNumberPos, setPageNumberPos] = useState<PageNumberPosition>("bottom-center");

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFileSelected = (files: File[]) => {
    const selected = files[0];
    if (!selected) return;
    setFile(selected);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleApply = async () => {
    if (!file) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const bytes = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: false });
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      const total = pages.length;

      const colorMap: Record<WatermarkColor, ReturnType<typeof rgb>> = {
        red: rgb(0.85, 0.12, 0.24),
        slate: rgb(0.25, 0.28, 0.34),
        blue: rgb(0.12, 0.35, 0.82),
      };

      const cleanText = watermarkText.replace(/[^\x20-\x7E]/g, "").trim();

      pages.forEach((page, idx) => {
        const { width, height } = page.getSize();

        if (cleanText) {
          const fontSize = Math.min(width, height) * 0.085;
          page.drawText(cleanText, {
            x: width * 0.16,
            y: height * 0.44,
            size: fontSize,
            font: boldFont,
            color: colorMap[watermarkColor],
            opacity,
            rotate: degrees(35),
          });
        }

        if (pageNumberPos !== "none") {
          const label = `Page ${idx + 1} of ${total}`;
          const textWidth = regularFont.widthOfTextAtSize(label, 9.5);
          let x = (width - textWidth) / 2;
          let y = 22;

          if (pageNumberPos === "bottom-right") {
            x = width - textWidth - 32;
            y = 22;
          } else if (pageNumberPos === "top-right") {
            x = width - textWidth - 32;
            y = height - 28;
          }

          page.drawText(label, {
            x,
            y,
            size: 9.5,
            font: regularFont,
            color: rgb(0.35, 0.38, 0.44),
          });
        }
      });

      const outBytes = await pdfDoc.save({ useObjectStreams: true });
      const outName = `watermarked_${file.name}`;
      downloadBlob(outBytes, outName);
      setSuccessMessage(`Success! Applied watermark and page numbers to "${outName}".`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to watermark PDF.";
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolLayout
      title="Watermark & Page Numbers PDF"
      description="Stamp custom diagonal text watermarks (CONFIDENTIAL, DRAFT, COPY) and automatic 'Page X of Y' numbering across your PDF locally."
    >
      <div className="space-y-6">
        {!file && (
          <FileDropzone
            accept="application/pdf,.pdf"
            multiple={false}
            onFilesSelected={handleFileSelected}
            title="Drop a PDF file to add watermark or page numbers"
            description="All stamping and numbering executes 100% inside your browser memory."
          />
        )}

        {file && (
          <div className="space-y-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                    {file.name}
                  </p>
                  <p className="font-mono text-xs text-slate-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  <Stamp className="h-4 w-4 text-rose-600" />
                  <span>Diagonal Watermark Text</span>
                </div>

                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder="e.g. CONFIDENTIAL, DRAFT, DO NOT COPY"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:border-rose-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />

                <div className="flex flex-wrap gap-1.5">
                  {["CONFIDENTIAL", "DRAFT", "DO NOT COPY", "APPROVED", ""].map((preset) => (
                    <button
                      key={preset || "none"}
                      type="button"
                      onClick={() => setWatermarkText(preset)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-rose-400 hover:text-rose-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {preset || "No Watermark"}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Stamp Color
                    </label>
                    <div className="flex gap-1.5">
                      {(["red", "slate", "blue"] as const).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setWatermarkColor(c)}
                          className={`flex-1 rounded-lg border py-1.5 font-semibold capitalize ${
                            watermarkColor === c
                              ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                              : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Opacity
                    </label>
                    <div className="flex gap-1.5">
                      {[
                        { label: "Light", val: 0.12 },
                        { label: "Medium", val: 0.2 },
                        { label: "Bold", val: 0.32 },
                      ].map((o) => (
                        <button
                          key={o.label}
                          type="button"
                          onClick={() => setOpacity(o.val)}
                          className={`flex-1 rounded-lg border py-1.5 font-semibold ${
                            opacity === o.val
                              ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                              : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  <Hash className="h-4 w-4 text-rose-600" />
                  <span>Automatic Page Numbering</span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Choose where to stamp <span className="font-mono font-semibold">Page X of Y</span> on every sheet:
                </p>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  {(
                    [
                      { id: "bottom-center", label: "Bottom Center" },
                      { id: "bottom-right", label: "Bottom Right" },
                      { id: "top-right", label: "Top Right" },
                      { id: "none", label: "No Page Numbers" },
                    ] as const
                  ).map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => setPageNumberPos(pos.id)}
                      className={`rounded-xl border p-3 text-left font-semibold transition-all ${
                        pageNumberPos === pos.id
                          ? "border-rose-500 bg-rose-50/60 text-rose-700 ring-2 ring-rose-500/20 dark:bg-rose-950/40 dark:text-rose-300"
                          : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
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

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleApply}
                disabled={isProcessing}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-rose-600/20 disabled:opacity-40 transition-all"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Applying Watermark...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 text-white" />
                    <span>Apply & Download PDF</span>
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

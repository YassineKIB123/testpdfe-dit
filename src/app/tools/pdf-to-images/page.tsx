"use client";

import React, { useState, useEffect } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileDropzone } from "@/components/tools/FileDropzone";
import { downloadBlob, loadPdfJs } from "@/lib/pdf/pdf-utils";
import JSZip from "jszip";
import {
  FileImage,
  Download,
  Loader2,
  Trash2,
  FileText,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Archive,
} from "lucide-react";

interface RenderedPage {
  pageNumber: number;
  objectUrl: string;
  blob: Blob;
}

interface PdfToImagesPageProps {
  initialFormat?: "png" | "jpeg";
}

export default function PdfToImagesPage({
  initialFormat = "png",
}: PdfToImagesPageProps = {}) {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<"png" | "jpeg">(initialFormat);
  const [resolution, setResolution] = useState<number>(2.0);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [progressText, setProgressText] = useState<string>("");

  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setFormat(initialFormat);
  }, [initialFormat]);

  useEffect(() => {
    return () => {
      pages.forEach((p) => URL.revokeObjectURL(p.objectUrl));
    };
  }, [pages]);

  const renderPdfPages = async (
    targetFile: File,
    selectedFormat: "png" | "jpeg",
    scale: number
  ) => {
    pages.forEach((p) => URL.revokeObjectURL(p.objectUrl));
    setIsLoadingDoc(true);
    setErrorMessage(null);

    try {
      const pdfjs = await loadPdfJs();
      const arrayBuffer = await targetFile.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const renderedList: RenderedPage[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        setProgressText(`Rendering page ${i} of ${pdf.numPages}...`);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;

          const mimeType = selectedFormat === "png" ? "image/png" : "image/jpeg";
          const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((b) => resolve(b!), mimeType, 0.92);
          });

          renderedList.push({
            pageNumber: i,
            objectUrl: URL.createObjectURL(blob),
            blob,
          });
        }
      }

      setPages(renderedList);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to extract PDF pages as images.";
      setErrorMessage(msg);
      setPages([]);
    } finally {
      setIsLoadingDoc(false);
      setProgressText("");
    }
  };

  const handleFileSelected = (files: File[]) => {
    const selected = files[0];
    if (!selected) return;

    setFile(selected);
    renderPdfPages(selected, format, resolution);
  };

  const handleFormatChange = (newFormat: "png" | "jpeg") => {
    setFormat(newFormat);
    if (file) {
      renderPdfPages(file, newFormat, resolution);
    }
  };

  const handleResolutionChange = (newScale: number) => {
    setResolution(newScale);
    if (file) {
      renderPdfPages(file, format, newScale);
    }
  };

  const handleDownloadSinglePage = (page: RenderedPage) => {
    if (!file) return;
    const baseName = file.name.replace(/\.pdf$/i, "");
    const fileName = `${baseName}_page_${page.pageNumber}.${
      format === "png" ? "png" : "jpg"
    }`;
    downloadBlob(page.blob, fileName, page.blob.type);
  };

  const handleDownloadAllAsZip = async () => {
    if (!file || pages.length === 0) return;

    setIsZipping(true);
    setErrorMessage(null);

    try {
      const zip = new JSZip();
      const baseName = file.name.replace(/\.pdf$/i, "");
      const ext = format === "png" ? "png" : "jpg";

      pages.forEach((page) => {
        zip.file(`${baseName}_page_${page.pageNumber}.${ext}`, page.blob);
      });

      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(zipBlob, `${baseName}_images.zip`, "application/zip");
      setSuccessMessage(
        `Success! Downloaded all ${pages.length} pages as a ZIP archive.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to compile ZIP archive.";
      setErrorMessage(msg);
    } finally {
      setIsZipping(false);
    }
  };

  const handleClear = () => {
    pages.forEach((p) => URL.revokeObjectURL(p.objectUrl));
    setFile(null);
    setPages([]);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  return (
    <ToolLayout
      title="PDF to Images"
      description="Convert every page of your PDF into high-resolution PNG or JPG images. Download single pages or all pages packaged as a ZIP file."
      faqs={[
        {
          question: "What is the difference between PNG and JPG for PDF exports?",
          answer:
            "PNG provides lossless clarity, ideal for text, charts, and diagrams. JPG uses mild compression to reduce file size, making it better for photo-heavy documents.",
        },
        {
          question: "Can I download all pages at once?",
          answer:
            "Yes! Click 'Download All as ZIP' to package every rendered page into a single archive directly inside your browser memory.",
        },
      ]}
    >
      <div className="space-y-6">
        {!file && (
          <FileDropzone
            accept="application/pdf,.pdf"
            multiple={false}
            onFilesSelected={handleFileSelected}
            title="Drop a PDF document to convert into images"
            description="Select any PDF file. Every page is rendered client-side with zero server uploads."
          />
        )}

        {isLoadingDoc && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-12 text-slate-500 dark:border-slate-800 dark:bg-slate-900/40">
            <Loader2 className="h-7 w-7 animate-spin text-rose-600" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {progressText || "Rendering high-resolution page images..."}
            </span>
          </div>
        )}

        {file && !isLoadingDoc && (
          <div className="space-y-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-cyan-100 bg-cyan-50 text-cyan-600 dark:border-cyan-900/40 dark:bg-cyan-950/40 dark:text-cyan-400">
                  <FileImage className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                    {file.name}
                  </p>
                  <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {pages.length} Pages Extracted
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-rose-600" />
                  <span>Image Format</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleFormatChange("png")}
                    className={`rounded-lg py-2 px-3 text-xs font-semibold transition-all ${
                      format === "png"
                        ? "border border-rose-600 bg-rose-50 text-rose-700 dark:border-rose-500 dark:bg-rose-950/60 dark:text-rose-300 font-bold"
                        : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    PNG (Lossless)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFormatChange("jpeg")}
                    className={`rounded-lg py-2 px-3 text-xs font-semibold transition-all ${
                      format === "jpeg"
                        ? "border border-rose-600 bg-rose-50 text-rose-700 dark:border-rose-500 dark:bg-rose-950/60 dark:text-rose-300 font-bold"
                        : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    JPG (Compressed)
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-rose-600" />
                  <span>DPI Quality</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleResolutionChange(1.5)}
                    className={`rounded-lg py-2 px-3 text-xs font-semibold transition-all ${
                      resolution === 1.5
                        ? "border border-rose-600 bg-rose-50 text-rose-700 dark:border-rose-500 dark:bg-rose-950/60 dark:text-rose-300 font-bold"
                        : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    Standard (150 DPI)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResolutionChange(2.5)}
                    className={`rounded-lg py-2 px-3 text-xs font-semibold transition-all ${
                      resolution === 2.5
                        ? "border border-rose-600 bg-rose-50 text-rose-700 dark:border-rose-500 dark:bg-rose-950/60 dark:text-rose-300 font-bold"
                        : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    High-Res (300 DPI)
                  </button>
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-bold">
                <span>Extracted Pages ({pages.length})</span>
                <span className="font-mono text-[11px] text-slate-400">
                  Click any page to download individually
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {pages.map((page) => (
                  <div
                    key={page.pageNumber}
                    className="flex flex-col items-center justify-between rounded-xl border border-slate-200 bg-white p-3 space-y-3 dark:border-slate-800 dark:bg-slate-950 shadow-2xs"
                  >
                    <div className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded bg-slate-50 p-2 dark:bg-slate-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={page.objectUrl}
                        alt={`Page ${page.pageNumber}`}
                        className="max-h-full max-w-full object-contain rounded shadow-xs"
                      />
                      <span className="absolute bottom-1.5 left-1.5 rounded bg-slate-900/90 px-1.5 py-0.5 font-mono text-[9px] text-white">
                        P.{page.pageNumber}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDownloadSinglePage(page)}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {pages.length} pages converted locally.
              </span>

              <button
                type="button"
                onClick={handleDownloadAllAsZip}
                disabled={isZipping || pages.length === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-rose-600/20 disabled:opacity-40 transition-all"
              >
                {isZipping ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Packaging ZIP Archive...</span>
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4 text-white" />
                    <span>Download All as ZIP ({pages.length} Pages)</span>
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
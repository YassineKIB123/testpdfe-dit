"use client";

import React, { useState } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileDropzone } from "@/components/tools/FileDropzone";
import { downloadBlob } from "@/lib/pdf/pdf-utils";
import { PDFDocument } from "pdf-lib";
import {
  ShieldAlert,
  FileText,
  Download,
  Loader2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

interface PdfMetadataSnapshot {
  title: string;
  author: string;
  subject: string;
  creator: string;
  producer: string;
  keywords: string;
  creationDate: string;
  modDate: string;
  pageCount: number;
}

export default function SanitizePdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<PdfMetadataSnapshot | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    const selected = files[0];
    if (!selected) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const bytes = await selected.arrayBuffer();
      const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      setFile(selected);
      setMeta({
        title: pdfDoc.getTitle() || "(None)",
        author: pdfDoc.getAuthor() || "(None)",
        subject: pdfDoc.getSubject() || "(None)",
        creator: pdfDoc.getCreator() || "(None)",
        producer: pdfDoc.getProducer() || "(None)",
        keywords: pdfDoc.getKeywords() || "(None)",
        creationDate: pdfDoc.getCreationDate()?.toISOString().split("T")[0] || "(None)",
        modDate: pdfDoc.getModificationDate()?.toISOString().split("T")[0] || "(None)",
        pageCount: pdfDoc.getPageCount(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not inspect PDF metadata.";
      setErrorMessage(msg);
    }
  };

  const handleSanitizeAndDownload = async () => {
    if (!file) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const bytes = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });

      const cleanDoc = await PDFDocument.create();
      const copiedPages = await cleanDoc.copyPages(srcDoc, srcDoc.getPageIndices());
      copiedPages.forEach((p) => cleanDoc.addPage(p));

      cleanDoc.setTitle("");
      cleanDoc.setAuthor("");
      cleanDoc.setSubject("");
      cleanDoc.setKeywords([]);
      cleanDoc.setCreator("");
      cleanDoc.setProducer("");

      const outBytes = await cleanDoc.save({ useObjectStreams: true });
      const outName = `sanitized_${file.name}`;
      downloadBlob(outBytes, outName);
      setSuccessMessage(
        `Success! Purged all hidden author, software, and timestamp metadata into "${outName}".`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to sanitize PDF.";
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolLayout
      title="Sanitize & Strip PDF Metadata"
      description="Inspect and permanently remove hidden Author, Creator, Producer, GPS/XMP streams, and editing timestamps from sensitive PDF documents."
    >
      <div className="space-y-6">
        {!file && (
          <FileDropzone
            accept="application/pdf,.pdf"
            multiple={false}
            onFilesSelected={handleFileSelected}
            title="Drop a PDF file to inspect & strip hidden metadata"
            description="Ideal for legal filings, anonymous whistleblowing, medical records, and resumes."
          />
        )}

        {file && meta && (
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
                    {meta.pageCount} Pages • {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setMeta(null);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove</span>
              </button>
            </div>

            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <ShieldAlert className="h-4 w-4 text-rose-600" />
                <span>Detected Hidden Metadata Fields</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {[
                  { label: "Author", val: meta.author },
                  { label: "Title", val: meta.title },
                  { label: "Creator App", val: meta.creator },
                  { label: "PDF Producer", val: meta.producer },
                  { label: "Subject", val: meta.subject },
                  { label: "Keywords", val: meta.keywords },
                  { label: "Created Date", val: meta.creationDate },
                  { label: "Modified Date", val: meta.modDate },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <span className="block text-[10px] font-bold uppercase text-slate-400">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {item.val}
                    </span>
                  </div>
                ))}
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

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                <Sparkles className="h-3.5 w-3.5 text-rose-600" />
                <span>Rebuilds a clean PDF container with zero hidden XMP or author traces.</span>
              </span>

              <button
                type="button"
                onClick={handleSanitizeAndDownload}
                disabled={isProcessing}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-rose-600/20 disabled:opacity-40 transition-all"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Sanitizing PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 text-white" />
                    <span>Purge Metadata & Download Clean PDF</span>
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

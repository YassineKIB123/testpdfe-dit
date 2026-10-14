"use client";

import React, { useState, useEffect } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileDropzone } from "@/components/tools/FileDropzone";
import {
  wordToPDF,
  excelToPDF,
  powerpointToPDF,
  textToPDF,
  pdfToWord,
  pdfToExcel,
  pdfToPowerPoint,
  pdfToText,
} from "@/lib/pdf/universal-converter";
import { imagesToPDF, downloadBlob } from "@/lib/pdf/pdf-utils";
import { ToolType } from "@/lib/pseo/pseo-data";
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  FileCode,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  FileType,
  Layers,
} from "lucide-react";

type TargetFormat = "pdf" | "docx" | "xlsx" | "pptx" | "txt";

interface ConversionOption {
  id: TargetFormat;
  label: string;
  ext: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface UniversalConverterPageProps {
  initialToolType?: ToolType;
}

export default function UniversalConverterPage({
  initialToolType,
}: UniversalConverterPageProps = {}) {
  const [file, setFile] = useState<File | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<TargetFormat>("pdf");
  const [isConverting, setIsConverting] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialToolType === "pdf-to-word") setSelectedFormat("docx");
    else if (initialToolType === "pdf-to-excel") setSelectedFormat("xlsx");
    else if (initialToolType === "pdf-to-powerpoint") setSelectedFormat("pptx");
    else if (initialToolType === "pdf-to-text") setSelectedFormat("txt");
    else if (initialToolType) setSelectedFormat("pdf");
  }, [initialToolType]);

  const getFileCategory = (
    fileName: string
  ): "pdf" | "word" | "excel" | "powerpoint" | "text" | "image" | "unknown" => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "pdf";
    if (["docx", "doc"].includes(ext || "")) return "word";
    if (["xlsx", "xls", "csv"].includes(ext || "")) return "excel";
    if (["pptx", "ppt"].includes(ext || "")) return "powerpoint";
    if (["txt", "md", "json", "rtf"].includes(ext || "")) return "text";
    if (["png", "jpg", "jpeg", "webp"].includes(ext || "")) return "image";
    return "unknown";
  };

  const handleFileSelected = (files: File[]) => {
    const selected = files[0];
    if (!selected) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setFile(selected);

    const cat = getFileCategory(selected.name);
    if (cat === "pdf") {
      if (initialToolType === "pdf-to-excel") setSelectedFormat("xlsx");
      else if (initialToolType === "pdf-to-powerpoint") setSelectedFormat("pptx");
      else if (initialToolType === "pdf-to-text") setSelectedFormat("txt");
      else setSelectedFormat("docx");
    } else {
      setSelectedFormat("pdf");
    }
  };

  const handleClear = () => {
    setFile(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    setProgressStatus("");
  };

  const handleConvert = async () => {
    if (!file) return;

    setIsConverting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setProgressStatus("Reading file structures...");

    try {
      const category = getFileCategory(file.name);
      const baseName = file.name.replace(/\.[^/.]+$/, "");

      if (selectedFormat === "pdf") {
        setProgressStatus("Compiling to PDF...");
        let pdfBytes: Uint8Array;

        if (category === "word") {
          pdfBytes = await wordToPDF(file);
        } else if (category === "excel") {
          pdfBytes = await excelToPDF(file);
        } else if (category === "powerpoint") {
          setProgressStatus("Rendering PowerPoint slides to PDF...");
          pdfBytes = await powerpointToPDF(file);
        } else if (category === "image") {
          pdfBytes = await imagesToPDF([file], {
            orientation: "portrait",
            margin: 0,
            pageSize: "fit",
          });
        } else {
          pdfBytes = await textToPDF(file);
        }

        const outName = `${baseName}_converted.pdf`;
        downloadBlob(pdfBytes, outName);
        setSuccessMessage(`Success! Converted "${file.name}" to "${outName}".`);
      } else {
        if (selectedFormat === "docx") {
          setProgressStatus("Reconstructing Word paragraphs...");
          const docxBlob = await pdfToWord(file);
          downloadBlob(
            docxBlob,
            `${baseName}.docx`,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          );
        } else if (selectedFormat === "xlsx") {
          setProgressStatus("Tabulating spreadsheet data...");
          const xlsxBlob = await pdfToExcel(file);
          downloadBlob(
            xlsxBlob,
            `${baseName}.xlsx`,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          );
        } else if (selectedFormat === "pptx") {
          setProgressStatus("Generating slide presentation...");
          const pptxBlob = await pdfToPowerPoint(file);
          downloadBlob(
            pptxBlob,
            `${baseName}.pptx`,
            "application/vnd.openxmlformats-officedocument.presentationml.presentation"
          );
        } else if (selectedFormat === "txt") {
          setProgressStatus("Extracting raw text...");
          const text = await pdfToText(file);
          const textBlob = new Blob([text], { type: "text/plain" });
          downloadBlob(textBlob, `${baseName}.txt`, "text/plain");
        }

        setSuccessMessage(
          `Success! Finished converting "${file.name}" to .${selectedFormat}.`
        );
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to convert document.";
      setErrorMessage(msg);
    } finally {
      setIsConverting(false);
      setProgressStatus("");
    }
  };

  const isPdf = file ? getFileCategory(file.name) === "pdf" : false;

  const PDF_OPTIONS: ConversionOption[] = [
    {
      id: "docx",
      label: "Microsoft Word",
      ext: ".docx",
      desc: "Editable Word document with reconstructed paragraphs",
      icon: FileText,
    },
    {
      id: "xlsx",
      label: "Microsoft Excel",
      ext: ".xlsx",
      desc: "Structured spreadsheet data and rows",
      icon: FileSpreadsheet,
    },
    {
      id: "pptx",
      label: "PowerPoint",
      ext: ".pptx",
      desc: "Formatted 16:9 slide deck presentation",
      icon: Presentation,
    },
    {
      id: "txt",
      label: "Plain Text",
      ext: ".txt",
      desc: "Clean raw text extraction",
      icon: FileCode,
    },
  ];

  return (
    <ToolLayout
      title="Universal Document Converter"
      description="Convert Word, Excel, PowerPoint, Text, and Images to and from PDF with full Unicode support. All parsing executes 100% locally in your browser."
    >
      <div className="space-y-6">
        {!file && (
          <FileDropzone
            accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.pptx,.ppt,.txt,.md,.png,.jpg,.jpeg,.webp"
            multiple={false}
            onFilesSelected={handleFileSelected}
            title="Drop any document, presentation, spreadsheet, or image here"
            description="Supports PDF, Word (.docx), Excel (.xlsx/.csv), PowerPoint (.pptx), Text (.txt/.md), and Images."
          />
        )}

        {file && (
          <div className="space-y-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-400">
                  <FileType className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                    {file.name}
                  </p>
                  <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    Type:{" "}
                    <span className="text-rose-600 dark:text-rose-400 uppercase font-bold">
                      {getFileCategory(file.name)}
                    </span>{" "}
                    • {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClear}
                disabled={isConverting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-850 transition-colors shadow-2xs"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Choose Another</span>
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <Layers className="h-4 w-4 text-rose-600" />
                <span>Select Target Output Format</span>
              </div>

              {!isPdf && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 flex items-center justify-between dark:border-rose-900/50 dark:bg-rose-950/30">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-600 text-white">
                      <FileType className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Portable Document Format (.pdf)
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Compile into a standard, Unicode-ready PDF document
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-rose-600 dark:text-rose-400 font-bold uppercase border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-md shadow-2xs">
                    Target Output
                  </span>
                </div>
              )}

              {isPdf && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PDF_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = selectedFormat === opt.id;

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedFormat(opt.id)}
                        className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                          isSelected
                            ? "border-rose-500 bg-rose-50/60 ring-2 ring-rose-500/20 shadow-xs dark:border-rose-500 dark:bg-rose-950/40"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                        }`}
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                            isSelected
                              ? "border-rose-200 bg-rose-100 text-rose-600 dark:border-rose-800 dark:bg-rose-900/60 dark:text-rose-300"
                              : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              {opt.label}
                            </span>
                            <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 font-mono text-[10px] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              {opt.ext}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-snug">
                            {opt.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
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

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {progressStatus || "Ready to process in browser memory."}
              </span>

              <button
                type="button"
                onClick={handleConvert}
                disabled={isConverting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-rose-600/20 disabled:cursor-not-allowed disabled:opacity-40 transition-all"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Processing Conversion...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 text-white" />
                    <span>Convert & Download</span>
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
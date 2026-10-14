"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { UploadCloud, AlertCircle } from "lucide-react";

interface FileDropzoneProps {
  accept: string;
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void;
  title?: string;
  description?: string;
}

export function FileDropzone({
  accept,
  multiple = false,
  onFilesSelected,
  title,
  description,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): boolean => {
      if (!accept || accept === "*") return true;

      const acceptedTokens = accept
        .split(",")
        .map((token) => token.trim().toLowerCase());
      const fileType = file.type.toLowerCase();
      const fileName = file.name.toLowerCase();

      return acceptedTokens.some((token) => {
        if (token.startsWith(".")) {
          return fileName.endsWith(token);
        }
        if (token.endsWith("/*")) {
          const baseType = token.slice(0, -2);
          return fileType.startsWith(baseType);
        }
        return fileType === token;
      });
    },
    [accept]
  );

  const processFiles = useCallback(
    (rawFiles: FileList | File[]) => {
      setErrorMessage(null);
      const fileArray = Array.from(rawFiles);
      if (fileArray.length === 0) return;

      const validFiles: File[] = [];
      const invalidFiles: File[] = [];

      fileArray.forEach((file) => {
        if (validateFile(file)) {
          validFiles.push(file);
        } else {
          invalidFiles.push(file);
        }
      });

      if (invalidFiles.length > 0) {
        setErrorMessage(
          `Some files were rejected because they do not match "${accept}".`
        );
      }

      if (validFiles.length > 0) {
        if (!multiple) {
          onFilesSelected([validFiles[0]]);
        } else {
          onFilesSelected(validFiles);
        }
      }
    },
    [accept, multiple, onFilesSelected, validateFile]
  );

  // Automatically pick up any file dropped on the Homepage Hero Dropzone!
  useEffect(() => {
    if (typeof window === "undefined") return;
    const win = window as any;
    if (win.__pdfStudioPendingFiles && win.__pdfStudioPendingFiles.length > 0) {
      const pending = win.__pdfStudioPendingFiles as File[];
      win.__pdfStudioPendingFiles = null;
      processFiles(pending);
    }
  }, [processFiles]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
        processFiles(e.clipboardData.files);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [processFiles]);

  return (
    <div className="w-full space-y-3">
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            fileInputRef.current?.click();
          }
        }}
        className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-200 outline-none ${
          isDragging
            ? "border-rose-500 bg-rose-50/60 scale-[0.99] dark:border-rose-500 dark:bg-rose-950/20"
            : "border-slate-300 bg-slate-50/60 hover:border-rose-400 hover:bg-white dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-slate-700 dark:hover:bg-slate-900"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => {
            if (e.target.files) {
              processFiles(e.target.files);
              e.target.value = "";
            }
          }}
          className="hidden"
        />

        {/* Tinted Icon Box */}
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-xl border transition-colors ${
            isDragging
              ? "border-rose-200 bg-rose-100 text-rose-600 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-400"
              : "border-rose-100 bg-rose-50 text-rose-600 group-hover:border-rose-200 group-hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-400"
          }`}
        >
          <UploadCloud className="h-7 w-7" />
        </div>

        <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
          {title || "Click to browse or drop your files here"}
        </h3>

        <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
          {description ||
            `Supports ${multiple ? "multiple files" : "a single file"} matching ${accept}. You can also paste directly with Ctrl+V.`}
        </p>

        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-mono text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 shadow-2xs">
          <span>Processed locally in browser memory</span>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
"use client";

import React from "react";
import { FileText, Trash2, ArrowUp, ArrowDown } from "lucide-react";

interface FileListPreviewProps {
  files: File[];
  onRemove: (index: number) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
}

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function FileListPreview({
  files,
  onRemove,
  onMoveUp,
  onMoveDown,
}: FileListPreviewProps) {
  if (files.length === 0) return null;

  const totalSize = files.reduce((acc, file) => acc + file.size, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 px-1">
        <span>Selected Files ({files.length})</span>
        <span className="font-mono">Total: {formatBytes(totalSize)}</span>
      </div>

      <div className="space-y-2">
        {files.map((file, idx) => (
          <div
            key={`${file.name}-${file.size}-${idx}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 shadow-2xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 font-mono text-[11px] font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                {idx + 1}
              </span>

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                <FileText className="h-4 w-4" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {file.name}
                </p>
                <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                  {formatBytes(file.size)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {onMoveUp && (
                <button
                  type="button"
                  onClick={() => onMoveUp(idx)}
                  disabled={idx === 0}
                  title="Move up"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white disabled:opacity-30 transition-colors"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              )}

              {onMoveDown && (
                <button
                  type="button"
                  onClick={() => onMoveDown(idx)}
                  disabled={idx === files.length - 1}
                  title="Move down"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white disabled:opacity-30 transition-colors"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => onRemove(idx)}
                title="Remove file"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors ml-1"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
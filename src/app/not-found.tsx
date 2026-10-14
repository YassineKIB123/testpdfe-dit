"use client";

import React from "react";
import Link from "next/link";
import { ToolLayout } from "@/components/tools/ToolLayout";
import {
  FileQuestion,
  Home,
  Minimize2,
  Files,
  Split,
  PenLine,
  Camera,
  RefreshCw,
} from "lucide-react";

export default function NotFound() {
  const popularTools = [
    { label: "Compress PDF", href: "/tools/compress-pdf", icon: Minimize2 },
    { label: "Merge PDF", href: "/tools/merge-pdf", icon: Files },
    { label: "Split PDF", href: "/tools/split-pdf", icon: Split },
    { label: "Sign PDF", href: "/tools/sign-pdf", icon: PenLine },
    { label: "Scan to PDF", href: "/tools/scan", icon: Camera },
    { label: "Universal Converter", href: "/tools/convert", icon: RefreshCw },
  ];

  return (
    <ToolLayout
      title="Page Not Found (404)"
      description="The page you requested could not be found. Choose any of our 100% private client-side PDF tools below to continue."
      hideSeoMeta={true}
    >
      <div className="py-8 text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-400">
          <FileQuestion className="h-8 w-8" />
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            We couldn&apos;t find that PDF tool page
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Jump straight into one of our core client-side tools below or return to the full suite directory.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl mx-auto text-left">
          {popularTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs font-bold text-slate-800 hover:border-rose-400 hover:bg-white hover:text-rose-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 transition-all"
              >
                <Icon className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{tool.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-600/20 transition-all"
          >
            <Home className="h-4 w-4" />
            <span>Back to All PDF Tools</span>
          </Link>
        </div>
      </div>
    </ToolLayout>
  );
}

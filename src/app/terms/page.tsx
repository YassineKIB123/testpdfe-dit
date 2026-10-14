"use client";

import React from "react";
import Link from "next/link";
import { FileCheck, ArrowLeft } from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-rose-600 hover:text-rose-500"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to PDFStudio Home</span>
        </Link>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/50 dark:border-rose-900">
              <FileCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                Terms of Service
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Last updated: October 2026
              </p>
            </div>
          </div>

          <section className="space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing and using <strong>PDFStudio</strong>, you agree to comply with and be bound by these Terms of Service. If you do not agree with any part of these terms, please do not use our website.
            </p>
          </section>

          <section className="space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              2. Description of Service & Local Processing
            </h2>
            <p>
              PDFStudio provides browser-based tools for editing, merging, splitting, compressing, signing, scanning, and converting PDF and image files. All file processing occurs locally on your device inside your web browser. You retain 100% ownership and responsibility for the files you process.
            </p>
          </section>

          <section className="space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              3. Acceptable Use
            </h2>
            <p>
              You agree to use PDFStudio only for lawful purposes. You are solely responsible for ensuring that you have the legal right to modify, sign, or convert any documents you process using our tools.
            </p>
          </section>

          <section className="space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              4. Disclaimer of Warranties & Limitation of Liability
            </h2>
            <p>
              PDFStudio is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis without warranties of any kind. Because all files are processed in your local browser memory and never backed up on our servers, we recommend keeping a backup copy of your original documents before editing or modifying them.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
"use client";

import React from "react";
import Link from "next/link";
import { Mail, ArrowLeft, ShieldCheck, Globe } from "lucide-react";

export default function ContactPage() {
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
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/50 dark:border-blue-900">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                About & Contact Us
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                We&apos;d love to hear your feedback and feature requests
              </p>
            </div>
          </div>

          <section className="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="h-4 w-4 text-rose-600" />
              <span>About PDFStudio</span>
            </h2>
            <p>
              <strong>PDFStudio</strong> was built with a simple mission: to provide fast, studio-quality PDF editing, compression, signing, scanning, and conversion tools that run <strong>100% locally in your browser</strong>—without forcing you to upload sensitive documents to unknown cloud servers or pay expensive monthly subscriptions.
            </p>
          </section>

          <section className="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Get in Touch</span>
            </h2>
            <p>
              Have a question, bug report, partnership inquiry, or feature request? Reach out to our team anytime:
            </p>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50 space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Email Support
              </p>
              <a
                href="mailto:support@pdfstudio.app"
                className="text-sm font-bold text-rose-600 hover:underline"
              >
                support@pdfstudio.app
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
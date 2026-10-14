"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Lock, Cookie, EyeOff } from "lucide-react";

export default function PrivacyPolicyPage() {
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
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/50 dark:border-emerald-900">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                Privacy Policy
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Last updated: October 2026
              </p>
            </div>
          </div>

          <section className="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="h-4 w-4 text-rose-600" />
              <span>1. 100% Client-Side Document Processing (Zero File Uploads)</span>
            </h2>
            <p>
              At <strong>PDFStudio</strong>, your privacy is built directly into our architecture. All PDF and image operations—including editing text, compressing, merging, splitting, signing, scanning, rotating, converting, and sanitizing metadata—run <strong>100% locally inside your web browser</strong> using WebAssembly and HTML5 Canvas.
            </p>
            <p>
              Your files are <strong>never uploaded, transmitted, or stored</strong> on our servers or any third-party cloud storage. Once you close or refresh your browser tab, your files are immediately cleared from your device&apos;s local memory.
            </p>
          </section>

          <section className="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <EyeOff className="h-4 w-4 text-rose-600" />
              <span>2. Personal Data & Local Storage</span>
            </h2>
            <p>
              We do not require account registration, and we do not collect personal names, passwords, or document contents. We use standard browser <code>localStorage</code> solely to remember your interface preferences, such as your selected language (<code>EN</code>, <code>FR</code>, <code>ES</code>, <code>RU</code>, <code>AR</code>) and theme mode (Light or Dark).
            </p>
          </section>

          <section className="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cookie className="h-4 w-4 text-rose-600" />
              <span>3. Cookies & Third-Party Advertising (Google AdSense)</span>
            </h2>
            <p>
              To keep PDFStudio 100% free for everyone without watermarks or file limits, we may display advertisements provided by third-party ad networks, including <strong>Google AdSense</strong>:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                Third-party vendors, including Google, use cookies to serve ads based on a user&apos;s prior visits to this website or other websites.
              </li>
              <li>
                Google&apos;s use of advertising cookies enables it and its partners to serve ads to users based on their visit to PDFStudio and/or other sites on the Internet.
              </li>
              <li>
                Users may opt out of personalized advertising by visiting{" "}
                <a
                  href="https://www.google.com/settings/ads"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-rose-600 underline hover:text-rose-500"
                >
                  Google Ads Settings
                </a>{" "}
                or{" "}
                <a
                  href="https://www.aboutads.info/choices/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-rose-600 underline hover:text-rose-500"
                >
                  www.aboutads.info
                </a>
                .
              </li>
            </ul>
          </section>

          <section className="space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              4. Contact Us
            </h2>
            <p>
              If you have any questions about this Privacy Policy or our client-side security practices, please visit our{" "}
              <Link href="/contact" className="text-rose-600 underline hover:text-rose-500">
                Contact Page
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
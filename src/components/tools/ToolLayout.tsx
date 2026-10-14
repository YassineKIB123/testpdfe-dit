"use client";

import Link from "next/link";
import {
  ChevronRight,
  ShieldCheck,
  ChevronDown,
  Upload,
  Cpu,
  Download,
  HelpCircle,
  Layers,
  Search,
  Globe,
  Sun,
  Moon,
  LayoutGrid,
  Minimize2,
  Files,
  Split,
  RotateCw,
  RefreshCw,
  Image as ImageIcon,
  FileImage,
  Camera,
  PenLine,
  X,
  Laptop,
} from "lucide-react";
import React, { useState, useEffect, useRef, createContext, useContext } from "react";
import { AdBanner } from "@/components/ads/AdBanner";
import { useLanguage } from "@/context/LanguageContext";
import { Language } from "@/lib/i18n/translations";

// Context to prevent nested duplicate headers/footers when tools are embedded inside pSEO pages
const EmbeddedToolContext = createContext<boolean>(false);

export function EmbeddedToolProvider({ children }: { children: React.ReactNode }) {
  return (
    <EmbeddedToolContext.Provider value={true}>
      {children}
    </EmbeddedToolContext.Provider>
  );
}

interface FAQItem {
  question: string;
  answer: string;
}

interface ToolLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
  faqs?: FAQItem[];
  hideSeoMeta?: boolean;
}

export function ToolLayout({
  title,
  description,
  children,
  faqs,
  hideSeoMeta = false,
}: ToolLayoutProps) {
  const isEmbedded = useContext(EmbeddedToolContext);
  const { language, setLanguage, t, isRTL, theme, toggleTheme } = useLanguage();

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  const langDropdownRef = useRef<HTMLDivElement>(null);
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEmbedded) return;
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, [isEmbedded]);

  useEffect(() => {
    if (isEmbedded) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setIsLangOpen(false);
      }
      if (megaMenuRef.current && !megaMenuRef.current.contains(e.target as Node)) {
        setIsMegaMenuOpen(false);
      }
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEmbedded]);

  // If rendered inside a pSEO page via PseoToolRenderer, render ONLY the interactive workspace
  if (isEmbedded) {
    return <div className="w-full">{children}</div>;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setDeferredPrompt(null);
    } else {
      setShowInstallHelp(true);
    }
  };

  const quickTools = [
    { label: t.tools.compressTitle, href: "/tools/compress-pdf", keywords: "compress shrink reduce size kb mb" },
    { label: t.tools.mergeTitle, href: "/tools/merge-pdf", keywords: "merge combine join pdfs" },
    { label: t.tools.splitTitle, href: "/tools/split-pdf", keywords: "split extract separate pages" },
    { label: t.tools.rotateTitle, href: "/tools/rotate-pdf", keywords: "rotate orientation turn pages" },
    { label: "Edit PDF Text", href: "/tools/edit-pdf", keywords: "edit text modify replace whiteout redact pdf" },
    { label: t.tools.signTitle, href: "/tools/sign-pdf", keywords: "sign signature stamp initials" },
    { label: t.tools.scanTitle, href: "/tools/scan", keywords: "scan camera crop perspective ocr" },
    { label: t.tools.convertTitle, href: "/tools/convert", keywords: "convert word docx excel xlsx pptx text" },
    { label: t.tools.imagesToPdfTitle, href: "/tools/images-to-pdf", keywords: "jpg png webp images to pdf" },
    { label: t.tools.pdfToImagesTitle, href: "/tools/pdf-to-images", keywords: "pdf to jpg png images zip" },
    { label: "Watermark & Page Numbers", href: "/tools/watermark-pdf", keywords: "watermark page numbers stamp confidential draft" },
    { label: "Sanitize PDF Metadata", href: "/tools/sanitize-pdf", keywords: "sanitize metadata remove author privacy clean" },
  ];

  const matchingSearchTools = searchQuery.trim()
    ? quickTools.filter(
        (item) =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.keywords.includes(searchQuery.toLowerCase())
      )
    : [];

  const defaultFaqs: FAQItem[] = [
    {
      question: t.trust.zeroUploads,
      answer: t.trust.zeroUploadsDesc,
    },
    {
      question: t.trust.speed,
      answer: t.trust.speedDesc,
    },
    {
      question: t.trust.privacy,
      answer: t.trust.privacyDesc,
    },
  ];

  const activeFaqs = faqs || defaultFaqs;

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 selection:bg-rose-100 selection:text-rose-900 flex flex-col justify-between transition-colors duration-200"
    >
      {!hideSeoMeta && (
        <>
          <title>{`${title} — Free & 100% Private Online Tool | PDFStudio`}</title>
          <meta name="description" content={description} />
          <meta property="og:title" content={`${title} — PDFStudio`} />
          <meta property="og:description" content={description} />
        </>
      )}

      <div>
        {/* Top Navbar */}
        <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 dark:border-slate-800 dark:bg-slate-950/95 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 text-white shadow-xs shadow-rose-600/30">
                <Layers className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                  PDF<span className="text-rose-600">Studio</span>
                </span>
                <span className="text-[9px] font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500">
                  All-in-One Suite
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <Link href="/tools/edit-pdf" className="hover:text-rose-600 transition-colors font-bold text-rose-600 dark:text-rose-400">Edit PDF Text</Link>
              <Link href="/tools/compress-pdf" className="hover:text-rose-600 transition-colors">
                {t.tools.compressTitle}
              </Link>
              <Link href="/tools/merge-pdf" className="hover:text-rose-600 transition-colors">
                {t.nav.merge}
              </Link>
              <Link href="/tools/scan" className="hover:text-rose-600 transition-colors">
                {t.nav.scan}
              </Link>

              {/* All PDF Tools Mega Menu */}
              <div className="relative" ref={megaMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsMegaMenuOpen(!isMegaMenuOpen)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors font-bold ${
                    isMegaMenuOpen
                      ? "text-rose-600 bg-rose-50 dark:bg-rose-950/40"
                      : "hover:text-rose-600 hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5 text-rose-600" />
                  <span>{t.filters.all}</span>
                  <ChevronDown
                    className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${
                      isMegaMenuOpen ? "rotate-180 text-rose-600" : ""
                    }`}
                  />
                </button>

                {isMegaMenuOpen && (
                  <div className="absolute left-1/2 -translate-x-1/2 mt-3 w-[660px] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-50">
                    <div className="grid grid-cols-3 gap-6">
                      <div className="space-y-3">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          {t.footer.organize}
                        </p>
                        <div className="space-y-1">
                          <Link
                            href="/tools/compress-pdf"
                            onClick={() => setIsMegaMenuOpen(false)}
                            className="flex items-center gap-2.5 rounded-lg p-2 text-slate-700 hover:bg-slate-50 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Minimize2 className="h-4 w-4 text-orange-500" />
                            <span className="font-semibold text-xs">{t.tools.compressTitle}</span>
                          </Link>
                          <Link
                            href="/tools/merge-pdf"
                            onClick={() => setIsMegaMenuOpen(false)}
                            className="flex items-center gap-2.5 rounded-lg p-2 text-slate-700 hover:bg-slate-50 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Files className="h-4 w-4 text-red-500" />
                            <span className="font-semibold text-xs">{t.nav.merge}</span>
                          </Link>
                          <Link
                            href="/tools/split-pdf"
                            onClick={() => setIsMegaMenuOpen(false)}
                            className="flex items-center gap-2.5 rounded-lg p-2 text-slate-700 hover:bg-slate-50 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Split className="h-4 w-4 text-blue-500" />
                            <span className="font-semibold text-xs">{t.nav.split}</span>
                          </Link>
                          <Link
                            href="/tools/rotate-pdf"
                            onClick={() => setIsMegaMenuOpen(false)}
                            className="flex items-center gap-2.5 rounded-lg p-2 text-slate-700 hover:bg-slate-50 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                          >
                            <RotateCw className="h-4 w-4 text-amber-500" />
                            <span className="font-semibold text-xs">{t.tools.rotateTitle}</span>
                          </Link>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          {t.footer.convert}
                        </p>
                        <div className="space-y-1">
                          <Link
                            href="/tools/convert"
                            onClick={() => setIsMegaMenuOpen(false)}
                            className="flex items-center gap-2.5 rounded-lg p-2 text-slate-700 hover:bg-slate-50 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                          >
                            <RefreshCw className="h-4 w-4 text-indigo-500" />
                            <span className="font-semibold text-xs">{t.tools.convertTitle}</span>
                          </Link>
                          <Link
                            href="/tools/images-to-pdf"
                            onClick={() => setIsMegaMenuOpen(false)}
                            className="flex items-center gap-2.5 rounded-lg p-2 text-slate-700 hover:bg-slate-50 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                          >
                            <ImageIcon className="h-4 w-4 text-violet-500" />
                            <span className="font-semibold text-xs">{t.tools.imagesToPdfTitle}</span>
                          </Link>
                          <Link
                            href="/tools/pdf-to-images"
                            onClick={() => setIsMegaMenuOpen(false)}
                            className="flex items-center gap-2.5 rounded-lg p-2 text-slate-700 hover:bg-slate-50 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                          >
                            <FileImage className="h-4 w-4 text-cyan-500" />
                            <span className="font-semibold text-xs">{t.tools.pdfToImagesTitle}</span>
                          </Link>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          {t.footer.editScan}
                        </p>
                        <div className="space-y-1">
                          <Link
                            href="/tools/scan"
                            onClick={() => setIsMegaMenuOpen(false)}
                            className="flex items-center gap-2.5 rounded-lg p-2 text-slate-700 hover:bg-slate-50 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Camera className="h-4 w-4 text-rose-500" />
                            <span className="font-semibold text-xs">{t.tools.scanTitle}</span>
                          </Link>
                          <Link
                            href="/tools/sign-pdf"
                            onClick={() => setIsMegaMenuOpen(false)}
                            className="flex items-center gap-2.5 rounded-lg p-2 text-slate-700 hover:bg-slate-50 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                          >
                            <PenLine className="h-4 w-4 text-emerald-500" />
                            <span className="font-semibold text-xs">{t.tools.signTitle}</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </nav>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleInstallClick}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-rose-600 dark:hover:bg-rose-500 px-3.5 py-1.5 text-xs font-bold transition-all shadow-xs"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Install App</span>
              </button>

              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
              >
                {theme === "light" ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4 text-amber-400" />
                )}
              </button>

              {/* Live Quick-Jump Navbar Search */}
              <div className="relative hidden lg:block w-48" ref={searchDropdownRef}>
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={t.nav.searchPlaceholder}
                  value={searchQuery}
                  onFocus={() => setIsSearchOpen(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                />
                {isSearchOpen && matchingSearchTools.length > 0 && (
                  <div className="absolute right-0 mt-1.5 w-60 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50">
                    {matchingSearchTools.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          setIsSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                      >
                        <span>{item.label}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Language Selector Dropdown */}
              <div className="relative" ref={langDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsLangOpen(!isLangOpen)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  <Globe className="h-3.5 w-3.5 text-slate-500" />
                  <span>{language}</span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </button>

                {isLangOpen && (
                  <div className="absolute right-0 mt-1.5 w-32 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg dark:border-slate-800 dark:bg-slate-900 z-50">
                    {(["EN", "FR", "ES", "RU", "AR"] as const).map((lang: Language) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => {
                          setLanguage(lang);
                          setIsLangOpen(false);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-1.5 text-xs font-medium transition-colors ${
                          language === lang
                            ? "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 font-bold"
                            : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span>
                          {lang === "EN" && "English"}
                          {lang === "FR" && "Français"}
                          {lang === "ES" && "Español"}
                          {lang === "RU" && "Русский"}
                          {lang === "AR" && "العربية"}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">{lang}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Workspace */}
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 mb-6">
            <Link href="/" className="hover:text-rose-600 transition-colors">
              {language === "AR" ? "الرئيسية" : "Home"}
            </Link>
            <ChevronRight className={`h-3 w-3 text-slate-400 ${isRTL ? "rotate-180" : ""}`} />
            <span className="text-slate-900 dark:text-white font-semibold">{title}</span>
          </nav>

          <section className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {title}
              </h1>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
                {description}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.share) {
                    navigator
                      .share({
                        title: `${title} - PDFStudio`,
                        text: "100% private client-side PDF tool with zero cloud uploads.",
                        url: window.location.href,
                      })
                      .catch(() => {});
                  } else if (typeof navigator !== "undefined") {
                    navigator.clipboard.writeText(window.location.href);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
              >
                <span>
                  {language === "FR"
                    ? "Partager"
                    : language === "ES"
                      ? "Compartir"
                      : language === "RU"
                        ? "Поделиться"
                        : language === "AR"
                          ? "مشاركة"
                          : "Share Tool"}
                </span>
              </button>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/40 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 shadow-2xs">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>{t.trust.zeroUploads}</span>
              </div>
            </div>
          </section>

          {/* Interactive Tool Container */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
            {children}
          </div>

          <div className="mt-8">
            <AdBanner format="leaderboard" />
          </div>

          {/* 3-Step Guide */}
          <section className="mt-12 rounded-2xl border border-slate-200 bg-slate-50/60 p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900/40">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-6">
              {language === "FR"
                ? "Comment utiliser cet outil en 3 étapes simples"
                : language === "ES"
                  ? "Cómo usar esta herramienta en 3 simples pasos"
                  : language === "RU"
                    ? "Как использовать инструмент за 3 простых шага"
                    : language === "AR"
                      ? "كيفية استخدام هذه الأداة في 3 خطوات بسيطة"
                      : "How to use this tool in 3 simple steps"}
            </h2>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="flex flex-col items-start gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-400 font-bold">
                  <Upload className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  1. {t.trust.zeroUploads}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {t.trust.zeroUploadsDesc}
                </p>
              </div>

              <div className="flex flex-col items-start gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/40 dark:border-blue-900/50 dark:text-blue-400 font-bold">
                  <Cpu className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  2. {t.trust.speed}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {t.trust.speedDesc}
                </p>
              </div>

              <div className="flex flex-col items-start gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-400 font-bold">
                  <Download className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  3. {t.trust.portability}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {t.trust.portabilityDesc}
                </p>
              </div>
            </div>
          </section>

          {/* FAQ Accordion */}
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xs dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex items-center gap-2 mb-6">
              <HelpCircle className="h-5 w-5 text-slate-700 dark:text-slate-300" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {language === "FR"
                  ? "Questions Fréquentes (FAQ)"
                  : language === "ES"
                    ? "Preguntas Frecuentes"
                    : language === "RU"
                      ? "Часто задаваемые вопросы"
                      : language === "AR"
                        ? "الأسئلة الشائعة"
                        : "Frequently Asked Questions"}
              </h2>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {activeFaqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div key={faq.question} className="py-3.5">
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      className="flex w-full items-center justify-between text-left text-sm font-semibold text-slate-900 dark:text-white hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                    >
                      <span>{faq.question}</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-rose-600 dark:text-rose-400" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      </div>

      {/* 4-Column Footer */}
      <footer className="mt-16 border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 py-12 text-xs text-slate-600 dark:text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-white">
                  <Layers className="h-4 w-4" />
                </div>
                <span className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                  PDF<span className="text-rose-600">Studio</span>
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                {t.footer.desc}
              </p>
            </div>

            <div className="space-y-2.5">
              <p className="font-bold uppercase tracking-wider text-slate-900 dark:text-white text-[11px]">
                {t.footer.organize}
              </p>
              <ul className="space-y-2">
                <li><Link href="/compress-pdf" className="hover:text-rose-600">{t.tools.compressTitle}</Link></li>
                <li><Link href="/merge-pdf" className="hover:text-rose-600">{t.nav.merge}</Link></li>
                <li><Link href="/split-pdf" className="hover:text-rose-600">{t.nav.split}</Link></li>
                <li><Link href="/rotate-pdf" className="hover:text-rose-600">{t.tools.rotateTitle}</Link></li>
                <li><Link href="/jpg-to-pdf" className="hover:text-rose-600">{t.tools.imagesToPdfTitle}</Link></li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <p className="font-bold uppercase tracking-wider text-slate-900 dark:text-white text-[11px]">
                {t.footer.convert}
              </p>
              <ul className="space-y-2">
                <li><Link href="/pdf-to-word" className="hover:text-rose-600">PDF to Word</Link></li>
                <li><Link href="/word-to-pdf" className="hover:text-rose-600">Word to PDF</Link></li>
                <li><Link href="/pdf-to-excel" className="hover:text-rose-600">PDF to Excel</Link></li>
                <li><Link href="/excel-to-pdf" className="hover:text-rose-600">Excel to PDF</Link></li>
                <li><Link href="/pdf-to-powerpoint" className="hover:text-rose-600">PDF to PowerPoint</Link></li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <p className="font-bold uppercase tracking-wider text-slate-900 dark:text-white text-[11px]">
                {t.footer.editScan}
              </p>
              <ul className="space-y-2">
                <li><Link href="/edit-pdf" className="hover:text-rose-600 font-semibold">Edit PDF Text</Link></li>
                <li><Link href="/scan-pdf" className="hover:text-rose-600">{t.nav.scan}</Link></li>
                <li><Link href="/sign-pdf" className="hover:text-rose-600">{t.tools.signTitle}</Link></li>
                <li><Link href="/pdf-to-text" className="hover:text-rose-600">PDF to Text</Link></li>
                <li><Link href="/pdf-to-jpg" className="hover:text-rose-600">PDF to JPG</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-6 gap-4 text-slate-500">
            <p>PDFStudio &copy; 2026. {t.footer.rights}</p>

            <div className="flex items-center gap-1.5 font-medium">
              {(["EN", "FR", "ES", "RU", "AR"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={`rounded px-2.5 py-1 text-xs transition-colors ${
                    language === lang
                      ? "bg-rose-600 text-white font-bold"
                      : "hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Install App Modal */}
      {showInstallHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-base">
                <Laptop className="h-5 w-5 text-rose-600" />
                <span>Install PDFStudio App</span>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallHelp(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              PDFStudio runs 100% locally on your computer or phone with offline access. To install:
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-850">
                <p className="font-bold text-slate-900 dark:text-white mb-0.5">Desktop (Chrome / Edge / Brave):</p>
                <p className="text-slate-500 dark:text-slate-400">
                  Click the install monitor icon directly inside your browser address bar on the right.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-850">
                <p className="font-bold text-slate-900 dark:text-white mb-0.5">Mobile (Safari / Chrome iOS & Android):</p>
                <p className="text-slate-500 dark:text-slate-400">
                  Tap the <span className="font-semibold text-rose-600">Share</span> button, then tap{" "}
                  <span className="font-semibold text-rose-600">&ldquo;Add to Home Screen&rdquo;</span>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowInstallHelp(false)}
              className="w-full rounded-xl bg-rose-600 hover:bg-rose-500 py-2.5 text-xs font-bold text-white transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
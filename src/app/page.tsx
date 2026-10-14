"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Camera,
  PenLine,
  Files,
  RefreshCw,
  Split,
  RotateCw,
  Image as ImageIcon,
  FileImage,
  Search,
  Zap,
  ShieldCheck,
  Globe,
  Layers,
  Sparkles,
  ArrowRight,
  Sun,
  Moon,
  ChevronDown,
  Minimize2,
  HelpCircle,
  LayoutGrid,
  Download,
  X,
  Laptop,
  Stamp,
  ShieldAlert,
  FileEdit,
  UploadCloud,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { AdBanner } from "@/components/ads/AdBanner";
import { DICTIONARY, Language } from "@/lib/i18n/translations";
import { useLanguage } from "@/context/LanguageContext";

type CategoryFilter = "all" | "popular" | "scan_edit" | "organize" | "convert";

declare global {
  interface Window {
    __pdfStudioPendingFiles?: File[] | null;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

const HOMEPAGE_FAQS = [
  {
    question: "How do your PDF tools work 100% client-side?",
    answer:
      "Our tools compile core document utilities directly to native WebAssembly, JavaScript, and HTML5 Canvas engines inside your browser tab. Your files are processed entirely in your computer's local memory and never transmitted over the internet to a remote server.",
  },
  {
    question: "Are my documents uploaded, tracked, or stored anywhere?",
    answer:
      "Zero bytes are uploaded. We do not operate document storage servers, and there is zero cloud logging. When you close or refresh your browser tab, the document buffer is immediately purged from RAM.",
  },
  {
    question: "Is there any limit on file size or number of pages?",
    answer:
      "Unlike traditional online converters that cap free users at 10 MB or 20 pages, our client-side architecture has no artificial paywalls or limits. As long as your computer or smartphone has sufficient memory, you can process files of any size.",
  },
  {
    question: "Can I use PDFStudio without an internet connection?",
    answer:
      "Yes. Once this web app finishes loading in your browser, our offline Service Worker caches the core scripts and assets. You can disconnect your Wi-Fi and continue scanning, compressing, merging, and signing documents offline.",
  },
  {
    question: "Do you add any watermark to my exported PDF documents?",
    answer:
      "Never. All tools generate clean, professional, watermark-free documents in standard ISO 32000-1 PDF format.",
  },
];

const POPULAR_PSEO_LINKS = [
  { href: "/edit-pdf-editable-text", label: "Edit Existing PDF Text Online" },
  { href: "/edit-pdf-for-resumes", label: "Edit PDF Resume & CV Text" },
  { href: "/compress-pdf-under-100kb", label: "Compress PDF Under 100 KB" },
  { href: "/compress-pdf-under-200kb", label: "Compress PDF Under 200 KB" },
  { href: "/compress-pdf-for-email", label: "Compress PDF for Email" },
  { href: "/merge-pdf-for-contracts", label: "Merge PDF for Legal Contracts" },
  { href: "/sign-pdf-for-contracts", label: "Sign PDF Contracts Online" },
  { href: "/scan-pdf-for-invoices", label: "Scan Receipts & Invoices to PDF" },
  { href: "/pdf-to-word-editable-text", label: "PDF to Editable Word DOCX" },
  { href: "/pdf-to-excel-for-bank-statements", label: "Bank Statement PDF to Excel" },
  { href: "/jpg-to-pdf-for-passports-and-visas", label: "JPG to PDF for Passport & Visa" },
  { href: "/pdf-to-jpg-high-resolution-300dpi", label: "PDF to 300 DPI High-Res JPG" },
  { href: "/split-pdf-for-court-filings", label: "Split PDF for Court E-Filing" },
  { href: "/powerpoint-to-pdf-for-students", label: "PowerPoint PPTX to PDF" },
];

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const {
    language: selectedLanguage,
    setLanguage: setSelectedLanguage,
    theme,
    toggleTheme,
  } = useLanguage();
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Hero Dropzone & Tool Selector States
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [isDraggingHero, setIsDraggingHero] = useState(false);
  const heroFileInputRef = useRef<HTMLInputElement>(null);

  // PWA Install Prompt States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  const langDropdownRef = useRef<HTMLDivElement>(null);
  const megaMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setIsLangOpen(false);
      }
      if (megaMenuRef.current && !megaMenuRef.current.contains(e.target as Node)) {
        setIsMegaMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLanguageChange = (lang: Language) => {
    setSelectedLanguage(lang);
    setIsLangOpen(false);
  };

  const toggleFaq = (idx: number) => {
    setOpenFaqIndex(openFaqIndex === idx ? null : idx);
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else {
      setShowInstallHelp(true);
    }
  };

  const handleHeroFilesPicked = (fileList: FileList | File[]) => {
    const arr = Array.from(fileList);
    if (arr.length === 0) return;
    setDroppedFiles(arr);
    if (typeof window !== "undefined") {
      window.__pdfStudioPendingFiles = arr;
    }
  };

  const handleLaunchToolWithFile = (href: string) => {
    if (typeof window !== "undefined" && droppedFiles.length > 0) {
      window.__pdfStudioPendingFiles = droppedFiles;
    }
    router.push(href);
  };

  const t = DICTIONARY[selectedLanguage] || DICTIONARY.EN;
  const isRTL = selectedLanguage === "AR";

  const toolsDirectory = useMemo(
    () => [
      {
        id: "edit",
        title:
          selectedLanguage === "FR"
            ? "Modifier Texte PDF"
            : selectedLanguage === "ES"
              ? "Editar Texto PDF"
              : selectedLanguage === "RU"
                ? "Редактировать PDF"
                : selectedLanguage === "AR"
                  ? "تعديل نص PDF"
                  : "Edit PDF Text",
        description:
          selectedLanguage === "FR"
            ? "Cliquez sur n'importe quel texte existant dans votre PDF pour le modifier, le remplacer ou l'effacer."
            : selectedLanguage === "ES"
              ? "Haz clic en cualquier texto existente de tu PDF para editarlo, reemplazarlo o borrarlo al instante."
              : selectedLanguage === "AR"
                ? "انقر على أي نص موجود داخل ملف PDF لتعديله أو استبداله أو مسحه مباشرة."
                : "Click any existing text in your PDF to edit, replace, whiteout, or add new text directly in your browser.",
        href: "/tools/edit-pdf",
        formats: [".PDF"],
        category: "scan_edit" as const,
        popular: true,
        icon: FileEdit,
        iconBg: "bg-rose-50 border-rose-100 dark:bg-rose-950/40 dark:border-rose-900/50",
        iconColor: "text-rose-600 dark:text-rose-400",
      },
      {
        id: "scan",
        title: t.tools.scanTitle,
        description: t.tools.scanDesc,
        href: "/tools/scan",
        formats: [".PDF", ".JPG"],
        category: "scan_edit" as const,
        popular: true,
        icon: Camera,
        iconBg: "bg-rose-50 border-rose-100 dark:bg-rose-950/40 dark:border-rose-900/50",
        iconColor: "text-rose-600 dark:text-rose-400",
      },
      {
        id: "compress",
        title: t.tools.compressTitle,
        description: t.tools.compressDesc,
        href: "/tools/compress-pdf",
        formats: [".PDF"],
        category: "organize" as const,
        popular: true,
        icon: Minimize2,
        iconBg: "bg-orange-50 border-orange-100 dark:bg-orange-950/40 dark:border-orange-900/50",
        iconColor: "text-orange-600 dark:text-orange-400",
      },
      {
        id: "sign",
        title: t.tools.signTitle,
        description: t.tools.signDesc,
        href: "/tools/sign-pdf",
        formats: [".PDF"],
        category: "scan_edit" as const,
        popular: true,
        icon: PenLine,
        iconBg: "bg-emerald-50 border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900/50",
        iconColor: "text-emerald-600 dark:text-emerald-400",
      },
      {
        id: "merge",
        title: t.tools.mergeTitle,
        description: t.tools.mergeDesc,
        href: "/tools/merge-pdf",
        formats: [".PDF"],
        category: "organize" as const,
        popular: true,
        icon: Files,
        iconBg: "bg-red-50 border-red-100 dark:bg-red-950/40 dark:border-red-900/50",
        iconColor: "text-red-600 dark:text-red-400",
      },
      {
        id: "convert",
        title: t.tools.convertTitle,
        description: t.tools.convertDesc,
        href: "/tools/convert",
        formats: [".DOCX", ".XLSX", ".PPTX"],
        category: "convert" as const,
        popular: true,
        icon: RefreshCw,
        iconBg: "bg-indigo-50 border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900/50",
        iconColor: "text-indigo-600 dark:text-indigo-400",
      },
      {
        id: "split",
        title: t.tools.splitTitle,
        description: t.tools.splitDesc,
        href: "/tools/split-pdf",
        formats: [".PDF"],
        category: "organize" as const,
        icon: Split,
        iconBg: "bg-blue-50 border-blue-100 dark:bg-blue-950/40 dark:border-blue-900/50",
        iconColor: "text-blue-600 dark:text-blue-400",
      },
      {
        id: "rotate",
        title: t.tools.rotateTitle,
        description: t.tools.rotateDesc,
        href: "/tools/rotate-pdf",
        formats: [".PDF"],
        category: "organize" as const,
        icon: RotateCw,
        iconBg: "bg-amber-50 border-amber-100 dark:bg-amber-950/40 dark:border-amber-900/50",
        iconColor: "text-amber-600 dark:text-amber-400",
      },
      {
        id: "images-to-pdf",
        title: t.tools.imagesToPdfTitle,
        description: t.tools.imagesToPdfDesc,
        href: "/tools/images-to-pdf",
        formats: [".JPG", ".PNG", ".WEBP"],
        category: "convert" as const,
        icon: ImageIcon,
        iconBg: "bg-violet-50 border-violet-100 dark:bg-violet-950/40 dark:border-violet-900/50",
        iconColor: "text-violet-600 dark:text-violet-400",
      },
      {
        id: "watermark",
        title: "Watermark & Page Numbers",
        description: "Stamp custom CONFIDENTIAL/DRAFT diagonal watermarks and 'Page X of Y' numbering.",
        href: "/tools/watermark-pdf",
        formats: [".PDF"],
        category: "scan_edit" as const,
        popular: false,
        icon: Stamp,
        iconBg: "bg-pink-50 border-pink-100 dark:bg-pink-950/40 dark:border-pink-900/50",
        iconColor: "text-pink-600 dark:text-pink-400",
      },
      {
        id: "sanitize",
        title: "Sanitize PDF Metadata",
        description: "Inspect and permanently purge hidden Author, Creator, XMP, and timestamp metadata.",
        href: "/tools/sanitize-pdf",
        formats: [".PDF"],
        category: "scan_edit" as const,
        popular: false,
        icon: ShieldAlert,
        iconBg: "bg-teal-50 border-teal-100 dark:bg-teal-950/40 dark:border-teal-900/50",
        iconColor: "text-teal-600 dark:text-teal-400",
      },
      {
        id: "pdf-to-images",
        title: t.tools.pdfToImagesTitle,
        description: t.tools.pdfToImagesDesc,
        href: "/tools/pdf-to-images",
        formats: [".PDF", ".ZIP"],
        category: "convert" as const,
        icon: FileImage,
        iconBg: "bg-cyan-50 border-cyan-100 dark:bg-cyan-950/40 dark:border-cyan-900/50",
        iconColor: "text-cyan-600 dark:text-cyan-400",
      },
    ],
    [t, selectedLanguage]
  );

  const filteredTools = useMemo(() => {
    return toolsDirectory.filter((tool) => {
      const matchesSearch =
        tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.formats.some((fmt) => fmt.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;
      if (activeCategory === "all") return true;
      if (activeCategory === "popular") return tool.popular;
      return tool.category === activeCategory;
    });
  }, [searchQuery, activeCategory, toolsDirectory]);

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 selection:bg-rose-100 selection:text-rose-900 transition-colors duration-200"
    >
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
            <Link href="/tools/edit-pdf" className="hover:text-rose-600 transition-colors font-bold text-rose-600 dark:text-rose-400">
              Edit PDF Text
            </Link>
            <Link href="/tools/compress-pdf" className="hover:text-rose-600 transition-colors">
              {t.tools.compressTitle}
            </Link>
            <Link href="/tools/merge-pdf" className="hover:text-rose-600 transition-colors">
              {t.nav.merge}
            </Link>
            <Link href="/tools/scan" className="hover:text-rose-600 transition-colors">
              {t.nav.scan}
            </Link>

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
                          <span className="font-semibold text-xs">{t.tools.mergeTitle}</span>
                        </Link>
                        <Link
                          href="/tools/split-pdf"
                          onClick={() => setIsMegaMenuOpen(false)}
                          className="flex items-center gap-2.5 rounded-lg p-2 text-slate-700 hover:bg-slate-50 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Split className="h-4 w-4 text-blue-500" />
                          <span className="font-semibold text-xs">{t.tools.splitTitle}</span>
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
                          href="/tools/edit-pdf"
                          onClick={() => setIsMegaMenuOpen(false)}
                          className="flex items-center gap-2.5 rounded-lg p-2 text-slate-700 hover:bg-slate-50 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                        >
                          <FileEdit className="h-4 w-4 text-rose-500" />
                          <span className="font-semibold text-xs">Edit PDF Text</span>
                        </Link>
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

          {/* Right Controls */}
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

            <div className="relative hidden lg:block w-44">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={t.nav.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
              />
            </div>

            <div className="relative" ref={langDropdownRef}>
              <button
                type="button"
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              >
                <Globe className="h-3.5 w-3.5 text-slate-500" />
                <span>{selectedLanguage}</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {isLangOpen && (
                <div className="absolute right-0 mt-1.5 w-32 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg dark:border-slate-800 dark:bg-slate-900 z-50">
                  {(["EN", "FR", "ES", "RU", "AR"] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => handleLanguageChange(lang)}
                      className={`flex w-full items-center justify-between px-3 py-1.5 text-xs font-medium transition-colors ${
                        selectedLanguage === lang
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

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 pt-10 pb-20 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="mx-auto max-w-4xl text-center space-y-5">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-slate-900 dark:text-white">
            {t.hero.titleStart}{" "}
            <span className="text-rose-600">{t.hero.titleHighlight}</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {t.hero.subtitle}
          </p>

          {/* ================================================================ */}
          {/* HERO "DROP YOUR PDF HERE" INTERACTIVE LAUNCHER                   */}
          {/* ================================================================ */}
          <div className="pt-2 max-w-2xl mx-auto">
            <input
              ref={heroFileInputRef}
              type="file"
              accept=".pdf,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp"
              multiple
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleHeroFilesPicked(e.target.files);
                  e.target.value = "";
                }
              }}
              className="hidden"
            />

            {droppedFiles.length === 0 ? (
              <div
                onClick={() => heroFileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingHero(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingHero(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingHero(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleHeroFilesPicked(e.dataTransfer.files);
                  }
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    heroFileInputRef.current?.click();
                  }
                }}
                className={`group relative overflow-hidden rounded-3xl border-2 border-dashed p-7 sm:p-9 transition-all duration-300 cursor-pointer shadow-lg ${
                  isDraggingHero
                    ? "border-rose-500 bg-rose-50/90 scale-[1.01] shadow-rose-500/20 dark:border-rose-500 dark:bg-rose-950/30"
                    : "border-rose-300/90 bg-gradient-to-br from-rose-50/70 via-white to-orange-50/50 hover:border-rose-500 hover:shadow-xl hover:shadow-rose-500/10 dark:border-rose-900/60 dark:from-slate-900 dark:via-slate-900 dark:to-rose-950/20"
                }`}
              >
                {/* Subtle decorative background glow */}
                <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-rose-500/10 blur-2xl transition-transform group-hover:scale-125" />
                <div className="pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-orange-500/10 blur-2xl transition-transform group-hover:scale-125" />

                <div className="relative flex flex-col items-center justify-center space-y-3.5">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-600 to-orange-500 text-white shadow-md shadow-rose-600/25 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                    <UploadCloud className="h-8 w-8" />
                  </div>

                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100/90 dark:bg-rose-950/70 px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                      <Sparkles className="h-3 w-3" />
                      <span>Instant Tool Launcher</span>
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      DROP YOUR PDF HERE
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                      Drag & drop your PDF (or click to browse) — then pick any tool to open it immediately
                    </p>
                  </div>

                  <div className="pt-1 flex flex-wrap items-center justify-center gap-3">
                    <span className="inline-flex items-center gap-2 rounded-xl bg-rose-600 group-hover:bg-rose-500 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm shadow-rose-600/20 transition-all">
                      <FileText className="h-4 w-4" />
                      <span>Select PDF File</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white/90 dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      <span>100% Local & Private</span>
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* ============================================================== */
              /* FILE DROPPED -> INTERACTIVE TOOL SELECTOR LAUNCHER             */
              /* ============================================================== */
              <div className="rounded-3xl border-2 border-rose-500/80 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl shadow-rose-500/10 text-left space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-400">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate max-w-[220px] sm:max-w-md">
                          {droppedFiles[0].name}
                        </h3>
                        {droppedFiles.length > 1 && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            +{droppedFiles.length - 1} more
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatFileSize(
                          droppedFiles.reduce((acc, f) => acc + f.size, 0)
                        )}{" "}
                        • Ready in browser memory — choose a tool below to open directly:
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => heroFileInputRef.current?.click()}
                      className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      Change File
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDroppedFiles([]);
                        if (typeof window !== "undefined") {
                          window.__pdfStudioPendingFiles = null;
                        }
                      }}
                      className="rounded-xl border border-slate-200 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:border-slate-800 dark:bg-slate-900 p-1.5 text-slate-400 transition-colors"
                      title="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-3 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Select a PDF Tool to Open Your File Immediately:</span>
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {toolsDirectory.map((tool) => {
                      const Icon = tool.icon;
                      return (
                        <button
                          key={tool.id}
                          type="button"
                          onClick={() => handleLaunchToolWithFile(tool.href)}
                          className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/70 hover:bg-white hover:border-rose-500 hover:shadow-md p-3 text-left transition-all dark:border-slate-800 dark:bg-slate-800/50 dark:hover:bg-slate-800 dark:hover:border-rose-500 cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${tool.iconBg} ${tool.iconColor} group-hover:scale-105 transition-transform`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-rose-600 truncate">
                                {tool.title}
                              </p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                Open directly →
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-3">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeCategory === "all"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {t.filters.all} ({toolsDirectory.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory("popular")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeCategory === "popular"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {t.filters.popular} (6)
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory("scan_edit")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeCategory === "scan_edit"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {t.filters.scan_edit} (5)
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory("organize")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeCategory === "organize"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {t.filters.organize} (4)
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory("convert")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeCategory === "convert"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {t.filters.convert} (3)
            </button>
          </div>
        </div>

        {/* Ad Placement */}
        <div className="my-10">
          <AdBanner format="leaderboard" />
        </div>

        {/* Tool Cards Responsive Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.id}
                href={tool.href}
                onClick={() => {
                  if (typeof window !== "undefined" && droppedFiles.length > 0) {
                    window.__pdfStudioPendingFiles = droppedFiles;
                  }
                }}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/60 dark:hover:border-slate-700"
              >
                <div>
                  <div className="flex items-start justify-between mb-3.5">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl border ${tool.iconBg} ${tool.iconColor} transition-transform group-hover:scale-105`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    {tool.popular && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-xs shadow-orange-500/20">
                        <Sparkles className="h-2.5 w-2.5" />
                        <span>Popular</span>
                      </span>
                    )}
                  </div>

                  <h2 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-rose-600 transition-colors">
                    {tool.title}
                  </h2>
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                  <div className="flex items-center gap-1.5">
                    {tool.formats.map((fmt) => (
                      <span
                        key={fmt}
                        className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase"
                      >
                        {fmt}
                      </span>
                    ))}
                  </div>

                  <ArrowRight
                    className={`h-3.5 w-3.5 text-slate-300 dark:text-slate-600 transition-transform group-hover:text-rose-600 ${
                      isRTL ? "group-hover:-translate-x-1 rotate-180" : "group-hover:translate-x-1"
                    }`}
                  />
                </div>
              </Link>
            );
          })}
        </div>

        {/* TRUST SECTION */}
        <section className="mt-20 border-t border-slate-200/80 dark:border-slate-800 pt-16">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {t.trust.title}
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {t.trust.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900/50 mb-3">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t.trust.zeroUploads}</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {t.trust.zeroUploadsDesc}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-950/40 dark:border-amber-900/50 mb-3">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t.trust.speed}</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {t.trust.speedDesc}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/40 dark:border-rose-900/50 mb-3">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t.trust.privacy}</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {t.trust.privacyDesc}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/40 dark:border-blue-900/50 mb-3">
                <Globe className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t.trust.portability}</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {t.trust.portabilityDesc}
              </p>
            </div>
          </div>
        </section>

        {/* HOMEPAGE FAQ SECTION */}
        <section className="mt-16 rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2.5 mb-2">
            <HelpCircle className="h-6 w-6 text-rose-600" />
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              Frequently Asked Questions
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-8">
            Everything you need to know about our privacy-first, client-side PDF tools.
          </p>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {HOMEPAGE_FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="py-4">
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="flex w-full items-center justify-between text-left text-sm sm:text-base font-bold text-slate-900 dark:text-white hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-rose-600 dark:text-rose-400" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {faq.answer}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* FORMATS BADGE BAR */}
        <section className="mt-12 rounded-2xl border border-slate-200 bg-slate-50/70 p-6 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t.formats.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.formats.subtitle}
              </p>
            </div>
            <span className="rounded-full bg-white dark:bg-slate-800 px-3 py-1 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {t.formats.badge}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-850 dark:bg-slate-900">
              <span className="font-mono text-xs font-bold text-rose-600">PDF</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Read & Compile</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-850 dark:bg-slate-900">
              <span className="font-mono text-xs font-bold text-blue-600">DOCX</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Word Parser</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-850 dark:bg-slate-900">
              <span className="font-mono text-xs font-bold text-emerald-600">XLSX</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Spreadsheets</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-850 dark:bg-slate-900">
              <span className="font-mono text-xs font-bold text-amber-600">PPTX</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Presentations</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-850 dark:bg-slate-900">
              <span className="font-mono text-xs font-bold text-purple-600">JPG / PNG</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Lossless Raster</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-850 dark:bg-slate-900">
              <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300">TXT / MD</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Clean Text</p>
            </div>
          </div>
        </section>

        {/* PSEO INTERNAL LINKING HUB ON HOMEPAGE */}
        <section className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-rose-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Popular Document Workflows & Presets
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {POPULAR_PSEO_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-rose-400 hover:bg-white hover:text-rose-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 transition-colors"
              >
                <span>{item.label}</span>
                <ArrowRight className="h-3 w-3 text-slate-400" />
              </Link>
            ))}
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 py-12 text-xs text-slate-600 dark:text-slate-400">
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
                <li><Link href="/tools/edit-pdf" className="hover:text-rose-600 font-semibold">Edit PDF Text</Link></li>
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
                  onClick={() => handleLanguageChange(lang)}
                  className={`rounded px-2.5 py-1 text-xs transition-colors ${
                    selectedLanguage === lang
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

      {/* PWA Installation Help Modal */}
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
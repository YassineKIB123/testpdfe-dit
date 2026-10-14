import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://pdftool.fenangplay.workers.dev";
const ADSENSE_ID = process.env.NEXT_PUBLIC_ADSENSE_ID || "";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  verification: {
    google: "TX_b_Rg1BBdC31WpXrXvxkBgRWD0LJ2tilIg3Iw9CV0",
  },
  title: {
    default: "PDFStudio — Free, Fast & 100% Private PDF Tools",
    template: "%s | PDFStudio",
  },
  description:
    "Every PDF tool you need, all in one place. Edit, merge, split, compress, scan, sign, convert, and rotate PDFs with 100% client-side browser privacy. Your files never leave your device.",
  keywords: [
    "PDF tools",
    "edit PDF text online",
    "free PDF merge",
    "compress PDF under 100kb",
    "PDF scanner",
    "sign PDF online",
    "convert PDF to word",
    "split PDF",
    "client-side PDF",
    "private PDF editor",
  ],
  authors: [{ name: "PDFStudio Team" }],
  creator: "PDFStudio",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "PDFStudio",
    title: "PDFStudio — Free, Fast & 100% Private PDF Tools",
    description:
      "All-in-one PDF suite that processes files directly in your browser. Zero cloud uploads, total file privacy.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PDFStudio — Free & 100% Private PDF Tools",
    description:
      "Edit, Scan, Sign, Compress, Merge, Split, and Convert PDFs client-side without servers.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "PDFStudio",
    url: SITE_URL,
    applicationCategory: "BusinessApplication",
    operatingSystem: "All",
    browserRequirements:
      "Requires modern web browser with WebAssembly and HTML5 Canvas support",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Sejda-Style In-Place PDF Text Editor",
      "Mobile and Web Camera Document Scanner with Auto-Edge Detection",
      "Multi-Level PDF Compression (Extreme, Recommended, Lossless)",
      "Digital Electronic PDF Signing, Stamps & Initials",
      "PDF Merge, Visual Split, and Page Rotation",
      "Universal Word, Excel, PowerPoint, Text, and Image to PDF Conversion",
      "100% Client-Side Privacy Guarantee with Offline PWA Support",
    ],
  };

  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {ADSENSE_ID && (
          <Script
            id="adsense-init"
            async
            strategy="afterInteractive"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_ID}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body
        className={`${inter.className} min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 antialiased`}
      >
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
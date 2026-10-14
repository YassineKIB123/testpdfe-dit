import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  generateAllPseoPages,
  getPseoPage,
  BASE_SITE_URL,
} from "@/lib/pseo/pseo-data";
import { PseoToolRenderer } from "@/components/pseo/PseoToolRenderer";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { ArrowRight, Sparkles } from "lucide-react";

export const dynamic = "force-static";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const allPages = generateAllPseoPages();
  return allPages
    .filter((p) => p.locale === "en")
    .map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getPseoPage("en", slug);
  if (!page) return {};

  const url = `${BASE_SITE_URL}/${slug}`;

  return {
    title: page.title,
    description: page.metaDescription,
    alternates: {
      canonical: url,
      languages: {
        en: url,
        fr: `${BASE_SITE_URL}/fr/${slug}`,
        es: `${BASE_SITE_URL}/es/${slug}`,
        ru: `${BASE_SITE_URL}/ru/${slug}`,
        ar: `${BASE_SITE_URL}/ar/${slug}`,
        "x-default": url,
      },
    },
    openGraph: {
      title: page.title,
      description: page.metaDescription,
      url,
      siteName: "PDFStudio",
      type: "website",
    },
  };
}

export default async function PseoSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const page = getPseoPage("en", slug);

  if (!page) notFound();

  const jsonLdHowTo = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: page.h1,
    description: page.metaDescription,
    step: page.steps.map((s, idx) => ({
      "@type": "HowToStep",
      position: idx + 1,
      name: s.title,
      text: s.desc,
    })),
  };

  const jsonLdFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdHowTo) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />

      <ToolLayout
        title={page.h1}
        description={page.intro}
        faqs={page.faqs.map((f) => ({ question: f.q, answer: f.a }))}
        hideSeoMeta={true}
      >
        <div className="space-y-8">
          {/* Interactive Tool Workspace (Rendered without nested ToolLayout) */}
          <PseoToolRenderer toolType={page.toolType} targetKb={page.targetKb} />

          {/* Value Proposition Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            {page.benefits.map((b, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-900/50"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 mb-2 font-bold text-xs">
                  ✓
                </div>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                  {b}
                </p>
              </div>
            ))}
          </div>

          {/* Internal Linking Hub: Popular Variations for Crawlability */}
          {page.variationLinks.length > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-800 pt-6 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Sparkles className="h-3.5 w-3.5 text-rose-600" />
                <span>Popular {page.baseSlug.replace(/-/g, " ")} Presets & Use Cases</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {page.variationLinks.map((v) => (
                  <Link
                    key={v.href}
                    href={v.href}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-rose-400 hover:bg-white hover:text-rose-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-rose-500 transition-colors"
                  >
                    <span>{v.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Related Core Tools */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-6 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Related PDF Tools
            </h3>
            <div className="flex flex-wrap gap-2">
              {page.relatedSlugs.map((rel) => (
                <Link
                  key={rel.href}
                  href={rel.href}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-rose-400 hover:text-rose-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 transition-colors"
                >
                  <span>{rel.label}</span>
                  <ArrowRight className="h-3 w-3 text-slate-400" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </ToolLayout>
    </>
  );
}
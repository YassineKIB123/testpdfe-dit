import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pdftool.fenangplay.workers.dev";
const URLS_PER_SITEMAP = 500;
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const ROOT_DIR = path.join(__dirname, "..");

console.log("=== PDFStudio Prebuild Cleaner v0.2.1 ===");
console.log("Project root entries before cleanup:", fs.readdirSync(ROOT_DIR));

// Clean up any stale legacy root-level app/components/lib/pages folders OR stale .next build cache that conflicts with src/app
for (const legacyDir of ["app", "components", "lib", "pages", ".next", "out"]) {
  const fullLegacyPath = path.join(ROOT_DIR, legacyDir);
  if (fs.existsSync(fullLegacyPath)) {
    console.log(`Removing stale root directory "${legacyDir}/"...`);
    fs.rmSync(fullLegacyPath, { recursive: true, force: true });
  }
}

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

const CORE_TOOLS = [
  { type: "edit", slug: "edit-pdf" },
  { type: "compress", slug: "compress-pdf" },
  { type: "merge", slug: "merge-pdf" },
  { type: "split", slug: "split-pdf" },
  { type: "sign", slug: "sign-pdf" },
  { type: "scan", slug: "scan-pdf" },
  { type: "watermark", slug: "watermark-pdf" },
  { type: "sanitize", slug: "sanitize-pdf" },
  { type: "rotate", slug: "rotate-pdf" },
  { type: "pdf-to-word", slug: "pdf-to-word" },
  { type: "word-to-pdf", slug: "word-to-pdf" },
  { type: "pdf-to-excel", slug: "pdf-to-excel" },
  { type: "excel-to-pdf", slug: "excel-to-pdf" },
  { type: "pdf-to-powerpoint", slug: "pdf-to-powerpoint" },
  { type: "powerpoint-to-pdf", slug: "powerpoint-to-pdf" },
  { type: "jpg-to-pdf", slug: "jpg-to-pdf" },
  { type: "pdf-to-jpg", slug: "pdf-to-jpg" },
  { type: "png-to-pdf", slug: "png-to-pdf" },
  { type: "pdf-to-png", slug: "pdf-to-png" },
  { type: "pdf-to-text", slug: "pdf-to-text" },
  { type: "text-to-pdf", slug: "text-to-pdf" },
];

const MODIFIERS = [
  { id: "for-resumes" },
  { id: "for-email" },
  { id: "for-contracts" },
  { id: "for-invoices" },
  { id: "for-bank-statements" },
  { id: "for-tax-forms" },
  { id: "for-students" },
  { id: "for-teachers" },
  { id: "for-lawyers" },
  { id: "for-real-estate" },
  { id: "for-accountants" },
  { id: "for-medical-records" },
  { id: "for-ebooks" },
  { id: "for-research-papers" },
  { id: "for-passports-and-visas" },
  {
    id: "under-100kb",
    compatibleTools: ["compress", "scan", "jpg-to-pdf", "png-to-pdf", "word-to-pdf"],
  },
  {
    id: "under-200kb",
    compatibleTools: ["compress", "scan", "jpg-to-pdf", "png-to-pdf", "word-to-pdf"],
  },
  {
    id: "under-500kb",
    compatibleTools: ["compress", "scan", "jpg-to-pdf", "png-to-pdf", "word-to-pdf", "merge"],
  },
  {
    id: "under-1mb",
    compatibleTools: ["compress", "scan", "jpg-to-pdf", "png-to-pdf", "word-to-pdf", "merge"],
  },
  {
    id: "under-2mb",
    compatibleTools: ["compress", "scan", "jpg-to-pdf", "png-to-pdf", "word-to-pdf", "merge"],
  },
  { id: "on-mac" },
  { id: "on-windows" },
  { id: "on-iphone" },
  { id: "on-android" },
  { id: "on-chromebook" },
  { id: "offline" },
  { id: "without-uploading" },
  { id: "without-watermark" },
  {
    id: "lossless-quality",
    compatibleTools: ["compress", "merge", "split", "rotate", "jpg-to-pdf", "png-to-pdf", "pdf-to-jpg", "pdf-to-png"],
  },
  {
    id: "editable-text",
    compatibleTools: ["edit", "pdf-to-word", "pdf-to-excel", "pdf-to-powerpoint", "pdf-to-text"],
  },
  {
    id: "high-resolution-300dpi",
    compatibleTools: ["scan", "pdf-to-jpg", "pdf-to-png", "jpg-to-pdf", "png-to-pdf"],
  },
  { id: "no-file-limit" },
  { id: "for-job-applications" },
  { id: "for-court-filings" },
  { id: "for-scholarships" },
];

const LOCALES = ["en", "fr", "es", "ru", "ar"];

console.log("Generating Smart Programmatic SEO URLs...");

// Remove old sitemap chunks first so stale files don't linger
for (const existing of fs.readdirSync(PUBLIC_DIR)) {
  if (/^sitemap_\d+\.xml$/.test(existing)) {
    fs.unlinkSync(path.join(PUBLIC_DIR, existing));
  }
}

const allUrls = [];
const today = new Date().toISOString().split("T")[0];

// 1. Root homepage
allUrls.push({ loc: `${SITE_URL}`, priority: "1.0", changefreq: "daily" });

// 2. Core dedicated tool pages (/tools/*)
const DEDICATED_TOOL_PATHS = [
  "/tools/edit-pdf",
  "/tools/compress-pdf",
  "/tools/merge-pdf",
  "/tools/split-pdf",
  "/tools/rotate-pdf",
  "/tools/sign-pdf",
  "/tools/scan",
  "/tools/convert",
  "/tools/images-to-pdf",
  "/tools/pdf-to-images",
  "/tools/watermark-pdf",
  "/tools/sanitize-pdf",
];
for (const toolPath of DEDICATED_TOOL_PATHS) {
  allUrls.push({ loc: `${SITE_URL}${toolPath}`, priority: "0.95", changefreq: "weekly" });
}

// 3. Base tool slugs across ALL 5 locales (including /fr/compress-pdf, /ar/merge-pdf, etc.)
for (const locale of LOCALES) {
  for (const tool of CORE_TOOLS) {
    const url = locale === "en" ? `${SITE_URL}/${tool.slug}` : `${SITE_URL}/${locale}/${tool.slug}`;
    allUrls.push({
      loc: url,
      priority: locale === "en" ? "0.95" : "0.90",
      changefreq: "weekly",
    });
  }
}

// 4. Compatible modifier permutations across all 5 locales
for (const locale of LOCALES) {
  for (const tool of CORE_TOOLS) {
    for (const mod of MODIFIERS) {
      if (mod.compatibleTools && !mod.compatibleTools.includes(tool.type)) {
        continue;
      }
      const slug = `${tool.slug}-${mod.id}`;
      const url = locale === "en" ? `${SITE_URL}/${slug}` : `${SITE_URL}/${locale}/${slug}`;
      allUrls.push({ loc: url, priority: "0.85", changefreq: "monthly" });
    }
  }
}

console.log(`Generated ${allUrls.length} high-intent, non-duplicate URLs.`);

const totalSitemaps = Math.ceil(allUrls.length / URLS_PER_SITEMAP);
const sitemapFilenames = [];

for (let i = 0; i < totalSitemaps; i++) {
  const chunk = allUrls.slice(i * URLS_PER_SITEMAP, (i + 1) * URLS_PER_SITEMAP);
  const sitemapNumber = i + 1;
  const fileName = `sitemap_${sitemapNumber}.xml`;
  sitemapFilenames.push(fileName);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const item of chunk) {
    xml += `  <url>\n`;
    xml += `    <loc>${item.loc}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>${item.changefreq}</changefreq>\n`;
    xml += `    <priority>${item.priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  xml += `</urlset>\n`;
  fs.writeFileSync(path.join(PUBLIC_DIR, fileName), xml, "utf-8");
  console.log(`Saved: public/${fileName} (${chunk.length} URLs)`);
}

let indexXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
indexXml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

for (const fileName of sitemapFilenames) {
  indexXml += `  <sitemap>\n`;
  indexXml += `    <loc>${SITE_URL}/${fileName}</loc>\n`;
  indexXml += `    <lastmod>${today}</lastmod>\n`;
  indexXml += `  </sitemap>\n`;
}

indexXml += `</sitemapindex>\n`;
fs.writeFileSync(path.join(PUBLIC_DIR, "sitemap.xml"), indexXml, "utf-8");
console.log(`Saved master index: public/sitemap.xml (referencing ${totalSitemaps} sitemaps)`);

const robotsTxt = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
fs.writeFileSync(path.join(PUBLIC_DIR, "robots.txt"), robotsTxt, "utf-8");
console.log(`Saved: public/robots.txt`);
# PDFStudio (`pdftool`) — 100% Client-Side PDF Suite & Programmatic SEO Engine

PDFStudio is a privacy-first, 100% client-side PDF toolkit built with **Next.js 16 (Static Export)**, **Tailwind CSS v4**, `pdf-lib`, `pdfjs-dist`, and **Cloudflare Workers Static Assets**. Every document operation runs locally inside the user's browser memory with zero server uploads.

## Core Tools Included

1. **Compress PDF (`/tools/compress-pdf`)**: Multi-tier compression (`Extreme`, `Recommended`, `Lossless Stream`) combining PDF object-stream packing with PDF.js canvas DPI downsampling and `< 100 KB` / `< 200 KB` target presets.
2. **Merge PDF (`/tools/merge-pdf`)**: Combine multiple PDFs in custom drag/arrow order.
3. **Split PDF (`/tools/split-pdf`)**: Interactive visual page thumbnail selector + custom range (`1-3, 5`) and Odd/Even presets.
4. **Rotate PDF (`/tools/rotate-pdf`)**: Per-page and batch `+90°`/`-90°` permanent rotation with memory-safe `Blob` Object URL thumbnails.
5. **Sign & Stamp PDF (`/tools/sign-pdf`)**: High-DPI Bézier signature drawing pad, typed cursive signatures, image/stamp uploads, `localStorage` saved signatures, `+ Date` and `+ Check ✓` stamps, and optional diagonal watermarks.
6. **Scan to PDF (`/tools/scan`)**: Mobile/desktop camera capture, automatic Sobel/luminance document edge detection (`detectDocumentCorners`), Web Worker perspective warping, and LUT-accelerated `Magic Color` / `B&W` thresholding.
7. **Universal Converter (`/tools/convert`)**: Convert Word (`.docx`), Excel (`.xlsx`/`.csv`), PowerPoint (`.pptx`), Plain Text/Markdown, and Images to and from PDF with Unicode/RTL canvas fallback for Arabic and Cyrillic scripts.
8. **Images to PDF (`/tools/images-to-pdf`)**: Convert JPG, PNG, and WebP collections into A4 or Fit-to-Image PDFs with live sheet and margin preview.
9. **PDF to Images (`/tools/pdf-to-images`)**: Render PDF pages to 150 DPI or 300 DPI PNG/JPG images individually or packaged as a ZIP archive.
10. **Watermark & Page Numbers PDF (`/tools/watermark-pdf`)**: Stamp custom diagonal text watermarks and `Page X of Y` numbering across all pages.
11. **Sanitize & Strip PDF Metadata (`/tools/sanitize-pdf`)**: Inspect and permanently purge hidden Author, Creator, Producer, and timestamp metadata streams.

## Development & Deployment

```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Generate smart XML sitemaps and build static export (out/)
npm run build
```

"use client";

import React from "react";
import { ToolType } from "@/lib/pseo/pseo-data";
import { EmbeddedToolProvider } from "@/components/tools/ToolLayout";
import CompressPdfPage from "@/app/tools/compress-pdf/page";
import MergePdfPage from "@/app/tools/merge-pdf/page";
import SplitPdfPage from "@/app/tools/split-pdf/page";
import RotatePdfPage from "@/app/tools/rotate-pdf/page";
import SignPdfPage from "@/app/tools/sign-pdf/page";
import ScanToPdfPage from "@/app/tools/scan/page";
import UniversalConverterPage from "@/app/tools/convert/page";
import ImagesToPdfPage from "@/app/tools/images-to-pdf/page";
import PdfToImagesPage from "@/app/tools/pdf-to-images/page";
import WatermarkPdfPage from "@/app/tools/watermark-pdf/page";
import SanitizePdfPage from "@/app/tools/sanitize-pdf/page";
import EditPdfPage from "@/app/tools/edit-pdf/page";

interface PseoToolRendererProps {
  toolType: ToolType;
  targetKb?: number;
}

export function PseoToolRenderer({ toolType, targetKb }: PseoToolRendererProps) {
  const renderTool = () => {
    switch (toolType) {
      case "compress":
        return <CompressPdfPage targetKb={targetKb} />;
      case "merge":
        return <MergePdfPage />;
      case "split":
        return <SplitPdfPage />;
      case "rotate":
        return <RotatePdfPage />;
      case "sign":
        return <SignPdfPage />;
      case "edit":
        return <EditPdfPage />;
      case "scan":
        return <ScanToPdfPage />;
      case "watermark":
        return <WatermarkPdfPage />;
      case "sanitize":
        return <SanitizePdfPage />;
      case "jpg-to-pdf":
      case "png-to-pdf":
        return <ImagesToPdfPage />;
      case "pdf-to-jpg":
      case "pdf-to-png":
        return <PdfToImagesPage initialFormat={toolType === "pdf-to-jpg" ? "jpeg" : "png"} />;
      case "pdf-to-word":
      case "word-to-pdf":
      case "pdf-to-excel":
      case "excel-to-pdf":
      case "pdf-to-powerpoint":
      case "powerpoint-to-pdf":
      case "pdf-to-text":
      case "text-to-pdf":
      default:
        return <UniversalConverterPage initialToolType={toolType} />;
    }
  };

  return <EmbeddedToolProvider>{renderTool()}</EmbeddedToolProvider>;
}

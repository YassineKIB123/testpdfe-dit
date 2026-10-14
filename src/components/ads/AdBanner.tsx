"use client";

import React from "react";

interface AdBannerProps {
  format: "leaderboard" | "rectangle";
  className?: string;
  slotId?: string;
  showPlaceholder?: boolean;
}

export function AdBanner({
  format,
  className = "",
  slotId,
  showPlaceholder = false,
}: AdBannerProps) {
  const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_ID;

  // Render nothing if no live AdSense client is configured and placeholder is off
  if (!adsenseId && !showPlaceholder) {
    return null;
  }

  const isLeaderboard = format === "leaderboard";

  return (
    <aside
      aria-label="Advertisement"
      className={`mx-auto flex flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/50 p-2 text-center transition-all ${
        isLeaderboard
          ? "w-full max-w-[728px] min-h-[90px] sm:min-h-[100px]"
          : "w-[300px] min-h-[250px]"
      } ${className}`}
    >
      {adsenseId ? (
        <>
          <span className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Advertisement
          </span>
          <ins
            className="adsbygoogle"
            style={{ display: "block" }}
            data-ad-client={adsenseId}
            data-ad-slot={slotId || "default"}
            data-ad-format={isLeaderboard ? "horizontal" : "rectangle"}
            data-full-width-responsive="true"
          />
        </>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white py-3 text-xs text-slate-400">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Advertisement
          </span>
          <span className="mt-1 text-[11px] font-medium text-slate-400">
            {isLeaderboard ? "Leaderboard (728x90)" : "Rectangle (300x250)"}
          </span>
        </div>
      )}
    </aside>
  );
}
import {
  BarChart3,
  Download,
  ImageIcon,
  Loader2,
  Maximize2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { DeploymentMetrics, GeneratedImage } from "#/hooks/use-chat";
import { cn } from "#/lib/utils";
import MetricsDashboard from "./MetricsDashboard";

const LABEL_MAP: Record<string, string> = {
  vehicle_wrap: "Vehicle Wrap Concept",
  brand_lifestyle: "Brand Lifestyle",
  store_interior: "Store Interior",
  deployment_scene: "Deployment Scene",
};

type TabId = "concepts" | "metrics";

interface ImageShowcasePanelProps {
  images: GeneratedImage[];
  metrics: DeploymentMetrics | null;
  isGenerating: boolean;
}

export default function ImageShowcasePanel({
  images,
  metrics,
  isGenerating,
}: ImageShowcasePanelProps) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [loadedSet, setLoadedSet] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<TabId>("concepts");

  useEffect(() => {
    if (metrics && images.length > 0) {
      setActiveTab("metrics");
    }
  }, [metrics, images.length]);

  const markLoaded = (filename: string) => {
    setLoadedSet((prev) => new Set(prev).add(filename));
  };

  const hasContent = images.length > 0 || isGenerating || metrics;

  if (!hasContent) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-5 bg-[#09090b] px-8">
        <div className="showcase-empty-icon relative flex h-20 w-20 items-center justify-center rounded-2xl border border-[rgba(163,130,255,0.12)] bg-[rgba(168,85,247,0.05)]">
          <ImageIcon className="h-8 w-8 text-purple-500/40" />
          <div className="absolute inset-0 animate-pulse rounded-2xl bg-purple-500/5" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-400">
            Brand Concepts Preview
          </p>
          <p className="mt-1.5 max-w-[280px] text-xs leading-relaxed text-zinc-600">
            As you chat about your brand, the AI will automatically generate
            concept visuals and deployment metrics here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-[#09090b]">
      {/* Tabs */}
      <div className="flex shrink-0 items-center gap-1 border-b border-[rgba(163,130,255,0.08)] px-4 pb-0 pt-14">
        <button
          type="button"
          onClick={() => setActiveTab("concepts")}
          className={cn(
            "flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-medium transition-all",
            activeTab === "concepts"
              ? "border-b-2 border-purple-500 bg-purple-500/5 text-purple-300"
              : "text-zinc-500 hover:text-zinc-300",
          )}
        >
          <ImageIcon className="h-3 w-3" />
          Concepts
          {images.length > 0 && (
            <span className="ml-1 rounded-full bg-purple-500/15 px-1.5 py-0.5 text-[10px] tabular-nums text-purple-400">
              {images.length}
            </span>
          )}
        </button>
        {metrics && (
          <button
            type="button"
            onClick={() => setActiveTab("metrics")}
            className={cn(
              "flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-medium transition-all",
              activeTab === "metrics"
                ? "border-b-2 border-purple-500 bg-purple-500/5 text-purple-300"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            <BarChart3 className="h-3 w-3" />
            Metrics
            <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </button>
        )}
      </div>

      {/* Metrics tab */}
      {activeTab === "metrics" && metrics && (
        <div className="showcase-grid flex-1 overflow-y-auto">
          <MetricsDashboard metrics={metrics} />
        </div>
      )}

      {/* Concepts tab */}
      {activeTab === "concepts" && (
        <>
          <div className="showcase-grid flex-1 overflow-y-auto p-4">
            <div
              className={cn(
                "grid gap-3",
                images.length === 1
                  ? "grid-cols-1"
                  : "grid-cols-1 md:grid-cols-2",
              )}
            >
              {images.map((img, i) => (
                <button
                  key={img.filename}
                  type="button"
                  onClick={() => setLightboxIdx(i)}
                  className="showcase-card group relative aspect-video overflow-hidden rounded-xl border border-[rgba(163,130,255,0.1)] bg-[#111113] transition-all duration-300 hover:border-purple-500/30 hover:shadow-[0_0_20px_rgba(168,85,247,0.12)]"
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  {!loadedSet.has(img.filename) && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#111113]">
                      <Loader2 className="h-5 w-5 animate-spin text-purple-500/50" />
                    </div>
                  )}
                  <img
                    src={img.url}
                    alt={LABEL_MAP[img.label] || img.label}
                    className={cn(
                      "h-full w-full object-cover transition-all duration-500",
                      loadedSet.has(img.filename)
                        ? "scale-100 opacity-100"
                        : "scale-105 opacity-0",
                    )}
                    onLoad={() => markLoaded(img.filename)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-3">
                      <span className="text-xs font-medium text-white/90">
                        {LABEL_MAP[img.label] || img.label.replace(/_/g, " ")}
                      </span>
                      <Maximize2 className="h-4 w-4 text-white/70" />
                    </div>
                  </div>
                </button>
              ))}

              {isGenerating &&
                Array.from({ length: Math.max(0, 4 - images.length) }).map(
                  (_, i) => (
                    <div
                      key={`gen-${i}`}
                      className="showcase-card-generating flex aspect-video items-center justify-center rounded-xl border border-[rgba(163,130,255,0.08)] bg-[#111113]"
                      style={{
                        animationDelay: `${(images.length + i) * 120}ms`,
                      }}
                    >
                      <div className="flex flex-col items-center gap-2.5">
                        <div className="relative h-8 w-8">
                          <div className="absolute inset-0 animate-spin rounded-full border-2 border-purple-500/20 border-t-purple-500" />
                        </div>
                        <span className="text-[11px] text-zinc-600">
                          Generating...
                        </span>
                      </div>
                    </div>
                  ),
                )}
            </div>
          </div>

          {images.length > 0 && (
            <div className="flex items-center justify-between border-t border-[rgba(163,130,255,0.08)] px-4 py-2.5">
              <span className="text-xs text-zinc-600">
                {images.length} concept{images.length !== 1 ? "s" : ""}{" "}
                generated
              </span>
              {isGenerating && (
                <span className="flex items-center gap-1.5 text-xs text-purple-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Generating more...
                </span>
              )}
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && images[lightboxIdx] && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: lightbox dismiss
        <div
          className="lightbox-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightboxIdx(null)}
        >
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: stop propagation */}
          <div
            className="lightbox-content relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[lightboxIdx].url}
              alt={
                LABEL_MAP[images[lightboxIdx].label] ||
                images[lightboxIdx].label
              }
              className="max-h-[85vh] rounded-lg object-contain shadow-2xl"
            />
            <div className="absolute -bottom-12 left-0 right-0 flex items-center justify-center gap-3">
              <span className="text-sm font-medium text-white/80">
                {LABEL_MAP[images[lightboxIdx].label] ||
                  images[lightboxIdx].label.replace(/_/g, " ")}
              </span>
              <a
                href={images[lightboxIdx].url}
                download={images[lightboxIdx].filename}
                className="flex items-center gap-1.5 rounded-full bg-purple-600/20 px-3 py-1.5 text-xs text-purple-300 transition hover:bg-purple-600/30"
              >
                <Download className="h-3 w-3" />
                Download
              </a>
            </div>
            <button
              type="button"
              onClick={() => setLightboxIdx(null)}
              className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-white/70 transition hover:bg-zinc-700 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setLightboxIdx(
                      (lightboxIdx - 1 + images.length) % images.length,
                    )
                  }
                  className="absolute -left-14 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-zinc-800/80 text-white/60 transition hover:bg-zinc-700 hover:text-white"
                >
                  &#8249;
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setLightboxIdx((lightboxIdx + 1) % images.length)
                  }
                  className="absolute -right-14 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-zinc-800/80 text-white/60 transition hover:bg-zinc-700 hover:text-white"
                >
                  &#8250;
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

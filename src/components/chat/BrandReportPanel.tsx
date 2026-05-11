import {
  ArrowUpRight,
  BarChart3,
  Box,
  Calendar,
  Clock,
  DollarSign,
  Download,
  Eye,
  Footprints,
  Globe,
  ImageIcon,
  Loader2,
  MapPin,
  Maximize2,
  MessageCircle,
  Package,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
  X,
  Zap,
} from "lucide-react";
import { type ComponentType, useEffect, useRef, useState } from "react";
import type {
  DeploymentMetrics,
  EventRecommendation,
  GeneratedImage,
  PlatformAnalytics,
} from "#/hooks/use-chat";
import { cn } from "#/lib/utils";

/* ─── Constants ─── */

const LABEL_MAP: Record<string, string> = {
  vehicle_wrap: "Vehicle Wrap Concept",
  brand_lifestyle: "Brand Lifestyle",
  store_interior: "Store Interior",
  deployment_scene: "Deployment Scene",
};

const TIMELINE_STEPS = [
  {
    label: "Day 1",
    title: "Strategy Consultation",
    desc: "Brand audit, target audience alignment, and county selection based on your data profile.",
  },
  {
    label: "Week 1",
    title: "Vehicle Wrap & Permits",
    desc: "Custom wrap design, LA County health filings, and TFF application kickoff.",
  },
  {
    label: "Week 2",
    title: "Build-out & Inventory Sync",
    desc: "Modular store assembly, Shopify integration, and fulfillment pipeline setup.",
  },
  {
    label: "Week 3",
    title: "Soft Launch",
    desc: "First deployment at your #1 scored location. Ambassador onboarding and UGC training.",
  },
  {
    label: "Month 1",
    title: "Full Analytics & Optimization",
    desc: "Complete performance report, heatmap insights, and relocation recommendations.",
  },
];

/* ─── Props ─── */

interface BrandReportPanelProps {
  images: GeneratedImage[];
  metrics: DeploymentMetrics | null;
  events: EventRecommendation[];
  analytics: PlatformAnalytics | null;
  isGenerating: boolean;
  onAskAbout: (label: string, value: string) => void;
}

type TabId = "visuals" | "insights";

/* ─── Helpers ─── */

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toLocaleString()}`;
}

function AnimatedBar({
  value,
  max,
  color,
  label,
  delay = 0,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
  delay?: number;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="font-semibold" style={{ color }}>
          {value}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-800/60">
        <div
          className="metric-bar h-full rounded-full"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            animationDelay: `${delay}ms`,
          }}
        />
      </div>
    </div>
  );
}

function RadarMini({
  scores,
}: {
  scores: DeploymentMetrics["scoring"]["scores"];
}) {
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.36;
  const labels = [
    "Daytime",
    "Pedestrian",
    "Commercial",
    "Affluence",
    "Composite",
  ];
  const colors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444"];
  const values = [
    scores.daytime,
    scores.pedestrian,
    scores.commercial,
    scores.affluence,
    scores.composite,
  ];
  const n = values.length;
  const angleStep = (2 * Math.PI) / n;
  const getPoint = (i: number, r: number) => {
    const angle = angleStep * i - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };
  const dataPoints = values.map((v, i) => getPoint(i, (v / 100) * maxR));
  const pathD =
    dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") +
    "Z";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.25, 0.5, 0.75, 1].map((level) => {
        const pts = Array.from({ length: n }, (_, i) =>
          getPoint(i, maxR * level),
        );
        const d =
          pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") +
          "Z";
        return (
          <path
            key={level}
            d={d}
            fill="none"
            stroke="rgba(163,130,255,0.1)"
            strokeWidth="0.5"
          />
        );
      })}
      {Array.from({ length: n }, (_, i) => {
        const outer = getPoint(i, maxR);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={outer.x}
            y2={outer.y}
            stroke="rgba(163,130,255,0.08)"
            strokeWidth="0.5"
          />
        );
      })}
      <path
        d={pathD}
        fill="rgba(168,85,247,0.15)"
        stroke="#a855f7"
        strokeWidth="1.5"
        className="metric-radar-path"
      />
      {dataPoints.map((p, i) => (
        <circle key={labels[i]} cx={p.x} cy={p.y} r="3.5" fill={colors[i]} />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const pt = getPoint(i, maxR + 18);
        return (
          <text
            key={`l-${labels[i]}`}
            x={pt.x}
            y={pt.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#71717a"
            fontSize="9"
            fontWeight="500"
          >
            {labels[i]}
          </text>
        );
      })}
    </svg>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  badge?: string;
}) {
  return (
    <div className="report-section-header flex items-center gap-2 pb-2 pt-1">
      <Icon className="h-3.5 w-3.5 text-purple-400" />
      <span className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-400">
        {title}
      </span>
      {badge && (
        <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-400">
          {badge}
        </span>
      )}
      <div className="ml-2 h-px flex-1 bg-gradient-to-r from-[rgba(163,130,255,0.15)] to-transparent" />
    </div>
  );
}

/* ─── Clickable context card wrapper ─── */

function AskButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title="Ask about this"
      className="ask-btn absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800/80 opacity-0 ring-1 ring-[rgba(163,130,255,0.2)] transition-all duration-150 hover:bg-purple-500/20 hover:ring-purple-500/40 group-hover:opacity-100"
    >
      <MessageCircle className="h-3 w-3 text-purple-400" />
    </button>
  );
}

/* ─── Tab Bar ─── */

function TabBar({
  active,
  onSwitch,
  hasImages,
  hasInsights,
  isGenerating,
}: {
  active: TabId;
  onSwitch: (t: TabId) => void;
  hasImages: boolean;
  hasInsights: boolean;
  isGenerating: boolean;
}) {
  const tabs: {
    id: TabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    dot?: boolean;
  }[] = [
    {
      id: "visuals",
      label: "Visuals",
      icon: Truck,
      dot: isGenerating,
    },
    {
      id: "insights",
      label: "Insights",
      icon: BarChart3,
      dot: false,
    },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-[rgba(163,130,255,0.1)] bg-[#09090b] px-4 py-2">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onSwitch(t.id)}
          className={cn(
            "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200",
            active === t.id
              ? "bg-purple-500/10 text-purple-300"
              : "text-zinc-500 hover:text-zinc-300",
          )}
        >
          <t.icon className="h-3.5 w-3.5" />
          {t.label}
          {t.dot && (
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-purple-500">
              <span className="absolute inset-0 animate-ping rounded-full bg-purple-500 opacity-75" />
            </span>
          )}
          {active === t.id && (
            <span className="absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-purple-500" />
          )}
        </button>
      ))}
      <div className="ml-auto flex items-center gap-1">
        {(hasImages || isGenerating) && (
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">
            {isGenerating ? "generating..." : `${hasImages ? "ready" : ""}`}
          </span>
        )}
        {hasInsights && (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
            live data
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Visuals Tab ─── */

function ModelViewerSection({
  images,
  isGeneratingImages,
}: {
  images: GeneratedImage[];
  isGeneratingImages: boolean;
}) {
  const [ModelViewer, setModelViewer] = useState<ComponentType<{
    modelUrl: string | null;
    environment?: string;
  }> | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [isGenerating3D, setIsGenerating3D] = useState(false);
  const [status, setStatus] = useState<string>("idle");
  const [error, setError] = useState<string | null>(null);
  const triggeredForRef = useRef<string | null>(null);

  useEffect(() => {
    import("../rodin/ModelViewer").then((mod) => {
      setModelViewer(() => mod.default);
    });
  }, []);

  useEffect(() => {
    if (isGeneratingImages || images.length === 0 || isGenerating3D || modelUrl)
      return;

    const imageKey = images
      .map((img) => img.filename)
      .sort()
      .join(",");
    if (triggeredForRef.current === imageKey) return;
    triggeredForRef.current = imageKey;

    generateModel(images);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images, isGeneratingImages]);

  async function generateModel(imgs: GeneratedImage[]) {
    setIsGenerating3D(true);
    setError(null);
    setStatus("Fetching images...");

    try {
      const formData = new FormData();

      const imgToUse = imgs.find((i) => i.label === "vehicle_wrap") || imgs[0];
      const res = await fetch(imgToUse.url);
      if (!res.ok) throw new Error("Failed to fetch generated image");
      const blob = await res.blob();
      formData.append("images", blob, imgToUse.filename);

      formData.append("prompt", "A branded mobile retail food truck, 3D model");
      formData.append("condition_mode", "concat");
      formData.append("geometry_file_format", "glb");
      formData.append("material", "PBR");
      formData.append("quality", "medium");
      formData.append("use_hyper", "false");
      formData.append("tier", "Regular");
      formData.append("TAPose", "false");
      formData.append("mesh_mode", "Quad");
      formData.append("mesh_simplify", "true");
      formData.append("mesh_smooth", "true");

      setStatus("Submitting to Rodin AI...");
      const submitRes = await fetch("/api/rodin/submit", {
        method: "POST",
        body: formData,
      });

      if (!submitRes.ok) {
        const errBody = await submitRes.text().catch(() => "");
        throw new Error(
          `Rodin submit failed (${submitRes.status}): ${errBody || "unknown error"}`,
        );
      }
      const submitData = await submitRes.json();

      if (!submitData.jobs?.subscription_key || !submitData.uuid) {
        console.error("Unexpected Rodin response:", submitData);
        throw new Error(
          submitData.error ||
            submitData.message ||
            "Unexpected response from Rodin — check your API key",
        );
      }

      setStatus("Generating 3D model...");
      await pollForCompletion(
        submitData.jobs.subscription_key,
        submitData.uuid,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "3D generation failed");
      setIsGenerating3D(false);
      setStatus("idle");
    }
  }

  async function pollForCompletion(subscriptionKey: string, taskUuid: string) {
    try {
      const statusRes = await fetch("/api/rodin/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription_key: subscriptionKey }),
      });

      if (!statusRes.ok) throw new Error("Status check failed");
      const statusData = await statusRes.json();

      if (!statusData.jobs || statusData.jobs.length === 0) {
        throw new Error("No jobs in status response");
      }

      const allDone = statusData.jobs.every(
        (j: { status: string }) => j.status === "Done",
      );
      const anyFailed = statusData.jobs.some(
        (j: { status: string }) => j.status === "Failed",
      );

      if (anyFailed) throw new Error("3D generation failed");

      if (allDone) {
        setStatus("Downloading model...");
        const dlRes = await fetch("/api/rodin/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task_uuid: taskUuid }),
        });

        if (!dlRes.ok) throw new Error("Download request failed");
        const dlData = await dlRes.json();

        if (dlData.list && dlData.list.length > 0) {
          const glbFile = dlData.list.find((f: { name: string }) =>
            f.name.toLowerCase().endsWith(".glb"),
          );
          if (glbFile) {
            const proxyUrl = `/api/rodin/proxy-download?url=${encodeURIComponent(glbFile.url)}`;
            setModelUrl(proxyUrl);
            setIsGenerating3D(false);
            setStatus("done");
            return;
          }
        }
        throw new Error("No GLB file in results");
      }

      const inProgress = statusData.jobs.filter(
        (j: { status: string }) => j.status !== "Done",
      );
      setStatus(
        `Generating... (${statusData.jobs.length - inProgress.length}/${statusData.jobs.length} steps done)`,
      );
      setTimeout(() => pollForCompletion(subscriptionKey, taskUuid), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Polling failed");
      setIsGenerating3D(false);
      setStatus("idle");
    }
  }

  if (!ModelViewer) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-[rgba(163,130,255,0.08)] bg-[#111113]">
        <div className="flex flex-col items-center gap-2.5">
          <div className="relative h-8 w-8">
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-purple-500/20 border-t-purple-500" />
          </div>
          <span className="text-[11px] text-zinc-600">
            Loading 3D viewer...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-xl border border-red-500/20 bg-[#111113] px-4">
        <Box className="h-6 w-6 text-red-400/60" />
        <p className="text-center text-xs text-red-400/80">{error}</p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            triggeredForRef.current = null;
          }}
          className="rounded-full bg-purple-500/10 px-3 py-1 text-[11px] font-medium text-purple-300 transition hover:bg-purple-500/20"
        >
          Retry
        </button>
      </div>
    );
  }

  if (isGenerating3D) {
    return (
      <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-xl border border-[rgba(163,130,255,0.08)] bg-[#111113]">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-purple-500/20 border-t-purple-500" />
          <div
            className="absolute inset-1.5 animate-spin rounded-full border border-purple-400/10 border-t-purple-400/40"
            style={{ animationDuration: "1.5s", animationDirection: "reverse" }}
          />
        </div>
        <span className="text-[11px] text-zinc-500">{status}</span>
      </div>
    );
  }

  if (modelUrl) {
    return (
      <div className="aspect-[4/3] overflow-hidden rounded-xl border border-[rgba(163,130,255,0.1)] bg-[#111113]">
        <ModelViewer modelUrl={modelUrl} environment="night" />
      </div>
    );
  }

  return (
    <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-xl border border-[rgba(163,130,255,0.08)] bg-[#111113]">
      {isGeneratingImages ? (
        <>
          <div className="relative h-8 w-8">
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-purple-500/20 border-t-purple-500" />
          </div>
          <div className="text-center">
            <p className="text-xs text-zinc-500">Waiting for concepts...</p>
            <p className="mt-1 max-w-[200px] text-[11px] text-zinc-600">
              3D model will auto-generate once all brand images are ready.
            </p>
          </div>
        </>
      ) : (
        <>
          <Box className="h-7 w-7 text-purple-500/30" />
          <div className="text-center">
            <p className="text-xs text-zinc-500">3D Model Preview</p>
            <p className="mt-1 max-w-[200px] text-[11px] text-zinc-600">
              Will auto-generate once brand concepts are ready.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function VisualsTab({
  images,
  isGenerating,
  onLightbox,
  loadedSet,
  onLoad,
}: {
  images: GeneratedImage[];
  isGenerating: boolean;
  onLightbox: (i: number) => void;
  loadedSet: Set<string>;
  onLoad: (filename: string) => void;
}) {
  if (isGenerating && images.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 px-8">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-purple-500/20 border-t-purple-500" />
          <div
            className="absolute inset-2 animate-spin rounded-full border border-purple-400/10 border-t-purple-400/40"
            style={{ animationDuration: "1.5s", animationDirection: "reverse" }}
          />
          <ImageIcon className="h-7 w-7 text-purple-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-purple-300">
            Generating Brand Concepts
          </p>
          <p className="mt-1.5 max-w-[280px] text-xs leading-relaxed text-zinc-500">
            Creating vehicle wrap, lifestyle, store interior, and deployment
            scene visuals for your brand...
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-500/60"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!isGenerating && images.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[rgba(163,130,255,0.12)] bg-[rgba(168,85,247,0.05)]">
          <Truck className="h-7 w-7 text-purple-500/40" />
          <div className="absolute inset-0 animate-pulse rounded-2xl bg-purple-500/5" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-400">Vehicle Wraps</p>
          <p className="mt-1 max-w-[260px] text-xs leading-relaxed text-zinc-600">
            Visual concepts of your branded truck will appear here once the
            agent has enough brand info.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="brand-report flex-1 overflow-y-auto px-4 pb-8 pt-4">
      <SectionHeader
        icon={ImageIcon}
        title="Brand Concepts"
        badge={
          isGenerating
            ? "Generating..."
            : images.length > 0
              ? `${images.length} concepts`
              : undefined
        }
      />
      <div
        className={cn(
          "mt-3 grid gap-2.5",
          images.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2",
        )}
      >
        {images.map((img, i) => (
          <button
            key={img.filename}
            type="button"
            onClick={() => onLightbox(i)}
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
              onLoad={() => onLoad(img.filename)}
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
          Array.from({ length: Math.max(0, 4 - images.length) }).map((_, i) => (
            <div
              key={`gen-${i}`}
              className="flex aspect-video items-center justify-center rounded-xl border border-[rgba(163,130,255,0.08)] bg-[#111113]"
            >
              <div className="flex flex-col items-center gap-2.5">
                <div className="relative h-8 w-8">
                  <div className="absolute inset-0 animate-spin rounded-full border-2 border-purple-500/20 border-t-purple-500" />
                </div>
                <span className="text-[11px] text-zinc-600">Generating...</span>
              </div>
            </div>
          ))}
      </div>

      {/* 3D Model Generation */}
      <div className="mt-6">
        <SectionHeader icon={Box} title="3D Model" badge="Rodin AI" />
        <div className="mt-3">
          <ModelViewerSection
            images={images}
            isGeneratingImages={isGenerating}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Insights Tab ─── */

function InsightsTab({
  metrics,
  events,
  analytics,
  onAskAbout,
}: {
  metrics: DeploymentMetrics | null;
  events: EventRecommendation[];
  analytics: PlatformAnalytics | null;
  onAskAbout: (label: string, value: string) => void;
}) {
  const hasAny = metrics || events.length > 0 || analytics;

  if (!hasAny) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[rgba(163,130,255,0.12)] bg-[rgba(168,85,247,0.05)]">
          <BarChart3 className="h-7 w-7 text-purple-500/40" />
          <div className="absolute inset-0 animate-pulse rounded-2xl bg-purple-500/5" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-400">Brand Insights</p>
          <p className="mt-1 max-w-[260px] text-xs leading-relaxed text-zinc-600">
            ROI projections, event matches, and platform analytics will build
            here as you chat.
          </p>
        </div>
      </div>
    );
  }

  const roi = metrics?.roi_projections;
  const cmp = metrics?.comparison;
  const scr = metrics?.scoring;
  const stats = analytics?.platform_stats;

  return (
    <div className="brand-report flex-1 overflow-y-auto px-4 pb-8 pt-4">
      {/* ═══ ROI Projections ═══ */}
      {roi && (
        <div className="report-section mb-5">
          <SectionHeader icon={TrendingUp} title="ROI Projections" />
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {[
              {
                icon: Eye,
                label: "Monthly Impressions",
                value: formatNum(roi.monthly_impressions),
                raw: String(roi.monthly_impressions),
                color: "#a855f7",
                bg: "rgba(168,85,247,0.08)",
              },
              {
                icon: Footprints,
                label: "Foot Traffic",
                value: formatNum(roi.foot_traffic_encounters),
                raw: String(roi.foot_traffic_encounters),
                color: "#3b82f6",
                bg: "rgba(59,130,246,0.08)",
              },
              {
                icon: ShoppingCart,
                label: "Est. Conversions",
                value: formatNum(roi.est_conversions),
                raw: String(roi.est_conversions),
                color: "#10b981",
                bg: "rgba(16,185,129,0.08)",
              },
              {
                icon: DollarSign,
                label: "Projected Revenue",
                value: `$${formatNum(roi.projected_monthly_revenue)}`,
                raw: `$${roi.projected_monthly_revenue} projected monthly`,
                color: "#f59e0b",
                bg: "rgba(245,158,11,0.08)",
              },
            ].map((kpi, i) => (
              <div
                key={kpi.label}
                className="metric-card group relative cursor-pointer overflow-hidden rounded-xl border border-[rgba(163,130,255,0.08)] bg-[#111113] p-3.5 transition-colors hover:border-[rgba(163,130,255,0.22)]"
                style={{ animationDelay: `${i * 80}ms` }}
                onClick={() => onAskAbout(kpi.label, kpi.raw)}
                title="Click to ask the agent about this"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ backgroundColor: kpi.bg }}
                  >
                    <kpi.icon
                      className="h-3.5 w-3.5"
                      style={{ color: kpi.color }}
                    />
                  </div>
                  <span className="text-[10px] leading-tight text-zinc-500">
                    {kpi.label}
                  </span>
                </div>
                <p
                  className="mt-2 text-xl font-bold tabular-nums"
                  style={{ color: kpi.color }}
                >
                  {kpi.value}
                </p>
                <div
                  className="absolute -right-2 -top-2 h-16 w-16 rounded-full opacity-[0.03]"
                  style={{ backgroundColor: kpi.color }}
                />
                <AskButton onClick={() => onAskAbout(kpi.label, kpi.raw)} />
              </div>
            ))}
          </div>
          <div
            className="metric-card group relative mt-2.5 flex cursor-pointer items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 transition-colors hover:border-emerald-500/30"
            style={{ animationDelay: "320ms" }}
            onClick={() =>
              onAskAbout(
                "ROI",
                `${roi.roi_percentage}% on a $${roi.monthly_budget.toLocaleString()}/mo budget`,
              )
            }
            title="Click to ask the agent about this"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Return on Investment</p>
                <p className="text-lg font-bold text-emerald-400">
                  {roi.roi_percentage > 0 ? "+" : ""}
                  {roi.roi_percentage}%
                </p>
              </div>
            </div>
            <div className="text-right text-[10px] text-zinc-600">
              <p>${roi.monthly_budget.toLocaleString()}/mo budget</p>
              <p>
                {roi.days_per_month} days · {roi.num_locations} location
                {roi.num_locations !== 1 ? "s" : ""}
              </p>
            </div>
            <AskButton
              onClick={() =>
                onAskAbout(
                  "ROI",
                  `${roi.roi_percentage}% on a $${roi.monthly_budget.toLocaleString()}/mo budget`,
                )
              }
            />
          </div>
        </div>
      )}

      {/* ═══ Event Matches ═══ */}
      {events.length > 0 && (
        <div className="report-section mb-5">
          <SectionHeader
            icon={Calendar}
            title="Event Matches"
            badge={`${events.length} events`}
          />
          <div className="mt-3 space-y-2">
            {events.map((evt, i) => (
              <div
                key={evt.name}
                className="event-card group relative cursor-pointer rounded-xl border border-[rgba(163,130,255,0.08)] bg-[#111113] p-3 transition-colors hover:border-[rgba(163,130,255,0.2)]"
                style={{ animationDelay: `${i * 60}ms` }}
                onClick={() =>
                  onAskAbout(
                    `Event: ${evt.name}`,
                    `fit score ${evt.fit_score}/100, ${formatNum(evt.total_attendance)} attendance, $${formatNum(evt.projected_daily_revenue)}/day projected revenue at ${evt.location}`,
                  )
                }
                title="Click to ask about this event"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-200">
                        {evt.name}
                      </span>
                      <span className="rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[9px] font-medium text-purple-400">
                        {evt.fit_score}/100
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-zinc-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-2.5 w-2.5" />
                        {evt.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {evt.frequency} · {evt.season}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-2.5 w-2.5" />
                        {formatNum(evt.total_attendance)} attendance
                      </span>
                    </div>
                    {evt.fit_reasons.length > 0 && (
                      <p className="mt-1 text-[10px] italic text-zinc-600">
                        {evt.fit_reasons[0]}
                      </p>
                    )}
                  </div>
                  <div className="ml-3 flex flex-col items-end gap-0.5">
                    <span className="text-sm font-bold tabular-nums text-emerald-400">
                      ${formatNum(evt.projected_daily_revenue)}
                    </span>
                    <span className="text-[9px] text-zinc-600">
                      projected/day
                    </span>
                  </div>
                </div>
                <AskButton
                  onClick={() =>
                    onAskAbout(
                      `Event: ${evt.name}`,
                      `fit score ${evt.fit_score}/100, $${formatNum(evt.projected_daily_revenue)}/day projected at ${evt.location}`,
                    )
                  }
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Channel Comparison ═══ */}
      {cmp && (
        <div className="report-section mb-5">
          <SectionHeader icon={BarChart3} title="Channel Comparison" />
          <div
            className="metric-card mt-3 rounded-xl border border-[rgba(163,130,255,0.08)] bg-[#111113] p-3.5"
            style={{ animationDelay: "400ms" }}
          >
            <p className="mb-3 text-[11px] font-medium text-zinc-500">
              Conversion Rate
            </p>
            <div className="space-y-2.5">
              <AnimatedBar
                value={cmp.mobile_conversion}
                max={20}
                color="#a855f7"
                label="Mobile Retail"
                delay={500}
              />
              <AnimatedBar
                value={cmp.traditional_conversion}
                max={20}
                color="#3b82f6"
                label="Traditional Lease"
                delay={600}
              />
              <AnimatedBar
                value={cmp.digital_conversion}
                max={20}
                color="#f59e0b"
                label="Digital Ads"
                delay={700}
              />
            </div>
          </div>
          <div
            className="metric-card mt-2.5 grid grid-cols-3 gap-2 rounded-xl border border-[rgba(163,130,255,0.08)] bg-[#111113] p-3.5"
            style={{ animationDelay: "480ms" }}
          >
            {[
              {
                label: "Mobile",
                cost: cmp.mobile_monthly_cost,
                setup: cmp.mobile_setup,
                color: "#a855f7",
                best: true,
              },
              {
                label: "Traditional",
                cost: cmp.traditional_lease_cost,
                setup: cmp.traditional_setup,
                color: "#3b82f6",
                best: false,
              },
              {
                label: "Digital",
                cost: cmp.digital_only_cost,
                setup: cmp.digital_setup,
                color: "#f59e0b",
                best: false,
              },
            ].map((ch) => (
              <div
                key={ch.label}
                className={cn(
                  "rounded-lg p-2.5 text-center",
                  ch.best
                    ? "border border-purple-500/20 bg-purple-500/5"
                    : "bg-zinc-900/40",
                )}
              >
                <p className="text-[10px] text-zinc-500">{ch.label}</p>
                <p
                  className="mt-1 text-sm font-bold tabular-nums"
                  style={{ color: ch.color }}
                >
                  ${formatNum(ch.cost)}
                </p>
                <p className="text-[10px] text-zinc-600">/month</p>
                <p className="mt-1 text-[10px] text-zinc-500">
                  {ch.setup} setup
                </p>
                {ch.best && (
                  <div className="mt-1.5 inline-flex items-center gap-0.5 rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[9px] font-medium text-purple-400">
                    <Zap className="h-2.5 w-2.5" />
                    Best value
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Location Intelligence ═══ */}
      {scr && (
        <div className="report-section mb-5">
          <SectionHeader
            icon={Users}
            title="Location Intelligence"
            badge={`Score: ${scr.top_location_score}`}
          />
          <div
            className="metric-card mt-3 rounded-xl border border-[rgba(163,130,255,0.08)] bg-[#111113] p-4"
            style={{ animationDelay: "560ms" }}
          >
            <div className="flex items-center justify-center">
              <RadarMini scores={scr.scores} />
            </div>
            <div className="mt-2 flex items-center justify-center gap-1.5">
              <ArrowUpRight className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-xs font-semibold text-purple-300">
                {scr.top_location_score}
              </span>
              <span className="text-[11px] text-zinc-500">
                top score across {metrics?.target_markets.join(", ")}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-5 gap-1.5">
              {(
                [
                  {
                    key: "daytime" as const,
                    label: "Daytime",
                    color: "#3b82f6",
                  },
                  {
                    key: "pedestrian" as const,
                    label: "Pedestrian",
                    color: "#10b981",
                  },
                  {
                    key: "commercial" as const,
                    label: "Commercial",
                    color: "#8b5cf6",
                  },
                  {
                    key: "affluence" as const,
                    label: "Affluence",
                    color: "#f59e0b",
                  },
                  {
                    key: "composite" as const,
                    label: "Composite",
                    color: "#ef4444",
                  },
                ] as const
              ).map((s) => (
                <div
                  key={s.key}
                  className="rounded-lg bg-zinc-900/50 p-2 text-center"
                >
                  <p
                    className="text-sm font-bold tabular-nums"
                    style={{ color: s.color }}
                  >
                    {scr.scores[s.key]}
                  </p>
                  <p className="mt-0.5 text-[9px] text-zinc-600">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Platform Analytics ═══ */}
      {analytics && stats && (
        <div className="report-section mb-5">
          <SectionHeader
            icon={Globe}
            title="Platform Analytics"
            badge="Real Shopify data"
          />

          {/* Top KPI row */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              {
                label: "Orders",
                value: formatNum(stats.total_orders),
                icon: Package,
                color: "#a855f7",
              },
              {
                label: "Cities",
                value: String(stats.cities_served),
                icon: MapPin,
                color: "#3b82f6",
              },
              {
                label: "Vendors",
                value: String(stats.vendors_hosted),
                icon: Users,
                color: "#10b981",
              },
            ].map((s, i) => (
              <div
                key={s.label}
                className="metric-card flex flex-col items-center rounded-xl border border-[rgba(163,130,255,0.08)] bg-[#111113] p-3"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <s.icon className="mb-1 h-4 w-4" style={{ color: s.color }} />
                <p
                  className="text-lg font-bold tabular-nums"
                  style={{ color: s.color }}
                >
                  {s.value}
                </p>
                <p className="text-[10px] text-zinc-500">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Order value + timing */}
          <div
            className="metric-card mt-2.5 grid grid-cols-2 gap-2.5 rounded-xl border border-[rgba(163,130,255,0.08)] bg-[#111113] p-3.5"
            style={{ animationDelay: "240ms" }}
          >
            <div>
              <p className="text-[10px] font-medium text-zinc-500">
                Avg Order Value
              </p>
              <p className="text-lg font-bold tabular-nums text-purple-400">
                ${stats.avg_order_value}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-zinc-500">
                Peak Sales Day
              </p>
              <p className="text-lg font-bold text-blue-400">
                {stats.peak_day}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-zinc-500">
                Channel Mix
              </p>
              <div className="mt-1 flex h-2 overflow-hidden rounded-full">
                <div
                  className="bg-purple-500"
                  style={{ width: `${stats.channel_split.web}%` }}
                />
                <div
                  className="bg-blue-500"
                  style={{ width: `${stats.channel_split.pos}%` }}
                />
              </div>
              <div className="mt-0.5 flex justify-between text-[9px] text-zinc-600">
                <span>Web {stats.channel_split.web}%</span>
                <span>POS {stats.channel_split.pos}%</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-medium text-zinc-500">
                Peak Hours
              </p>
              <p className="text-sm font-bold tabular-nums text-emerald-400">
                {stats.peak_hours?.slice(0, 2).join(", ") ?? "—"}
              </p>
            </div>
          </div>

          {/* Customer insights */}
          {analytics.customer_insights && (
            <div
              className="metric-card mt-2.5 grid grid-cols-3 gap-2 rounded-xl border border-[rgba(163,130,255,0.08)] bg-[#111113] p-3.5"
              style={{ animationDelay: "280ms" }}
            >
              {[
                {
                  label: "Repeat Rate",
                  value: `${analytics.customer_insights.repeat_customer_rate_pct}%`,
                  color: "#a855f7",
                },
                {
                  label: "Multi-item Basket",
                  value: `${analytics.customer_insights.multi_item_basket_rate_pct}%`,
                  color: "#3b82f6",
                },
                {
                  label: "Marketing Opt-in",
                  value: `${analytics.customer_insights.marketing_opt_in_rate_pct}%`,
                  color: "#10b981",
                },
              ].map((c) => (
                <div key={c.label} className="text-center">
                  <p
                    className="text-sm font-bold tabular-nums"
                    style={{ color: c.color }}
                  >
                    {c.value}
                  </p>
                  <p className="mt-0.5 text-[9px] text-zinc-500">{c.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Top categories */}
          {analytics.top_categories && analytics.top_categories.length > 0 && (
            <div
              className="metric-card mt-2.5 rounded-xl border border-[rgba(163,130,255,0.08)] bg-[#111113] p-3.5"
              style={{ animationDelay: "300ms" }}
            >
              <p className="mb-2 text-[10px] font-medium text-zinc-500">
                Top Categories Sold on Our Trucks
              </p>
              <div className="space-y-2">
                {analytics.top_categories.slice(0, 4).map((cat, i) => {
                  const maxPct = analytics.top_categories[0].pct;
                  const colors = ["#a855f7", "#3b82f6", "#10b981", "#f59e0b"];
                  return (
                    <div key={cat.category} className="flex items-center gap-2">
                      <span className="w-20 truncate text-[10px] capitalize text-zinc-400">
                        {cat.category.replace("_", " ")}
                      </span>
                      <div className="flex-1">
                        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800/60">
                          <div
                            className="metric-bar h-full rounded-full"
                            style={{
                              width: `${(cat.pct / maxPct) * 100}%`,
                              backgroundColor: colors[i % colors.length],
                            }}
                          />
                        </div>
                      </div>
                      <span className="w-10 text-right text-[10px] tabular-nums text-zinc-500">
                        {cat.pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Revenue trend */}
          {stats.monthly_trend.length > 0 && (
            <div
              className="metric-card mt-2.5 rounded-xl border border-[rgba(163,130,255,0.08)] bg-[#111113] p-3.5"
              style={{ animationDelay: "320ms" }}
            >
              <p className="mb-2 text-[10px] font-medium text-zinc-500">
                Revenue Trend (last {stats.monthly_trend.length} months)
              </p>
              <div className="flex items-end gap-1" style={{ height: 52 }}>
                {stats.monthly_trend.map((m) => {
                  const maxRev = Math.max(
                    ...stats.monthly_trend.map((t) => t.revenue),
                    1,
                  );
                  const h = Math.max((m.revenue / maxRev) * 100, 4);
                  return (
                    <div
                      key={m.month}
                      className="group relative flex-1 cursor-default rounded-sm bg-purple-500/60 transition-all duration-300 hover:bg-purple-400/80"
                      style={{ height: `${h}%` }}
                    >
                      <div className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 rounded bg-zinc-800 px-1.5 py-1 text-[9px] text-white group-hover:block">
                        {formatCurrency(m.revenue)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top products */}
          {analytics.top_products.length > 0 && (
            <div
              className="metric-card mt-2.5 rounded-xl border border-[rgba(163,130,255,0.08)] bg-[#111113] p-3.5"
              style={{ animationDelay: "400ms" }}
            >
              <p className="mb-2 text-[10px] font-medium text-zinc-500">
                Best-Selling Products
              </p>
              <div className="space-y-1.5">
                {analytics.top_products.slice(0, 5).map((p, i) => {
                  const maxUnits = analytics.top_products[0].units_sold;
                  return (
                    <div key={p.name} className="flex items-center gap-2">
                      <span className="w-3 text-right text-[10px] text-zinc-600">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="max-w-[70%] truncate text-[11px] text-zinc-300">
                            {p.name}
                          </span>
                          <span className="text-[10px] tabular-nums text-zinc-500">
                            {p.units_sold} sold
                          </span>
                        </div>
                        <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-zinc-800/60">
                          <div
                            className="h-full rounded-full bg-purple-500/50"
                            style={{
                              width: `${(p.units_sold / maxUnits) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top deployment locations */}
          {analytics.top_locations && analytics.top_locations.length > 0 && (
            <div
              className="metric-card mt-2.5 rounded-xl border border-[rgba(163,130,255,0.08)] bg-[#111113] p-3.5"
              style={{ animationDelay: "440ms" }}
            >
              <p className="mb-2 text-[10px] font-medium text-zinc-500">
                Known Deployment Locations
              </p>
              <div className="space-y-1.5">
                {analytics.top_locations.map((loc) => (
                  <div
                    key={loc.location}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-zinc-600" />
                      <span className="text-[11px] text-zinc-300">
                        {loc.location}
                      </span>
                    </div>
                    <span className="text-[10px] tabular-nums text-zinc-500">
                      {loc.transactions} txns
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ Deployment Timeline (static) ═══ */}
      <div className="report-section mb-5">
        <SectionHeader icon={Clock} title="Deployment Timeline" />
        <div className="mt-3 space-y-0">
          {TIMELINE_STEPS.map((step, i) => (
            <div
              key={step.label}
              className="timeline-step flex gap-3"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex flex-col items-center">
                <div className="flex h-6 w-6 items-center justify-center rounded-full border border-purple-500/30 bg-purple-500/10 text-[9px] font-bold text-purple-400">
                  {i + 1}
                </div>
                {i < TIMELINE_STEPS.length - 1 && (
                  <div className="w-px flex-1 bg-gradient-to-b from-purple-500/20 to-transparent" />
                )}
              </div>
              <div className="pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-purple-400">
                    {step.label}
                  </span>
                  <span className="text-xs font-medium text-zinc-300">
                    {step.title}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */

export default function BrandReportPanel({
  images,
  metrics,
  events,
  analytics,
  isGenerating,
  onAskAbout,
}: BrandReportPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("visuals");
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [loadedSet, setLoadedSet] = useState<Set<string>>(new Set());
  const [contextToast, setContextToast] = useState<string | null>(null);

  const handleAskAbout = (label: string, value: string) => {
    onAskAbout(label, value);
    setContextToast(label);
    setTimeout(() => setContextToast(null), 2000);
  };

  const markLoaded = (filename: string) => {
    setLoadedSet((prev) => new Set(prev).add(filename));
  };

  const hasImages = images.length > 0 || isGenerating;
  const hasInsights = !!(metrics || events.length > 0 || analytics);

  useEffect(() => {
    if (isGenerating) {
      setActiveTab("visuals");
    }
  }, [isGenerating]);

  return (
    <div className="relative flex h-full w-full flex-col bg-[#09090b]">
      <TabBar
        active={activeTab}
        onSwitch={setActiveTab}
        hasImages={hasImages}
        hasInsights={hasInsights}
        isGenerating={isGenerating}
      />

      {/* Context toast */}
      {contextToast && (
        <div className="pointer-events-none absolute left-1/2 top-14 z-40 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full border border-purple-500/30 bg-zinc-900/95 px-3 py-1.5 shadow-lg backdrop-blur-sm">
            <MessageCircle className="h-3 w-3 text-purple-400" />
            <span className="text-[11px] font-medium text-purple-300">
              "{contextToast}" added to chat
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {activeTab === "visuals" ? (
          <VisualsTab
            images={images}
            isGenerating={isGenerating}
            onLightbox={setLightboxIdx}
            loadedSet={loadedSet}
            onLoad={markLoaded}
          />
        ) : (
          <InsightsTab
            metrics={metrics}
            events={events}
            analytics={analytics}
            onAskAbout={handleAskAbout}
          />
        )}
      </div>

      {/* ── Lightbox ── */}
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

import {
  ArrowUpRight,
  BarChart3,
  DollarSign,
  Eye,
  Footprints,
  ShoppingCart,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import type { DeploymentMetrics } from "#/hooks/use-chat";
import { cn } from "#/lib/utils";

interface MetricsDashboardProps {
  metrics: DeploymentMetrics;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
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
  const size = 140;
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
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={colors[i]} />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const pt = getPoint(i, maxR + 16);
        return (
          <text
            key={`l-${i}`}
            x={pt.x}
            y={pt.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#71717a"
            fontSize="8"
            fontWeight="500"
          >
            {labels[i]}
          </text>
        );
      })}
    </svg>
  );
}

export default function MetricsDashboard({ metrics }: MetricsDashboardProps) {
  const roi = metrics.roi_projections;
  const cmp = metrics.comparison;
  const scr = metrics.scoring;

  return (
    <div className="metrics-dashboard space-y-4 p-4">
      {/* ROI Hero KPIs */}
      <div className="grid grid-cols-2 gap-2.5">
        {[
          {
            icon: Eye,
            label: "Monthly Impressions",
            value: formatNum(roi.monthly_impressions),
            color: "#a855f7",
            bg: "rgba(168,85,247,0.08)",
          },
          {
            icon: Footprints,
            label: "Foot Traffic",
            value: formatNum(roi.foot_traffic_encounters),
            color: "#3b82f6",
            bg: "rgba(59,130,246,0.08)",
          },
          {
            icon: ShoppingCart,
            label: "Est. Conversions",
            value: formatNum(roi.est_conversions),
            color: "#10b981",
            bg: "rgba(16,185,129,0.08)",
          },
          {
            icon: DollarSign,
            label: "Projected Revenue",
            value: `$${formatNum(roi.projected_monthly_revenue)}`,
            color: "#f59e0b",
            bg: "rgba(245,158,11,0.08)",
          },
        ].map((kpi, i) => (
          <div
            key={kpi.label}
            className="metric-card group relative overflow-hidden rounded-xl border border-[rgba(163,130,255,0.08)] bg-[#111113] p-3.5"
            style={{ animationDelay: `${i * 80}ms` }}
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
          </div>
        ))}
      </div>

      {/* ROI badge */}
      <div
        className="metric-card flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5"
        style={{ animationDelay: "320ms" }}
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
      </div>

      {/* Channel Comparison */}
      <div
        className="metric-card rounded-xl border border-[rgba(163,130,255,0.08)] bg-[#111113] p-3.5"
        style={{ animationDelay: "400ms" }}
      >
        <div className="mb-3 flex items-center gap-2">
          <BarChart3 className="h-3.5 w-3.5 text-purple-400" />
          <span className="text-xs font-medium text-zinc-300">
            Conversion Rate by Channel
          </span>
        </div>
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

      {/* Cost comparison */}
      <div
        className="metric-card grid grid-cols-3 gap-2 rounded-xl border border-[rgba(163,130,255,0.08)] bg-[#111113] p-3.5"
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
            <p className="mt-1 text-[10px] text-zinc-500">{ch.setup} setup</p>
            {ch.best && (
              <div className="mt-1.5 inline-flex items-center gap-0.5 rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[9px] font-medium text-purple-400">
                <Zap className="h-2.5 w-2.5" />
                Best value
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Location scoring radar */}
      <div
        className="metric-card rounded-xl border border-[rgba(163,130,255,0.08)] bg-[#111113] p-3.5"
        style={{ animationDelay: "560ms" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-purple-400" />
            <span className="text-xs font-medium text-zinc-300">
              Location Intelligence
            </span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5">
            <ArrowUpRight className="h-3 w-3 text-purple-400" />
            <span className="text-[10px] font-semibold text-purple-400">
              {scr.top_location_score}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <RadarMini scores={scr.scores} />
        </div>
        <p className="mt-1 text-center text-[10px] text-zinc-600">
          Top location score across {metrics.target_markets.join(", ")}
        </p>
      </div>
    </div>
  );
}

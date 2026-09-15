import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  type ComponentType,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTRPC } from "#/integrations/trpc/react";

/**
 * The deployment-intelligence report — the earlier location-scoring product.
 * Moved off "/" when that became the Rolling Retail landing page; kept intact
 * rather than deleted because the wizard and its tRPC pipeline still work.
 */
export const Route = createFileRoute("/report")({ component: App });

/* ─── Types ─── */

interface BrandForm {
  name: string;
  description: string;
  ageMin: number;
  ageMax: number;
  incomeMin: number;
  pricePoint: "premium" | "mid" | "value";
  countyFips: string;
  weights: {
    daytime: number;
    pedestrian: number;
    commercial: number;
    affluence: number;
    parks: number;
  };
}

type TopLocation = {
  rank: number;
  geoid: string;
  countyName: string;
  tractCode: string;
  centroidLat: number;
  centroidLng: number;
  weightedScore: number;
  daytimePopScore: number | null;
  affluenceIndex: number | null;
  pedestrianScore: number | null;
  commercialScore: number | null;
  compositeScore: number | null;
  medianHhIncome: number | null;
  totalPop: number | null;
  daytimePopEst: number | null;
};

/* ─── Constants ─── */

const COUNTIES: [string, string][] = [
  ["001", "Alameda"],
  ["013", "Contra Costa"],
  ["019", "Fresno"],
  ["029", "Kern"],
  ["037", "Los Angeles"],
  ["041", "Marin"],
  ["053", "Monterey"],
  ["059", "Orange"],
  ["065", "Riverside"],
  ["067", "Sacramento"],
  ["071", "San Bernardino"],
  ["073", "San Diego"],
  ["075", "San Francisco"],
  ["077", "San Joaquin"],
  ["081", "San Mateo"],
  ["083", "Santa Barbara"],
  ["085", "Santa Clara"],
  ["087", "Santa Cruz"],
  ["095", "Solano"],
  ["097", "Sonoma"],
  ["099", "Stanislaus"],
  ["107", "Tulare"],
  ["111", "Ventura"],
];

const FAQ_ITEMS = [
  {
    q: "How much does launching a mobile store actually cost?",
    a: "Traditional brick-and-mortar build-outs run $120k–$400k before you see a single customer. A fully-equipped Rolling Retail mobile store launches for ~$75k — and every dollar is mobile. The vehicle wrap alone ($2,500–$6,000) generates outdoor impressions at a CPM of $0.48, compared to Meta's $7–$10 CPM.",
    tag: "Investment",
  },
  {
    q: "Is the 18% conversion rate real, or a marketing claim?",
    a: "It's sourced from the POPAI Shopper Engagement Study and corroborated by our own deployments. While Meta Ads average 3.26%, face-to-face pop-up retail consistently achieves 15–22%. More importantly, shoppers who interact directly with your ambassadors carry 81% higher average transaction value — turning a foot-traffic metric into a revenue multiplier.",
    tag: "Performance",
  },
  {
    q: "What if a location underperforms?",
    a: "Unlike a 12-month lease, you're never locked in. The Retail OS monitors real-time foot traffic per deployment. If a location's engagement rate stays below 2% for 14 consecutive days, it automatically triggers a \"Relocation Alert\" — surfacing the next-best scored node in your target county.",
    tag: "Flexibility",
  },
  {
    q: "How long until we're live and selling?",
    a: "Two weeks from signed agreement to first deployment, assuming health permits are filed in week one. Week one covers wrap production and TFF application. Week two is build-out, Shopify sync, and ambassador onboarding. Most brands make their first sale within 48 hours of launch.",
    tag: "Timeline",
  },
  {
    q: "Do you handle permits and compliance?",
    a: "Yes. Our ops team handles LA County health filings, Temporary Food Facility (TFF) applications, and special event permits as part of the onboarding package. You focus on brand; we handle bureaucracy.",
    tag: "Operations",
  },
  {
    q: "What does the data pipeline actually track?",
    a: "Each deployment tracks foot traffic density, dwell time, conversion events, UGC mentions, and Shopify transaction data in real-time. The dashboard surfaces weekly heatmaps, revenue-per-location rankings, and relocation recommendations — all updated daily.",
    tag: "Analytics",
  },
];

const DEFAULT_FORM: BrandForm = {
  name: "",
  description: "",
  ageMin: 18,
  ageMax: 45,
  incomeMin: 50000,
  pricePoint: "mid",
  countyFips: "037",
  weights: {
    daytime: 0.25,
    pedestrian: 0.25,
    commercial: 0.2,
    affluence: 0.2,
    parks: 0.1,
  },
};

const COMPARISON_ROWS = [
  {
    metric: "Monthly Cost",
    mobile: "~$3k",
    traditional: "~$15k",
    digital: "~$5k",
  },
  {
    metric: "Flexibility",
    mobile: "Move anytime",
    traditional: "12-mo lock-in",
    digital: "Algorithm-dependent",
  },
  {
    metric: "Conversion Rate",
    mobile: "18%",
    traditional: "~8%",
    digital: "3.26%",
  },
  {
    metric: "Brand Experience",
    mobile: "Immersive",
    traditional: "Static",
    digital: "Screen-only",
  },
  {
    metric: "Setup Time",
    mobile: "2 weeks",
    traditional: "3–6 months",
    digital: "Days",
  },
];

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

const TESTIMONIALS = [
  {
    quote:
      "We went from 200 online orders/month to 1,400 after launching our mobile store in Silver Lake. The foot traffic data was spot-on.",
    name: "Jordan Reeves",
    role: "Founder",
    brand: "StreetWeave Apparel",
  },
  {
    quote:
      "The ROI calculator was conservative — we actually exceeded projections by 40% in month one. The relocation alerts alone saved us $12k.",
    name: "Priya Mehta",
    role: "Head of Retail",
    brand: "Bloom Botanicals",
  },
  {
    quote:
      "Having the analytics dashboard in real-time changed how we think about inventory. We restock based on live demand, not guesses.",
    name: "Marcus Chen",
    role: "COO",
    brand: "NomNom Kitchen",
  },
];

/* ─── useReveal hook ─── */

function useReveal() {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
          for (const child of el.querySelectorAll(".reveal")) {
            child.classList.add("visible");
          }
          observer.unobserve(el);
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [el]);
  return setEl;
}

/* ─── AnimatedNumber ─── */

function AnimatedNumber({
  value,
  duration = 1400,
  prefix = "",
  suffix = "",
  className = "",
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: value triggers reset
  useEffect(() => {
    started.current = false;
    setDisplay(0);
  }, [value]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const animate = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - (1 - progress) ** 3;
            setDisplay(Math.round(eased * value));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ─── Gauge ─── */

function Gauge({
  value,
  max = 100,
  label,
  sub,
  size = 140,
  color = "#a855f7",
}: {
  value: number;
  max?: number;
  label: string;
  sub?: string;
  size?: number;
  color?: string;
}) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const [offset, setOffset] = useState(circ);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOffset(circ);
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const pct = Math.min(value / max, 1);
          setOffset(circ * (1 - pct));
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, max, circ]);

  return (
    <div ref={ref} className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="h-full w-full -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(168,85,247,0.07)"
            strokeWidth={9}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={9}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 1.6s cubic-bezier(0.16,1,0.3,1)",
              filter: `drop-shadow(0 0 14px ${color}50)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>
            {value}
          </span>
        </div>
      </div>
      <span className="text-sm font-medium text-zinc-400">{label}</span>
      {sub && <span className="text-xs text-zinc-600">{sub}</span>}
    </div>
  );
}

/* ─── Steps ─── */

function Steps({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: stable fixed-length array
        <div key={i} className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 ${
              i < current
                ? "bg-purple-500/20 text-purple-400"
                : i === current
                  ? "bg-purple-500 text-black shadow-lg shadow-purple-500/25"
                  : "bg-zinc-800 text-zinc-500"
            }`}
          >
            {i < current ? (
              <svg
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-3.5 w-3.5"
                aria-hidden="true"
              >
                <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
              </svg>
            ) : (
              i + 1
            )}
          </div>
          {i < total - 1 && (
            <div
              className={`h-px w-8 transition-colors duration-300 ${i < current ? "bg-purple-500/40" : "bg-zinc-800"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── DeploymentMap ─── */

function DeploymentMap({ locations }: { locations: TopLocation[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || locations.length === 0)
      return;
    const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
    if (!token) return;

    let cancelled = false;
    (async () => {
      const mapboxgl = await import("mapbox-gl");
      await import("mapbox-gl/dist/mapbox-gl.css");
      if (cancelled || !containerRef.current) return;

      mapboxgl.default.accessToken = token;
      const bounds = new mapboxgl.default.LngLatBounds();
      for (const loc of locations)
        bounds.extend([loc.centroidLng, loc.centroidLat]);

      const map = new mapboxgl.default.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        bounds,
        fitBoundsOptions: { padding: 80 },
      });

      map.on("load", () => {
        const maxScore = Math.max(...locations.map((l) => l.weightedScore), 1);
        map.addSource("locs", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: locations.map((loc) => ({
              type: "Feature" as const,
              geometry: {
                type: "Point" as const,
                coordinates: [loc.centroidLng, loc.centroidLat],
              },
              properties: {
                score: loc.weightedScore,
                rank: loc.rank,
                norm: loc.weightedScore / maxScore,
                tract: loc.tractCode,
              },
            })),
          },
        });
        map.addLayer({
          id: "locs-heat",
          type: "heatmap",
          source: "locs",
          paint: {
            "heatmap-weight": ["get", "norm"],
            "heatmap-radius": 35,
            "heatmap-opacity": 0.45,
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(0,0,0,0)",
              0.3,
              "rgba(88,28,135,0.35)",
              0.6,
              "rgba(168,85,247,0.55)",
              0.85,
              "rgba(192,132,252,0.7)",
              1,
              "rgba(233,213,255,0.85)",
            ],
          },
        });
        map.addLayer({
          id: "locs-circles",
          type: "circle",
          source: "locs",
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["get", "norm"],
              0,
              5,
              1,
              16,
            ],
            "circle-color": [
              "interpolate",
              ["linear"],
              ["get", "norm"],
              0,
              "#3b0764",
              0.4,
              "#7e22ce",
              0.7,
              "#a855f7",
              1,
              "#e9d5ff",
            ],
            "circle-opacity": 0.9,
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "rgba(168,85,247,0.25)",
          },
        });
        map.addLayer({
          id: "locs-labels",
          type: "symbol",
          source: "locs",
          layout: {
            "text-field": ["concat", "#", ["to-string", ["get", "rank"]]],
            "text-size": 10,
            "text-offset": [0, -1.8],
          },
          paint: {
            "text-color": "#e9d5ff",
            "text-halo-color": "#09090b",
            "text-halo-width": 1.5,
          },
        });
      });
      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
      }
    };
  }, [locations]);

  if (!import.meta.env.VITE_MAPBOX_TOKEN) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-zinc-500">
          Add{" "}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs">
            VITE_MAPBOX_TOKEN
          </code>{" "}
          to{" "}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs">
            .env.local
          </code>{" "}
          to enable the map.
        </p>
      </div>
    );
  }
  return <div ref={containerRef} className="h-full w-full" />;
}

/* ─── ModelShowcase (client-only dynamic import of 3D viewer) ─── */

function ModelShowcase() {
  const [Viewer, setViewer] = useState<ComponentType | null>(null);

  useEffect(() => {
    import("../components/rodin/ModelShowcase").then((mod) => {
      setViewer(() => mod.default);
    });
  }, []);

  if (!Viewer) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <p className="text-xs text-zinc-500">Loading 3D preview...</p>
        </div>
      </div>
    );
  }
  return <Viewer />;
}

/* ─── ROICalculator ─── */

function ROICalculator({
  pricePoint,
}: {
  pricePoint: "premium" | "mid" | "value";
}) {
  const [budget, setBudget] = useState(5000);
  const [days, setDays] = useState(15);
  const [locations, setLocations] = useState(2);

  const priceMultiplier =
    pricePoint === "premium" ? 85 : pricePoint === "mid" ? 55 : 30;
  const impressions = Math.round(
    (budget / 1000) * 180 * days * locations * 0.15,
  );
  const encounters = Math.round(impressions * 0.12);
  const conversions = Math.round(encounters * 0.18);
  const revenue = conversions * priceMultiplier;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.22em] text-zinc-600">
        Projections
      </p>
      <h2 className="mb-14 text-center text-4xl font-bold sm:text-5xl">
        ROI Calculator
      </h2>

      <div className="grid gap-12 lg:grid-cols-2">
        <div className="space-y-8">
          <div>
            <div className="mb-2 flex justify-between">
              <span className="text-sm text-zinc-400">Monthly Budget</span>
              <span className="text-sm font-semibold tabular-nums text-purple-400">
                ${budget.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min={1000}
              max={50000}
              step={1000}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>
          <div>
            <div className="mb-2 flex justify-between">
              <span className="text-sm text-zinc-400">
                Days Deployed / Month
              </span>
              <span className="text-sm font-semibold tabular-nums text-purple-400">
                {days}
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={30}
              step={1}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>
          <div>
            <div className="mb-2 flex justify-between">
              <span className="text-sm text-zinc-400">Number of Locations</span>
              <span className="text-sm font-semibold tabular-nums text-purple-400">
                {locations}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={locations}
              onChange={(e) => setLocations(Number(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            {
              val: impressions,
              label: "Monthly Impressions",
              color: "text-purple-400",
              prefix: "",
            },
            {
              val: encounters,
              label: "Foot Traffic Encounters",
              color: "text-blue-400",
              prefix: "",
            },
            {
              val: conversions,
              label: "Est. Conversions",
              color: "text-emerald-400",
              prefix: "",
            },
            {
              val: revenue,
              label: "Projected Revenue",
              color: "text-amber-400",
              prefix: "$",
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-6"
            >
              <AnimatedNumber
                value={kpi.val}
                prefix={kpi.prefix}
                className={`text-3xl font-bold tabular-nums ${kpi.color}`}
                duration={800}
              />
              <p className="mt-2 text-center text-[11px] text-zinc-500">
                {kpi.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-8 text-center text-[11px] text-zinc-600">
        Based on industry benchmarks: 18% conversion rate, {pricePoint}{" "}
        price-point avg. ticket of ${priceMultiplier}
      </p>
    </div>
  );
}

/* ─── DashboardPreview ─── */

function DashboardPreview() {
  const bars = [35, 52, 44, 68, 58, 75, 62];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const sparkline = [20, 35, 28, 45, 40, 55, 65, 58, 72, 68, 80, 85];
  const maxSpark = Math.max(...sparkline);
  const sparkPoints = sparkline
    .map(
      (v, i) =>
        `${(i / (sparkline.length - 1)) * 100},${100 - (v / maxSpark) * 100}`,
    )
    .join(" ");

  return (
    <div className="mx-auto w-full max-w-4xl">
      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.22em] text-zinc-600">
        Analytics
      </p>
      <h2 className="mb-4 text-center text-4xl font-bold sm:text-5xl">
        Your live dashboard
      </h2>
      <p className="mb-14 text-center text-sm text-zinc-500">
        Included with every deployment — real-time performance insights.
      </p>

      <div
        className="group relative mx-auto max-w-3xl"
        style={{ perspective: "1200px" }}
      >
        <div className="rounded-3xl border border-purple-500/10 bg-zinc-900/80 p-6 shadow-2xl shadow-purple-500/5 transition-transform duration-500 group-hover:[transform:rotateX(2deg)_rotateY(-2deg)]">
          {/* Top bar */}
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
            </div>
            <div className="flex items-center gap-2 rounded-full bg-purple-500/10 px-3 py-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-[10px] font-medium text-emerald-400">
                LIVE
              </span>
            </div>
          </div>

          {/* Metric cards */}
          <div className="mb-5 grid grid-cols-4 gap-3">
            {[
              {
                label: "Foot Traffic",
                value: "2,847",
                change: "+12%",
                up: true,
              },
              { label: "Conversions", value: "512", change: "+8.4%", up: true },
              { label: "Revenue", value: "$28.1k", change: "+15%", up: true },
              {
                label: "Engagement",
                value: "24.3%",
                change: "+3.1%",
                up: true,
              },
            ].map((m) => (
              <div key={m.label} className="rounded-xl bg-black/40 p-3.5">
                <p className="text-[10px] text-zinc-500">{m.label}</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-zinc-100">
                  {m.value}
                </p>
                <p
                  className={`mt-0.5 text-[10px] font-medium ${m.up ? "text-emerald-400" : "text-red-400"}`}
                >
                  {m.change}
                </p>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Bar chart */}
            <div className="rounded-xl bg-black/40 p-4">
              <p className="mb-3 text-[10px] font-medium text-zinc-500">
                Weekly Performance
              </p>
              <div className="flex items-end gap-1.5" style={{ height: 80 }}>
                {bars.map((h, i) => (
                  <div
                    key={days[i]}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <div
                      className="w-full rounded-sm bg-purple-500/70 transition-all duration-700"
                      style={{
                        height: `${h}%`,
                        transitionDelay: `${i * 80}ms`,
                      }}
                    />
                    <span className="text-[8px] text-zinc-600">{days[i]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sparkline */}
            <div className="rounded-xl bg-black/40 p-4">
              <p className="mb-3 text-[10px] font-medium text-zinc-500">
                Revenue Trend (12 weeks)
              </p>
              <svg
                viewBox="0 0 100 100"
                className="h-[76px] w-full"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon
                  points={`0,100 ${sparkPoints} 100,100`}
                  fill="url(#sparkGrad)"
                />
                <polyline
                  points={sparkPoints}
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Glow effect */}
        <div
          className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(600px at 50% 50%, rgba(168,85,247,0.06), transparent 70%)",
          }}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   Main App
═══════════════════════════════════════ */

function App() {
  const trpc = useTRPC();
  const reportRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<BrandForm>(DEFAULT_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const patch = useCallback((partial: Partial<BrandForm>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  }, []);

  const createBrand = useMutation(
    trpc.brands.create.mutationOptions({
      onSuccess: () => {
        setMutationError(null);
        setSubmitted(true);
        setTimeout(
          () => reportRef.current?.scrollIntoView({ behavior: "smooth" }),
          300,
        );
      },
      onError: (err) => {
        setMutationError(
          err.message ?? "Failed to create brand. Is the database running?",
        );
      },
    }),
  );

  const { data: reportLocations } = useQuery(
    trpc.locations.topN.queryOptions(
      { countyFips: form.countyFips, n: 25, weights: form.weights },
      { enabled: submitted },
    ),
  );

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    createBrand.mutate({
      name: form.name.trim(),
      targetAgeMin: form.ageMin,
      targetAgeMax: form.ageMax,
      targetIncomeMin: form.incomeMin,
      pricePoint: form.pricePoint,
      weightDaytime: form.weights.daytime,
      weightPedestrian: form.weights.pedestrian,
      weightCommercial: form.weights.commercial,
      weightAffluence: form.weights.affluence,
      weightParks: form.weights.parks,
    });
  };

  const countyName =
    COUNTIES.find(([f]) => f === form.countyFips)?.[1] ?? "Los Angeles";
  const topLocs = (reportLocations ?? []) as TopLocation[];

  const avgIncome = topLocs.length
    ? Math.round(
        topLocs.reduce((s, l) => s + (l.medianHhIncome ?? 0), 0) /
          topLocs.length,
      )
    : 0;
  const avgComposite = topLocs.length
    ? Math.round(
        topLocs.reduce((s, l) => s + (l.compositeScore ?? 0), 0) /
          topLocs.length,
      )
    : 0;
  const avgDaytime = topLocs.length
    ? Math.round(
        topLocs.reduce((s, l) => s + (l.daytimePopEst ?? 0), 0) /
          topLocs.length,
      )
    : 0;

  /* Reveal refs — one per report section */
  const heroRef = useReveal();
  const strategyRef = useReveal();
  const whyRef = useReveal();
  const comparisonRef = useReveal();
  const truckRef = useReveal();
  const kpiRef = useReveal();
  const roiRef = useReveal();
  const tableRef = useReveal();
  const timelineRef = useReveal();
  const logisticsRef = useReveal();
  const dashboardRef = useReveal();
  const socialRef = useReveal();
  const faqRef = useReveal();
  const ctaRef = useReveal();

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      {/* ══════════ FORM ══════════ */}
      {!submitted && (
        <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
          <div className="fade-up w-full max-w-lg">
            <div className="mb-10 text-center">
              <h1 className="mb-1 text-2xl font-bold tracking-tight">
                Rolling Retail
              </h1>
              <p className="text-sm text-zinc-500">
                Deployment intelligence for California mobile retail
              </p>
            </div>
            <div className="mb-8 flex justify-center">
              <Steps current={step} total={3} />
            </div>
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-8">
              {/* Step 0 — Brand Identity */}
              {step === 0 && (
                <div className="fade-in space-y-6">
                  <div>
                    <h2 className="mb-1 text-lg font-semibold">
                      Tell us about your brand
                    </h2>
                    <p className="text-sm text-zinc-500">
                      We'll personalize your deployment report.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="bn"
                        className="mb-1.5 block text-xs font-medium text-zinc-400"
                      >
                        Brand Name
                      </label>
                      <input
                        id="bn"
                        type="text"
                        value={form.name}
                        onChange={(e) => patch({ name: e.target.value })}
                        placeholder="e.g. Nomad Apparel"
                        className="w-full rounded-xl border border-zinc-800 bg-black/50 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/20"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="bd"
                        className="mb-1.5 block text-xs font-medium text-zinc-400"
                      >
                        What do you sell?
                      </label>
                      <textarea
                        id="bd"
                        value={form.description}
                        onChange={(e) => patch({ description: e.target.value })}
                        placeholder="Brief description of your products..."
                        rows={3}
                        className="w-full resize-none rounded-xl border border-zinc-800 bg-black/50 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/20"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1 — Target Customer */}
              {step === 1 && (
                <div className="fade-in space-y-6">
                  <div>
                    <h2 className="mb-1 text-lg font-semibold">
                      Target customer
                    </h2>
                    <p className="text-sm text-zinc-500">
                      Match locations to your ideal audience.
                    </p>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <div className="mb-2 flex justify-between">
                        <span className="text-xs font-medium text-zinc-400">
                          Age Range
                        </span>
                        <span className="text-xs tabular-nums text-purple-400">
                          {form.ageMin} – {form.ageMax}
                        </span>
                      </div>
                      <div className="flex gap-3">
                        <input
                          type="range"
                          min={18}
                          max={75}
                          value={form.ageMin}
                          onChange={(e) =>
                            patch({
                              ageMin: Math.min(
                                Number(e.target.value),
                                form.ageMax - 1,
                              ),
                            })
                          }
                          className="flex-1 accent-purple-500"
                        />
                        <input
                          type="range"
                          min={18}
                          max={75}
                          value={form.ageMax}
                          onChange={(e) =>
                            patch({
                              ageMax: Math.max(
                                Number(e.target.value),
                                form.ageMin + 1,
                              ),
                            })
                          }
                          className="flex-1 accent-purple-500"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex justify-between">
                        <span className="text-xs font-medium text-zinc-400">
                          Min Household Income
                        </span>
                        <span className="text-xs tabular-nums text-purple-400">
                          ${form.incomeMin.toLocaleString()}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={200000}
                        step={5000}
                        value={form.incomeMin}
                        onChange={(e) =>
                          patch({ incomeMin: Number(e.target.value) })
                        }
                        className="w-full accent-purple-500"
                      />
                    </div>
                    <div>
                      <span className="mb-2 block text-xs font-medium text-zinc-400">
                        Price Point
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {(["value", "mid", "premium"] as const).map((pp) => (
                          <button
                            key={pp}
                            type="button"
                            onClick={() => patch({ pricePoint: pp })}
                            className={`rounded-xl border px-4 py-2.5 text-xs font-medium transition-all ${form.pricePoint === pp ? "border-purple-500/50 bg-purple-500/10 text-purple-400" : "border-zinc-800 bg-black/30 text-zinc-500 hover:text-zinc-300"}`}
                          >
                            {pp === "premium"
                              ? "Premium"
                              : pp === "mid"
                                ? "Mid-Range"
                                : "Value"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2 — Market & Weights */}
              {step === 2 && (
                <div className="fade-in space-y-6">
                  <div>
                    <h2 className="mb-1 text-lg font-semibold">
                      Choose your market
                    </h2>
                    <p className="text-sm text-zinc-500">
                      Select a county and adjust score priorities.
                    </p>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                        County
                      </span>
                      <select
                        value={form.countyFips}
                        onChange={(e) => patch({ countyFips: e.target.value })}
                        className="w-full rounded-xl border border-zinc-800 bg-black/50 px-4 py-3 text-sm text-white focus:border-purple-500/50 focus:outline-none"
                      >
                        {COUNTIES.map(([fips, name]) => (
                          <option key={fips} value={fips}>
                            {name} County
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className="mb-3 block text-xs font-medium text-zinc-400">
                        Score Weights
                      </span>
                      {(
                        [
                          ["daytime", "Daytime Population"],
                          ["pedestrian", "Pedestrian Activity"],
                          ["commercial", "Commercial Density"],
                          ["affluence", "Affluence & Spending"],
                          ["parks", "Parks & Recreation"],
                        ] as const
                      ).map(([key, label]) => (
                        <div key={key} className="mb-3 flex items-center gap-3">
                          <span className="w-36 text-xs text-zinc-400">
                            {label}
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={Math.round(form.weights[key] * 100)}
                            onChange={(e) => {
                              const raw = Number(e.target.value);
                              const updated = { ...form.weights, [key]: raw };
                              const total = Object.values(updated).reduce(
                                (s, v) => s + v,
                                0,
                              );
                              if (total === 0) return;
                              const norm = {} as typeof form.weights;
                              for (const k of Object.keys(
                                updated,
                              ) as (keyof typeof updated)[]) {
                                norm[k] =
                                  Math.round((updated[k] / total) * 100) / 100;
                              }
                              patch({ weights: norm });
                            }}
                            className="flex-1 accent-purple-500"
                          />
                          <span className="w-10 text-right text-xs tabular-nums text-zinc-500">
                            {Math.round(form.weights[key] * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Nav */}
              <div className="mt-8 flex items-center justify-between">
                {step > 0 ? (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="rounded-xl px-5 py-2.5 text-sm font-medium text-zinc-400 transition hover:text-white"
                  >
                    Back
                  </button>
                ) : (
                  <div />
                )}
                {step < 2 ? (
                  <button
                    type="button"
                    onClick={() => setStep(step + 1)}
                    disabled={step === 0 && !form.name.trim()}
                    className="rounded-xl bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-600/20 transition hover:bg-purple-500 disabled:opacity-30"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={createBrand.isPending}
                    className="rounded-xl bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-600/20 transition hover:bg-purple-500 disabled:opacity-50"
                  >
                    {createBrand.isPending
                      ? "Generating..."
                      : "Generate Report"}
                  </button>
                )}
              </div>
              {mutationError && (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                  {mutationError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
			    REPORT — 15 full-viewport sections
			═══════════════════════════════════════ */}
      {submitted && (
        <div ref={reportRef}>
          {/* §1 — Hero */}
          <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
            <div ref={heroRef} className="reveal">
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-600">
                Rolling Retail · Deployment Intelligence
              </p>
              <h1 className="mb-5 text-5xl font-bold tracking-tight sm:text-7xl lg:text-8xl">
                {form.name}
              </h1>
              <p className="mb-8 text-lg text-zinc-500">
                {countyName} County Market Analysis
              </p>
              <div className="inline-flex items-center gap-2.5 rounded-full border border-purple-500/20 bg-purple-500/5 px-5 py-2.5">
                <span className="h-2 w-2 animate-pulse rounded-full bg-purple-500" />
                <span className="text-sm font-medium text-purple-400">
                  Report Ready — {topLocs.length} locations scored
                </span>
              </div>
              <div className="mx-auto mt-14 h-16 w-px bg-linear-to-b from-purple-500/40 to-transparent" />
            </div>
          </section>

          {/* §2 — Strategy */}
          <section className="flex min-h-screen flex-col items-center justify-center px-6">
            <div ref={strategyRef} className="reveal w-full max-w-3xl">
              <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.22em] text-zinc-600">
                Strategy
              </p>
              <h2 className="mb-16 text-center text-4xl font-bold sm:text-5xl">
                Recommended Deployment
              </h2>
              <div className="flex flex-wrap justify-center gap-16 sm:gap-24">
                <Gauge value={0.2} max={1} label="K-Factor Goal" size={150} />
                <Gauge
                  value={3}
                  max={10}
                  label="Brand Ambassadors"
                  sub="UGC Facilitation"
                  size={150}
                  color="#c084fc"
                />
                <Gauge
                  value={topLocs[0]?.weightedScore ?? 0}
                  max={100}
                  label="Top Location Score"
                  size={150}
                  color="#a78bfa"
                />
              </div>
            </div>
          </section>

          {/* §3 — Why mobile retail */}
          <section className="flex min-h-screen flex-col items-center justify-center px-6">
            <div ref={whyRef} className="reveal w-full max-w-4xl">
              <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.22em] text-zinc-600">
                The Opportunity
              </p>
              <h2 className="mb-16 text-center text-4xl font-bold sm:text-5xl">
                Why mobile retail wins
              </h2>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="reveal stagger-1 flex flex-col items-center rounded-3xl border border-zinc-800/60 p-12">
                  <p className="mb-2 text-xs text-zinc-500">
                    Meta Ads avg. conversion
                  </p>
                  <AnimatedNumber
                    value={326}
                    suffix="%"
                    className="text-6xl font-bold tabular-nums text-zinc-500"
                  />
                  <p className="mt-3 text-xs text-zinc-600">
                    3.26% industry average
                  </p>
                </div>
                <div className="reveal stagger-2 flex flex-col items-center rounded-3xl border border-purple-500/20 bg-purple-500/3 p-12">
                  <p className="mb-2 text-xs text-purple-400/70">
                    Pop-up conversion rate
                  </p>
                  <AnimatedNumber
                    value={18}
                    suffix="%"
                    className="text-6xl font-bold tabular-nums text-purple-400"
                  />
                  <p className="mt-3 text-xs text-zinc-500">
                    +81% transaction value vs. digital
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* §4 — NEW: Comparison */}
          <section className="flex min-h-screen flex-col items-center justify-center px-6">
            <div ref={comparisonRef} className="reveal w-full max-w-4xl">
              <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.22em] text-zinc-600">
                Head-to-Head
              </p>
              <h2 className="mb-14 text-center text-4xl font-bold sm:text-5xl">
                How it compares
              </h2>
              <div className="overflow-hidden rounded-2xl border border-zinc-800/60">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800/60 bg-zinc-900/30">
                      <th className="px-6 py-4 text-left text-xs font-medium text-zinc-500" />
                      <th className="px-6 py-4 text-center text-xs font-semibold text-purple-400">
                        Mobile Retail
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-zinc-500">
                        Traditional Lease
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-zinc-500">
                        Digital-Only
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON_ROWS.map((row, i) => (
                      <tr
                        key={row.metric}
                        className={`reveal stagger-${i + 1} border-b border-zinc-800/30`}
                      >
                        <td className="px-6 py-4 text-xs font-medium text-zinc-400">
                          {row.metric}
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-semibold text-purple-300">
                          {row.mobile}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-zinc-500">
                          {row.traditional}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-zinc-500">
                          {row.digital}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* §5 — 3D Model Preview */}
          <section className="relative flex min-h-screen items-center justify-center">
            <div
              ref={truckRef}
              className="reveal flex h-screen w-full flex-col"
            >
              <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex shrink-0 flex-col items-center px-6 pt-16 text-center">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                  Your Vehicle
                </p>
                <h2 className="mb-2 text-4xl font-bold text-white sm:text-5xl">
                  Your mobile store
                </h2>
                <p className="text-sm text-zinc-500">
                  Drag to rotate · Auto-rotates
                </p>
              </div>
              <div className="min-h-0 flex-1">
                <ModelShowcase />
              </div>
              <div className="absolute bottom-12 left-0 right-0 z-20 flex items-center justify-center gap-3">
                <Link
                  to="/studio"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white px-6 py-3 text-sm font-semibold text-black shadow-lg transition-all hover:bg-gray-100 hover:shadow-xl"
                >
                  Customize your own
                  <svg
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </Link>
                <Link
                  to="/chat"
                  className="inline-flex items-center gap-2 rounded-full border border-purple-500/40 bg-purple-600/20 px-6 py-3 text-sm font-semibold text-purple-300 shadow-lg shadow-purple-900/30 backdrop-blur-sm transition-all hover:bg-purple-600/30 hover:text-purple-200 hover:shadow-purple-900/50"
                >
                  Chat + 3D Studio
                  <svg
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </Link>
              </div>
            </div>
          </section>

          {/* §6 — Map */}
          <section className="relative flex min-h-screen items-center justify-center p-0">
            <div className="h-screen w-full">
              <div className="absolute left-6 top-6 z-10 rounded-xl border border-zinc-800/80 bg-black/75 px-5 py-3 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-300">
                  Deployment Zones — {countyName} County
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-600">
                  Circle size &amp; brightness = score for your brand
                </p>
              </div>
              <DeploymentMap locations={topLocs} />
            </div>
          </section>

          {/* §7 — KPIs */}
          <section className="flex min-h-screen flex-col items-center justify-center px-6">
            <div ref={kpiRef} className="reveal w-full max-w-4xl">
              <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.22em] text-zinc-600">
                Performance
              </p>
              <h2 className="mb-16 text-center text-4xl font-bold sm:text-5xl">
                Your market at a glance
              </h2>
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                {[
                  {
                    val: topLocs.length,
                    label: "Locations Scored",
                    color: "text-purple-400",
                  },
                  {
                    val: avgIncome,
                    label: "Avg Household Income",
                    color: "text-emerald-400",
                    prefix: "$",
                  },
                  {
                    val: avgComposite,
                    label: "Avg Composite Score",
                    color: "text-amber-400",
                  },
                  {
                    val: avgDaytime,
                    label: "Avg Daytime Population",
                    color: "text-blue-400",
                  },
                ].map((kpi, i) => (
                  <div
                    key={kpi.label}
                    className={`reveal stagger-${i + 1} flex flex-col items-center rounded-2xl border border-zinc-800/60 p-8`}
                  >
                    <AnimatedNumber
                      value={kpi.val}
                      prefix={kpi.prefix}
                      className={`text-4xl font-bold tabular-nums ${kpi.color}`}
                    />
                    <p className="mt-3 text-xs text-zinc-500">{kpi.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* §8 — NEW: ROI Calculator */}
          <section className="flex min-h-screen flex-col items-center justify-center px-6">
            <div ref={roiRef} className="reveal flex w-full justify-center">
              <ROICalculator pricePoint={form.pricePoint} />
            </div>
          </section>

          {/* §9 — Top Locations Table */}
          <section className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
            <div ref={tableRef} className="reveal w-full max-w-5xl">
              <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.22em] text-zinc-600">
                Ranked Locations
              </p>
              <h2 className="mb-12 text-center text-4xl font-bold sm:text-5xl">
                Top deployment zones
              </h2>
              {topLocs.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800/60 p-16 text-center">
                  <p className="text-sm text-zinc-500">
                    No data yet — try a different county or run the pipeline.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-zinc-800/60">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800/60 bg-zinc-900/30">
                        {[
                          "#",
                          "Location",
                          "Score",
                          "Daytime",
                          "Affluence",
                          "Pedestrian",
                          "Income",
                        ].map((h) => (
                          <th
                            key={h}
                            className={`px-5 py-3.5 text-xs font-medium text-zinc-500 ${h === "#" || h === "Location" ? "text-left" : "text-right"}`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {topLocs.map((loc) => (
                        <tr
                          key={loc.geoid}
                          className="border-b border-zinc-800/30 transition-colors hover:bg-purple-500/3"
                        >
                          <td className="px-5 py-3 font-mono text-xs text-zinc-500">
                            {loc.rank}
                          </td>
                          <td className="px-5 py-3">
                            <p className="text-sm font-medium">
                              {loc.countyName} — Tract {loc.tractCode}
                            </p>
                            <p className="text-[11px] text-zinc-600">
                              {loc.geoid}
                            </p>
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-sm font-bold text-purple-400">
                            {loc.weightedScore}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-xs text-zinc-400">
                            {Math.round(loc.daytimePopScore ?? 0)}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-xs text-zinc-400">
                            {Math.round(loc.affluenceIndex ?? 0)}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-xs text-zinc-400">
                            {Math.round(loc.pedestrianScore ?? 0)}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-xs text-zinc-400">
                            ${(loc.medianHhIncome ?? 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* §10 — NEW: Deployment Timeline */}
          <section className="flex min-h-screen flex-col items-center justify-center px-6">
            <div ref={timelineRef} className="reveal w-full max-w-2xl">
              <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.22em] text-zinc-600">
                Roadmap
              </p>
              <h2 className="mb-14 text-center text-4xl font-bold sm:text-5xl">
                Your deployment timeline
              </h2>
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[15px] top-0 h-full w-px bg-zinc-800">
                  <div className="h-full w-full bg-linear-to-b from-purple-500/80 to-purple-500/10 origin-top transition-transform duration-[2s] ease-out" />
                </div>
                <div className="space-y-10">
                  {TIMELINE_STEPS.map((step, i) => (
                    <div
                      key={step.label}
                      className={`reveal stagger-${i + 1} flex items-start gap-6 pl-0`}
                    >
                      <div className="relative z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-2 border-purple-500/40 bg-[#09090b]">
                        <div className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                      </div>
                      <div className="pt-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-purple-400/70">
                          {step.label}
                        </span>
                        <h3 className="mt-1 text-lg font-semibold">
                          {step.title}
                        </h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* §11 — Logistics */}
          <section className="flex min-h-screen flex-col items-center justify-center px-6">
            <div ref={logisticsRef} className="reveal w-full max-w-2xl">
              <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.22em] text-zinc-600">
                Operations
              </p>
              <h2 className="mb-12 text-center text-4xl font-bold sm:text-5xl">
                Last-mile logistics
              </h2>
              <div className="space-y-4">
                {[
                  {
                    title: "Rev Share vs. Flat Fee",
                    desc: "Flat fee (~$15k–$50k for prime spots) or negotiate a revenue percentage with event organizers.",
                  },
                  {
                    title: "Permit Management",
                    desc: "LA County health filings and TFF application — handle it yourself or let our team manage it.",
                  },
                  {
                    title: "Inventory Sync",
                    desc: "Pre-configured Shopify dashboard. Choose fulfillment-center restock or manual restock.",
                  },
                ].map((item, i) => (
                  <div
                    key={item.title}
                    className={`reveal stagger-${i + 1} flex items-start gap-5 rounded-2xl border border-zinc-800/60 p-6 transition-colors hover:border-purple-500/20`}
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-500/10">
                      <svg
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="h-3.5 w-3.5 text-purple-400"
                        aria-hidden="true"
                      >
                        <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-base font-semibold">{item.title}</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* §12 — NEW: Dashboard Preview */}
          <section className="flex min-h-screen flex-col items-center justify-center px-6">
            <div
              ref={dashboardRef}
              className="reveal flex w-full justify-center"
            >
              <DashboardPreview />
            </div>
          </section>

          {/* §13 — NEW: Social Proof */}
          <section className="flex min-h-screen flex-col items-center justify-center px-6">
            <div ref={socialRef} className="reveal w-full max-w-4xl">
              <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.22em] text-zinc-600">
                Proof
              </p>
              <h2 className="mb-14 text-center text-4xl font-bold sm:text-5xl">
                Trusted by brands like yours
              </h2>

              {/* Key stats */}
              <div className="mb-14 flex flex-wrap justify-center gap-12 sm:gap-20">
                {[
                  { val: 50, suffix: "+", label: "Brands Deployed" },
                  {
                    val: 2400000,
                    suffix: "+",
                    label: "Impressions Delivered",
                    prefix: "",
                  },
                  { val: 18, suffix: "%", label: "Avg Conversion Rate" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <AnimatedNumber
                      value={stat.val}
                      suffix={stat.suffix}
                      prefix={stat.prefix}
                      className="text-4xl font-bold tabular-nums text-purple-400"
                    />
                    <p className="mt-2 text-xs text-zinc-500">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Testimonials */}
              <div className="grid gap-5 sm:grid-cols-3">
                {TESTIMONIALS.map((t, i) => (
                  <div
                    key={t.name}
                    className={`reveal stagger-${i + 1} flex flex-col rounded-2xl border border-zinc-800/60 p-6 transition-colors hover:border-purple-500/15`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="mb-3 h-5 w-5 text-purple-500/30"
                      aria-hidden="true"
                    >
                      <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
                    </svg>
                    <p className="flex-1 text-sm leading-relaxed text-zinc-400">
                      {t.quote}
                    </p>
                    <div className="mt-5 border-t border-zinc-800/40 pt-4">
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-zinc-500">
                        {t.role}, {t.brand}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Trusted-by row */}
              <div className="mt-14 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-40">
                {[
                  "StreetWeave",
                  "Bloom Botanicals",
                  "NomNom Kitchen",
                  "Urban Drip",
                  "RVLT Goods",
                  "SoleCraft",
                ].map((b) => (
                  <span
                    key={b}
                    className="text-sm font-bold tracking-wider text-zinc-500"
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* §14 — FAQ */}
          <section className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
            <div ref={faqRef} className="reveal w-full max-w-3xl">
              <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.22em] text-zinc-600">
                Questions & Answers
              </p>
              <h2 className="mb-3 text-center text-4xl font-bold sm:text-5xl">
                Everything you need to know
              </h2>
              <p className="mb-16 text-center text-sm text-zinc-500">
                Still curious?{" "}
                <span className="text-purple-400 underline underline-offset-4 cursor-pointer hover:text-purple-300 transition-colors">
                  Book a call
                </span>{" "}
                and we'll walk through it live.
              </p>

              <div className="space-y-3">
                {FAQ_ITEMS.map((item, i) => {
                  const isOpen = openFaq === i;
                  return (
                    <div
                      key={item.q}
                      className={`group overflow-hidden rounded-2xl border transition-all duration-300 ${
                        isOpen
                          ? "border-purple-500/30 bg-purple-500/[0.04] shadow-lg shadow-purple-500/5"
                          : "border-zinc-800/60 hover:border-zinc-700/60 bg-transparent"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : i)}
                        className="flex w-full items-start gap-5 px-6 py-5 text-left"
                      >
                        {/* Index number */}
                        <span
                          className={`mt-0.5 shrink-0 font-mono text-xs tabular-nums transition-colors duration-200 ${
                            isOpen
                              ? "text-purple-400"
                              : "text-zinc-700 group-hover:text-zinc-500"
                          }`}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-0.5">
                            <span
                              className={`text-[10px] font-semibold uppercase tracking-widest transition-colors duration-200 ${
                                isOpen ? "text-purple-400" : "text-zinc-600"
                              }`}
                            >
                              {item.tag}
                            </span>
                          </div>
                          <span
                            className={`block text-sm font-medium leading-snug transition-colors duration-200 ${
                              isOpen ? "text-white" : "text-zinc-300"
                            }`}
                          >
                            {item.q}
                          </span>
                        </div>

                        {/* Chevron */}
                        <span
                          className={`mt-0.5 ml-2 shrink-0 flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-300 ${
                            isOpen
                              ? "border-purple-500/40 bg-purple-500/10 rotate-180"
                              : "border-zinc-800 rotate-0 group-hover:border-zinc-700"
                          }`}
                        >
                          <svg
                            viewBox="0 0 16 16"
                            fill="currentColor"
                            className={`h-3 w-3 transition-colors ${isOpen ? "text-purple-400" : "text-zinc-500"}`}
                            aria-hidden="true"
                          >
                            <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" />
                          </svg>
                        </span>
                      </button>

                      {isOpen && (
                        <div className="fade-in px-6 pb-6">
                          {/* Separator */}
                          <div className="mb-4 h-px bg-purple-500/10" />
                          <p className="pl-10 text-sm leading-loose text-zinc-400">
                            {item.a}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom nudge */}
              <div className="mt-12 flex items-center justify-center gap-4">
                <div className="h-px flex-1 bg-zinc-800/60" />
                <span className="text-xs text-zinc-600">
                  6 questions · updated Mar 2026
                </span>
                <div className="h-px flex-1 bg-zinc-800/60" />
              </div>
            </div>
          </section>

          {/* §15 — CTA */}
          <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
            <div ref={ctaRef} className="reveal">
              <h2 className="mb-4 text-4xl font-bold sm:text-6xl">
                Ready to deploy?
              </h2>
              <p className="mx-auto mb-10 max-w-md text-base text-zinc-500">
                Book a 15-minute consultation with our Retail Operations Lead to
                finalize your pricing and logistics roadmap.
              </p>
              <button
                type="button"
                className="rounded-xl bg-purple-600 px-10 py-4 text-sm font-semibold text-white shadow-xl shadow-purple-600/20 transition hover:bg-purple-500"
              >
                Book Consultation →
              </button>
              <div className="mt-14">
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setStep(0);
                    setForm(DEFAULT_FORM);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="text-xs text-zinc-600 transition hover:text-zinc-400"
                >
                  Start a new report
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

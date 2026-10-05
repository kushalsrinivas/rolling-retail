import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

export const Route = createFileRoute("/admin")({
	component: AdminPage,
	head: () => ({
		meta: [
			{ title: "CMS — Rolling Retail" },
			{ name: "robots", content: "noindex, nofollow" },
		],
	}),
});

interface Submission {
	sessionId: string;
	createdAt: number;
	lastSeen: number;
	quizSteps: Array<{
		step: string;
		at: number;
		data: Record<string, unknown>;
	}>;
	spec: Record<string, unknown> | null;
	version: number | null;
	images: Array<{ label: string; status: string; url: string | null }>;
	videos: Array<{
		id: string;
		kind: string;
		status: string;
		url: string | null;
	}>;
	lead: Record<string, unknown> | null;
	turns: number;
}

const TOKEN_KEY = "ftf_admin_token";

function fmt(ts: number) {
	try {
		return new Date(ts).toLocaleString();
	} catch {
		return String(ts);
	}
}

function AdminPage() {
	const [token, setToken] = useState("");
	const [draft, setDraft] = useState("");
	const [subs, setSubs] = useState<Submission[]>([]);
	const [selected, setSelected] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const load = useCallback(async (t: string) => {
		if (!t) return;
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/agent/submissions", {
				headers: { "x-factory-token": t },
			});
			if (res.status === 401) throw new Error("Wrong token.");
			if (!res.ok) throw new Error(`Load failed (${res.status})`);
			const data = (await res.json()) as { submissions?: Submission[] };
			setSubs(data.submissions ?? []);
			setSelected((prev) => prev ?? data.submissions?.[0]?.sessionId ?? null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Load failed");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		try {
			const saved = sessionStorage.getItem(TOKEN_KEY) ?? "";
			if (saved) {
				setToken(saved);
				void load(saved);
			}
		} catch {
			/* no storage */
		}
	}, [load]);

	const login = () => {
		const t = draft.trim();
		if (!t) return;
		try {
			sessionStorage.setItem(TOKEN_KEY, t);
		} catch {
			/* ignore */
		}
		setToken(t);
		void load(t);
	};

	if (!token) {
		return (
			<div className="mx-auto max-w-sm px-4 py-20">
				<h1 className="text-lg font-bold">Factory CMS</h1>
				<p className="mt-1 text-sm text-neutral-500">
					Staff only — enter the dashboard token.
				</p>
				<input
					type="password"
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && login()}
					placeholder="FACTORY_DASHBOARD_TOKEN"
					className="mt-4 w-full rounded border px-3 py-2 text-sm"
				/>
				<button
					type="button"
					onClick={login}
					className="mt-2 w-full rounded bg-neutral-900 px-4 py-2 text-sm text-white"
				>
					Open CMS
				</button>
				{error && <p className="mt-2 text-xs text-red-600">{error}</p>}
			</div>
		);
	}

	const current = subs.find((s) => s.sessionId === selected) ?? null;

	return (
		<div className="mx-auto max-w-6xl px-4 py-8">
			<div className="flex items-center justify-between">
				<h1 className="text-lg font-bold">Factory CMS — {subs.length} runs</h1>
				<button
					type="button"
					onClick={() => load(token)}
					className="rounded border px-3 py-1.5 text-xs"
				>
					{loading ? "Loading…" : "Refresh"}
				</button>
			</div>
			{error && <p className="mt-2 text-xs text-red-600">{error}</p>}
			<div className="mt-4 grid gap-4 md:grid-cols-[280px_1fr]">
				<div className="divide-y rounded border">
					{subs.map((s) => {
						const spec = s.spec as {
							brand?: string;
							businessType?: string;
							vehicleId?: string;
						} | null;
						return (
							<button
								key={s.sessionId}
								type="button"
								onClick={() => setSelected(s.sessionId)}
								className={`block w-full px-3 py-2.5 text-left text-xs ${
									selected === s.sessionId ? "bg-neutral-100" : ""
								}`}
							>
								<span className="block font-semibold">
									{String(spec?.brand || "Unnamed")}{" "}
									<span className="font-normal text-neutral-500">
										· {String(spec?.businessType ?? "?")} ·{" "}
										{String(spec?.vehicleId ?? "no spec yet")}
									</span>
								</span>
								<span className="mt-0.5 block text-neutral-500">
									{fmt(s.lastSeen)} · {s.quizSteps.length} quiz steps ·{" "}
									{s.images.filter((i) => i.status === "ready").length} renders
									· {s.turns} turns
								</span>
							</button>
						);
					})}
					{subs.length === 0 && !loading && (
						<p className="px-3 py-6 text-center text-xs text-neutral-500">
							No runs yet — complete the quiz once to see a record here.
						</p>
					)}
				</div>
				<div>
					{!current && (
						<p className="text-sm text-neutral-500">Select a run.</p>
					)}
					{current && <Detail sub={current} />}
				</div>
			</div>
		</div>
	);
}

function Detail({ sub }: { sub: Submission }) {
	return (
		<div className="space-y-5">
			<section className="rounded border p-4">
				<h2 className="text-sm font-bold">Quiz answers per round</h2>
				{sub.quizSteps.length === 0 && (
					<p className="mt-1 text-xs text-neutral-500">
						No quiz steps logged (pre-quiz session or direct chat).
					</p>
				)}
				{sub.quizSteps.map((s) => (
					<div key={`${s.step}-${s.at}`} className="mt-2 text-xs">
						<span className="font-semibold">{s.step}</span>
						<span className="text-neutral-500"> · {fmt(s.at)}</span>
						<div className="mt-1 flex flex-wrap gap-1">
							{Object.entries(s.data).map(([k, v]) => (
								<span key={k} className="rounded bg-neutral-100 px-1.5 py-0.5">
									{k}:{" "}
									{Array.isArray(v) ? v.join(", ") || "—" : String(v ?? "—")}
								</span>
							))}
						</div>
					</div>
				))}
			</section>

			<section className="rounded border p-4">
				<h2 className="text-sm font-bold">
					Final design{sub.version ? ` · v${sub.version}` : ""}
				</h2>
				{!sub.spec && (
					<p className="mt-1 text-xs text-neutral-500">
						No spec committed yet.
					</p>
				)}
				{sub.spec && (
					<pre className="mt-2 overflow-x-auto text-[11px] leading-relaxed">
						{JSON.stringify(sub.spec, null, 1)}
					</pre>
				)}
			</section>

			<section className="rounded border p-4">
				<h2 className="text-sm font-bold">
					AI renders ({sub.images.filter((i) => i.status === "ready").length})
				</h2>
				{sub.images.length === 0 && (
					<p className="mt-1 text-xs text-neutral-500">No renders yet.</p>
				)}
				<div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
					{sub.images.map((img) => (
						<figure key={img.label} className="overflow-hidden rounded border">
							{img.url ? (
								<img
									src={img.url}
									alt={img.label}
									className="aspect-square w-full object-cover"
									loading="lazy"
								/>
							) : (
								<div className="grid aspect-square place-items-center bg-neutral-100 text-[11px] text-neutral-500">
									{img.status}
								</div>
							)}
							<figcaption className="px-2 py-1 text-[11px]">
								{img.label.replace(/_/g, " ")}
							</figcaption>
						</figure>
					))}
				</div>
			</section>

			{(sub.videos.length > 0 || sub.lead) && (
				<section className="rounded border p-4 text-xs">
					<h2 className="text-sm font-bold">Handoff</h2>
					{sub.videos.length > 0 && (
						<p className="mt-1">
							Videos:{" "}
							{sub.videos.map((v) => `${v.kind} (${v.status})`).join(", ")}
						</p>
					)}
					{sub.lead && (
						<pre className="mt-2 overflow-x-auto text-[11px]">
							{JSON.stringify(sub.lead, null, 1)}
						</pre>
					)}
				</section>
			)}
		</div>
	);
}

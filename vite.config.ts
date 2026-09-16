import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Nitro's default preset is `node-server`, which emits a long-running server
 * at .output/server/index.mjs. Vercel needs the `vercel` preset instead, or
 * every /api/* route (agent, rodin, trpc, auth) silently ships as static
 * nothing. Vercel sets VERCEL=1 in its build environment; NITRO_PRESET
 * overrides for any other host.
 */
const preset =
	process.env.NITRO_PRESET ?? (process.env.VERCEL ? "vercel" : "node-server");

const config = defineConfig({
	plugins: [
		devtools(),
		tsconfigPaths({ projects: ["./tsconfig.json"] }),
		tailwindcss(),
		tanstackStart(),
		nitro({
			preset,
			// The proxy streams ~10MB models from TOS through a serverless
			// function. From the default region that pipe crosses the world
			// and dies mid-stream, and the viewer then parses a truncated
			// GLB ("Invalid typed array length"). Keep the function near the
			// users and give the stream room to finish.
			vercel: { functions: { regions: ["bom1"], maxDuration: 60 } },
		}),
		viteReact(),
	],
});

export default config;

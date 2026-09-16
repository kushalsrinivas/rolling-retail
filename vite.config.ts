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
		nitro({ preset }),
		viteReact(),
	],
});

export default config;

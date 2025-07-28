import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, fontProviders } from "astro/config";
import playformCompress from "@playform/compress";
import packageJson from "./package.json";
import esmShim from "@rollup/plugin-esm-shim";
import { copyFile, glob } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

const deps = [
  ...Object.keys(packageJson.dependencies),
  ...Object.keys(packageJson.devDependencies),
  "@monorepo/prisma-client",
];

// https://astro.build/config
export default defineConfig({
  integrations: [react(), playformCompress({ Logger: 1 })],

  vite: {
    plugins: [tailwindcss(), ssrPlugin(esmShim()), copyNodeFiles()],
    build: {
      rollupOptions: {
        output: {
          hashCharacters: "hex",
          entryFileNames: "_chunk/[hash].mjs",
          chunkFileNames: "_chunk/[hash].mjs",
          assetFileNames: "_astro/[hash][extname]",
        },
      },
    },
    esbuild: {
      // TODO: add a opensource license page
      legalComments: "none",
    },
    ssr: {
      noExternal: process.env.NODE_ENV === "production" ? deps : undefined,
    },
  },

  output: "server",

  adapter: node({
    mode: "standalone",
  }),

  server: {
    port: 3000,
  },

  experimental: {
    fonts: [
      {
        provider: fontProviders.fontsource(),
        name: "Noto Sans JP",
        cssVariable: "--font-noto-sans-jp",
        subsets: ["latin"],
        weights: ["300 700"],
        fallbacks: ["Noto Sans JP Variable", "sans-serif"],
        optimizedFallbacks: true,
      },
      {
        provider: fontProviders.fontsource(),
        name: "Inconsolata",
        cssVariable: "--font-inconsolata",
        subsets: ["latin"],
        weights: ["300 700"],
        fallbacks: ["Inconsolata Variable", "monospace"],
        optimizedFallbacks: true,
      },
    ],
  },
});

function ssrPlugin(plugin: any) {
  return {
    name: plugin.name,
    applyToEnvironment(environment: any) {
      return environment.name === "ssr" ? plugin : null;
    },
  };
}

function copyNodeFiles() {
  return {
    name: "copy-node-files",
    apply: "build" as const,
    async closeBundle() {
      const sourceDir = resolve("node_modules/@monorepo/prisma-client");
      const destDir = resolve("dist/server");

      for await (const file of glob(`${sourceDir}/**/*.node`)) {
        const destFile = join(destDir, basename(file));
        await copyFile(file, destFile);
      }
    },
  };
}

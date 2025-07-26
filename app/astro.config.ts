import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, fontProviders } from "astro/config";

// https://astro.build/config
export default defineConfig({
  integrations: [react()],

  vite: {
    plugins: [tailwindcss()],
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
        provider: fontProviders.google(),
        name: "Noto Sans JP",
        cssVariable: "--font-noto-sans-jp",
        subsets: ["latin"],
        weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
        fallbacks: ["sans-serif"],
        optimizedFallbacks: false,
      },
      {
        provider: fontProviders.google(),
        name: "Inconsolata",
        cssVariable: "--font-inconsolata",
        subsets: ["latin"],
        weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
        fallbacks: ["monospace"],
        optimizedFallbacks: false,
      },
    ],
  },
});

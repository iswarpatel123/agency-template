import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import solidJs from "@astrojs/solid-js";
import { visualizer } from "rollup-plugin-visualizer";

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), solidJs()],
  // Explicitly set output mode to 'static' for Render deployment
  output: 'static',
  vite: {
    plugins: [visualizer({ filename: 'dist/stats.html', open: false })],
    build: {
      rollupOptions: {
        output: {
          chunkFileNames: 'chunks/[name]-[hash].js',
        },
      },
    },
  },
});
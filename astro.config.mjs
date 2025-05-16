import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import solidJs from "@astrojs/solid-js";
import cloudflare from "@astrojs/cloudflare"; // Import the Cloudflare adapter

// https://astro.build/config
export default defineConfig({
  output: "server", // Set output to server for Cloudflare Pages
  adapter: cloudflare(), // Add the Cloudflare adapter
  integrations: [tailwind(), solidJs()],
  // site: "https://your-cloudflare-pages-domain.pages.dev", // Optional: Update if you have a custom domain or remove if using the default
  // The existing site property "https://vbartalis.github.io" is for GitHub Pages.
  // You'll likely want to change this or remove it when deploying to Cloudflare.
  // If you remove it, Astro will attempt to infer it or you can set it later.
  // For now, I'll comment it out. If you have a specific Cloudflare domain, uncomment and update it.
  // site: "https://vbartalis.github.io", 
});
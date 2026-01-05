import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import * as fs from "node:fs";
import rehypeMermaid from "rehype-mermaid";
import starlightSidebarTopics from "starlight-sidebar-topics";

import tailwindcss from "@tailwindcss/vite";

let sidebar = JSON.parse(fs.readFileSync("generated/sidebar-from-site-structure.json"));
let redirects = JSON.parse(fs.readFileSync("generated/redirects.json"));
let config = JSON.parse(fs.readFileSync("generated/config.json"));
let aepEditions = JSON.parse(fs.readFileSync("aep-editions.json"));

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: "https://aep.dev",
  redirects: redirects,

  markdown: {
    rehypePlugins: [[rehypeMermaid, { dark: true }]],
  },

  integrations: [
    starlight({
      title: "Thryv AEP",
      customCss: [
        // Path to your Tailwind base styles:
        "./src/styles/global.css",
      ],
      plugins: [
        starlightSidebarTopics(sidebar, {
          topics: {
            aeps: aepEditions.editions
              .filter((edition) => edition.folder !== ".")
              .flatMap((edition) => [
                `/${edition.folder}`,
                `/${edition.folder}/**/*`,
              ]),
          },
        }),
      ],
      social: [
        { icon: "github", label: "GitHub", href: config.urls.repo },
      ],
      components: {
        Banner: "./src/components/overrides/Banner.astro",
        Head: "./src/components/overrides/Head.astro",
        SkipLink: "./src/components/overrides/SkipLink.astro",
        TableOfContents: "./src/components/overrides/TableOfContents.astro",
        ThemeSelect: "./src/components/overrides/ThemeSelect.astro",
      },
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});

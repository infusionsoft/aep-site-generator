import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import * as fs from "node:fs";
import rehypeMermaid from "rehype-mermaid";
import tailwindcss from "@tailwindcss/vite";

// Helper function to check if an edition is the latest
const isLatestEdition = (edition) => edition.folder === ".";

// Load site structure and transform it into Starlight sidebar format
const siteStructure = JSON.parse(
    fs.readFileSync("generated/site-structure.json", "utf-8"),
);

// Helper function to get the latest edition from site structure
function getLatestEditionName(siteStructure) {
  const editionNames = Object.keys(siteStructure.aeps.editions);
  if (editionNames.length === 0) return null;

  // Check for edition with folder = "." (latest edition)
  const currentFolderEdition = editionNames.find(
      (name) => siteStructure.aeps.editions[name].folder === ".",
  );
  if (currentFolderEdition) return currentFolderEdition;

  // Check for standard names
  const standardEdition = editionNames.find((name) =>
      ["general", "main", "default"].includes(name.toLowerCase()),
  );
  if (standardEdition) return standardEdition;

  // Fall back to first edition
  return editionNames[0];
}

// Transform site structure into Starlight sidebar format
function transformSiteStructureToSidebar(siteStructure) {
  const sidebar = [];

  // Overview section
  sidebar.push({
    label: siteStructure.overview.metadata.label,
    items: siteStructure.overview.pages.map((page) => page.link),
  });

  // AEPs section
  const latestEditionName = getLatestEditionName(siteStructure);
  const aepItems = [];
  if (latestEditionName) {
    const latestEdition = siteStructure.aeps.editions[latestEditionName];
    for (const category of latestEdition.categories) {
      aepItems.push({
        label: category.title,
        items: category.aeps.map((aep) => ({
          label: `${aep.id}. ${aep.title}`,
          link: aep.id.toString(),
        })),
      });
    }
  }
  sidebar.push({
    label: siteStructure.aeps.metadata.label,
    items: aepItems,
  });

  return sidebar;
}

let sidebar = transformSiteStructureToSidebar(siteStructure);
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
      sidebar: sidebar,
      social: [
        { icon: "github", label: "GitHub", href: config.urls.repo },
      ],
      components: {
        Banner: "./src/components/overrides/Banner.astro",
        Head: "./src/components/overrides/Head.astro",
        Sidebar: "./src/components/overrides/Sidebar.astro",
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

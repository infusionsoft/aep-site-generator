import * as fs from "node:fs";
import { getLatestEditionName, type SiteStructure } from "./site-structure";
import type { Sidebar } from "../../scripts/src/types";

/**
 * Read site structure from a JSON file
 */
function readSiteStructure(inputPath: string): SiteStructure {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Site structure file not found: ${inputPath}`);
  }

  const json = fs.readFileSync(inputPath, "utf-8");
  const siteStructure = JSON.parse(json) as SiteStructure;
  console.log(`✓ Read site structure from ${inputPath}`);
  return siteStructure;
}

/**
 * Assembles a complete sidebar structure from a SiteStructure object
 */
function assembleSidebarFromSiteStructure(
  siteStructure: SiteStructure,
): Sidebar[] {
  const sidebar: Sidebar[] = [
    {
      label: "Overview",
      link: "1",
      icon: "bars",
      id: "overview",
      items: assembleOverviewItems(siteStructure),
    },
    {
      label: "AEPs",
      link: "/general",
      icon: "open-book",
      id: "aeps",
      items: assembleAEPItems(siteStructure),
    },
  ];

  return sidebar;
}

/**
 * Assemble overview section items from site structure
 */
function assembleOverviewItems(siteStructure: SiteStructure): any[] {
  return siteStructure.overview.pages.map((page) => page.link);
}

/**
 * Assemble AEP section items from site structure
 */
function assembleAEPItems(siteStructure: SiteStructure): any[] {
  const items: any[] = [];
  const latestEditionName = getLatestEditionName(siteStructure);

  if (!latestEditionName) {
    return items;
  }

  const latestEdition = siteStructure.aeps.editions[latestEditionName];

  // Build items from categories
  for (const category of latestEdition.categories) {
    items.push({
      label: category.title,
      items: category.aeps.map((aep) => ({
        label: `${aep.id}. ${aep.title}`,
        link: aep.id.toString(),
      })),
    });
  }

  return items;
}

export { readSiteStructure, assembleSidebarFromSiteStructure };

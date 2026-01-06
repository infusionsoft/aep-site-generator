import * as fs from "node:fs";
import * as path from "node:path";

import loadConfigFiles from "./src/config";
import {type AEP, type GroupFile} from "./src/types";
import {buildMarkdown, Markdown} from "./src/markdown";
import {load} from "js-yaml";
import {
  logFileRead,
  getTitle,
  writeFile,
  getFolders,
} from "./src/utils";
import {
  createEmptySiteStructure,
  addOverviewPage,
  addAEPEdition,
  writeSiteStructure,
  type SiteStructure,
} from "../src/utils/site-structure";
import { assembleSidebarFromSiteStructure } from "../src/utils/sidebar-from-site-structure";

const AEP_LOC = process.env.AEP_LOCATION || "";
const AEP_EDITION_V4_PREVIEW = process.env.AEP_EDITION_V4_PREVIEW || "";

// Logging functions
function logFolderDetection() {
  console.log("=== Folder Detection ===");

  if (AEP_LOC) {
    console.log(`✓ AEP folder found: ${AEP_LOC}`);
    if (fs.existsSync(AEP_LOC)) {
      console.log(`  - Path exists and is accessible`);
    } else {
      console.log(`  - ⚠️  Path does not exist`);
    }
  } else {
    console.log(
      `✗ AEP folder not configured (AEP_LOCATION environment variable)`,
    );
  }

  if (AEP_EDITION_V4_PREVIEW) {
    console.log(`✓ AEP Edition v4 folder found: ${AEP_EDITION_V4_PREVIEW}`);
    if (fs.existsSync(AEP_EDITION_V4_PREVIEW)) {
      console.log(`  - Path exists and is accessible`);
    } else {
      console.log(`  - ⚠️  Path does not exist`);
    }
  } else {
    console.log(
      `✗ AEP Edition v4 folder not configured (AEP_EDITION_V4_PREVIEW environment variable)`,
    );
  }

  console.log("");
}

async function writePage(
  dirPath: string,
  filename: string,
  outputPath: string,
  title?: string,
) {
  const filePath = path.join(dirPath, filename);
  logFileRead(filePath, "Page content");
  let contents = new Markdown(fs.readFileSync(filePath, "utf-8"), {});
  contents.frontmatter = {
    title: title ?? getTitle(contents.contents),
  };
  writeFile(outputPath, contents.removeTitle().build());
}

async function writePagesToSiteStructure(
  dirPath: string,
  siteStructure: SiteStructure,
): Promise<SiteStructure> {
  const entries = await fs.promises.readdir(
    path.join(dirPath, "pages/general/"),
    {withFileTypes: true},
  );

  let files = entries.filter(
    (entry) => entry.isFile() && entry.name.endsWith(".md"),
  );

  for (let file of files) {
    await writePage(
      path.join(dirPath, "pages/general"),
      file.name,
      path.join("src/content/docs", file.name),
    );
    const link = file.name.replace(".md", "");
    addOverviewPage(siteStructure, { label: link, link });
  }
  await writePage(
    dirPath,
    "CONTRIBUTING.md",
    path.join("src/content/docs", "contributing.md"),
  );
  addOverviewPage(siteStructure, {
    label: "contributing",
    link: "contributing",
  });
  return siteStructure;
}

function readAEP(dirPath: string): string[] {
  const md_path = path.join(dirPath, "aep.md");
  const yaml_path = path.join(dirPath, "aep.yaml");

  logFileRead(md_path, "AEP markdown template");
  const md_contents = fs.readFileSync(md_path, "utf8");

  logFileRead(yaml_path, "AEP metadata");
  const yaml_text = fs.readFileSync(yaml_path, "utf8");

  return [md_contents, yaml_text];
}

function readGroupFile(dirPath: string): GroupFile {
  const group_path = path.join(dirPath, "aep/general/scope.yaml");
  logFileRead(group_path, "AEP group configuration");
  const yaml_contents = fs.readFileSync(group_path, "utf-8");
  return load(yaml_contents) as GroupFile;
}

function buildAEP(files: string[], folder: string): AEP {
  const md_text = files[0];
  const yaml_text = files[1];

  const yaml = load(yaml_text);

  yaml.title = getTitle(md_text).replace("\n", "");
  let slug = yaml.slug;
  delete yaml.slug;

  let contents = buildMarkdown(md_text, folder);

  contents.frontmatter = yaml;
  contents.addComponent({
    names: ["Aside", "Tabs", "TabItem"],
    path: "@astrojs/starlight/components",
  });
  contents.addComponent({
    names: ["Sample"],
    path: "/src/components/Sample.astro",
  });

  contents.frontmatter["prev"] = false;
  contents.frontmatter["next"] = false;

  contents.frontmatter["isAEP"] = true;

  // Write everything to a markdown file.
  return {
    title: yaml.title,
    id: yaml.id,
    slug: slug,
    frontmatter: yaml,
    category: yaml.placement.category,
    order: yaml.placement.order,
    contents: contents,
  };
}

function writeMarkdown(aep: AEP) {
  const filePath = path.join("src/content/docs", `${aep.id}.mdx`);
  writeFile(filePath, aep.contents.build());
}

function writeSidebar(sideBar: any, filePath: string) {
  writeFile(path.join("generated", filePath), JSON.stringify(sideBar));
}

async function assembleAEPs(): Promise<AEP[]> {
  let AEPs = [];
  const aep_folders = await getFolders(path.join(AEP_LOC, "aep/general/"));
  for (let folder of aep_folders) {
    try {
      const files = readAEP(folder);
      AEPs.push(buildAEP(files, folder));
    } catch (e) {
      console.log(`AEP ${folder} failed with error ${e}`);
    }
  }
  return AEPs;
}

function buildRedirects(aeps: AEP[]): object {
  return Object.fromEntries(aeps.map((aep) => [`/${aep.slug}`, `/${aep.id}`]));
}

export function buildLLMsTxt(aeps: AEP[]): string {
  // Sort AEPs by ID for consistent ordering
  const sortedAEPs = aeps.toSorted((a, b) => Number.parseInt(a.id) - Number.parseInt(b.id));

  const sections = sortedAEPs.map((aep) => {
    // Get the raw markdown content without frontmatter and components
    let content = aep.contents.contents;

    // Remove any remaining component imports or JSX-style tags
    content = content.replaceAll(/import\s+.*from\s+['"].*['"];?\n?/g, "");
    content = content.replaceAll(
      /<[A-Z][^>]*\/?>.*?<\/[A-Z][^>]*>|<[A-Z][^>]*\/>/gs,
      "",
    );

    // Clean up any remaining MDX artifacts
    content = content.replaceAll(/\{\/\*[\s\S]*?\*\/}/g, ""); // Remove JSX comments
    content = content.replaceAll(/<!--[\s\S]*?-->/g, ""); // Remove HTML comments
    content = content.trim();

    return `# AEP-${aep.id} ${aep.title}\n\n${content}`;
  });

  return sections.join("\n\n---\n\n");
}

// Log folder detection status
logFolderDetection();

// Create site structure
let siteStructure = createEmptySiteStructure();

if (AEP_LOC == "") {
  console.warn("AEP repo is not found.");
} else {
  console.log("=== Processing AEP Repository ===");
  // Build config.
  let config = loadConfigFiles("hero.yaml", "urls.yaml", "site.yaml");
  writeSidebar(config, "config.json");

  // Write assorted pages.
  siteStructure = await writePagesToSiteStructure(AEP_LOC, siteStructure);

  // Build out AEPs.
  let aeps = await assembleAEPs();

  // Add AEPs to site structure
  const groups = readGroupFile(AEP_LOC);
  addAEPEdition(siteStructure, "general", aeps, groups, ".");

  // Write AEPs to files (only categorized ones to match sidebar).
  const validCategories = new Set(groups.categories.map((c) => c.code));
  const categorizedAEPs = aeps.filter((aep) =>
    validCategories.has(aep.category),
  );
  for (let aep of categorizedAEPs) {
    writeMarkdown(aep);
  }

  writeSidebar(buildRedirects(categorizedAEPs), "redirects.json");

  // Generate llms.txt file with all AEP contents
  const llmsTxtContent = buildLLMsTxt(categorizedAEPs);
  writeFile("public/llms.txt", llmsTxtContent);
}

if (AEP_EDITION_V4_PREVIEW == "") {
  console.log("ℹ️  AEP Edition v4 repo not configured, skipping...\n");
} else {
  console.log("=== Processing AEP Edition v4 ===");
  // Build out AEPs from the v4 edition
  let aepsV4 = [];
  const aep_folders_v4 = await getFolders(
    path.join(AEP_EDITION_V4_PREVIEW, "aep/general/"),
  );
  for (let folder of aep_folders_v4) {
    try {
      const files = readAEP(folder);
      const aep = buildAEP(files, folder);
      aepsV4.push(aep);

      // Write to v4-preview directory instead of root
      aep.contents.frontmatter.slug = `v4-preview/${aep.id.toString()}`;
      const filePath = path.join("src/content/docs/v4-preview", `${aep.id}.mdx`);
      writeFile(filePath, aep.contents.build());

      console.log(`✓ Processed AEP-${aep.id} for v4 edition`);
    } catch (e) {
      console.log(`AEP ${folder} failed with error ${e}`);
    }
  }

  // Add v4 edition to site structure
  const groupsV4 = readGroupFile(AEP_EDITION_V4_PREVIEW);
  addAEPEdition(siteStructure, "v4-preview", aepsV4, groupsV4, "v4-preview");

  console.log("✅ AEP Edition v4 processing complete\n");
}

// Write site structure to JSON
writeSiteStructure(siteStructure, "generated/site-structure.json");

// Assemble sidebar from site structure and write it
const sidebar = assembleSidebarFromSiteStructure(siteStructure);
writeSidebar(sidebar, "sidebar-from-site-structure.json");

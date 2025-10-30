import * as fs from "fs";
import * as path from "path";

import loadConfigFiles from "./src/config";
import {addToSidebar, buildSidebar,} from "./src/sidebar";
import {type AEP, type GroupFile, type Sidebar,} from "./src/types";
import {buildMarkdown, Markdown} from "./src/markdown";
import {load} from "js-yaml";

const AEP_LOC = process.env.AEP_LOCATION || "";

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

  console.log("");
}

function logFileRead(filePath: string, source: string = "unknown") {
  console.log(`📖 Reading file: ${filePath} (source: ${source})`);
}

function logFileWrite(filePath: string, size?: number) {
  const sizeInfo = size ? ` (${size} bytes)` : "";
  console.log(`📝 Writing file: ${filePath}${sizeInfo}`);
}

async function getFolders(dirPath: string): Promise<string[]> {
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

  const folders = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(dirPath, entry.name));

  return folders;
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

async function writePages(
  dirPath: string,
  sidebar: Sidebar[],
): Promise<Sidebar[]> {
  const entries = await fs.promises.readdir(
    path.join(dirPath, "pages/general/"),
    { withFileTypes: true },
  );

  let files = entries.filter(
    (entry) => entry.isFile() && entry.name.endsWith(".md"),
  );

  for (var file of files) {
    writePage(
      path.join(dirPath, "pages/general"),
      file.name,
      path.join("src/content/docs", file.name),
    );
    addToSidebar(sidebar, "Overview", [file.name.replace(".md", "")]);
  }
  writePage(
    dirPath,
    "CONTRIBUTING.md",
    path.join("src/content/docs", "contributing.md"),
  );
  addToSidebar(sidebar, "Overview", ["contributing"]);
  return sidebar;
}

function readAEP(dirPath: string): string[] {
  const md_path = path.join(dirPath, "aep.md.j2");
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

function getTitle(contents: string): string {
  var title_regex = /# (.*)\n/;
  const matches = contents.match(title_regex);
  return matches[1]!.replaceAll(":", "-").replaceAll("`", "");
}

function buildAEP(files: string[], folder: string): AEP {
  const md_text = files[0];
  const yaml_text = files[1];

  const yaml = load(yaml_text);

  yaml.title = getTitle(md_text).replace("\n", "");

  let contents = buildMarkdown(md_text, folder);

  contents.frontmatter = yaml;
  contents.addComponent({
    names: ["Aside", "Tabs", "TabItem"],
    path: "@astrojs/starlight/components",
  });
  contents.addComponent({
    names: ["Sample"],
    path: "../../components/Sample.astro",
  });

  contents.frontmatter["prev"] = false;
  contents.frontmatter["next"] = false;

  contents.frontmatter["isAEP"] = true;

  // Write everything to a markdown file.
  return {
    title: yaml.title,
    id: yaml.id,
    frontmatter: yaml,
    category: yaml.placement.category,
    order: yaml.placement.order,
    slug: yaml.slug,
    contents: contents,
  };
}

function writeMarkdown(aep: AEP) {
  aep.contents.frontmatter.slug = aep.id.toString();

  const filePath = path.join("src/content/docs", `${aep.id}.mdx`);
  writeFile(filePath, aep.contents.build());
}

function writeSidebar(sideBar: any, filePath: string) {
  writeFile(path.join("generated", filePath), JSON.stringify(sideBar));
}

async function assembleAEPs(): Promise<AEP[]> {
  let AEPs = [];
  const aep_folders = await getFolders(path.join(AEP_LOC, "aep/general/"));
  for (var folder of aep_folders) {
    try {
      const files = readAEP(folder);
      AEPs.push(buildAEP(files, folder));
    } catch (e) {
      console.log(`AEP ${folder} failed with error ${e}`);
    }
  }
  return AEPs;
}

function writeFile(filePath: string, contents: string) {
  const outDir = path.dirname(filePath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  logFileWrite(filePath, contents.length);
  fs.writeFileSync(filePath, contents, { flag: "w" });
}

function buildFullAEPList(aeps: AEP[]) {
  let response = [];
  let groups = readGroupFile(AEP_LOC);

  for (var group of groups.categories) {
    response.push({
      label: group.title,
      items: aeps
        .filter((aep) => aep.category == group.code)
        .sort((a1, a2) => (a1.order > a2.order ? 1 : -1))
        .map((aep) => {
          return {
            title: aep.title,
            id: aep.id,
            slug: aep.slug,
            status: aep.frontmatter.state,
          };
        }),
    });
  }
  return response;
}

function buildRedirects(aeps: AEP[]): object {
  return Object.fromEntries(aeps.map((aep) => [`/${aep.slug}`, `/${aep.id}`]));
}

export function buildLLMsTxt(aeps: AEP[]): string {
  // Sort AEPs by ID for consistent ordering
  const sortedAEPs = aeps.sort((a, b) => parseInt(a.id) - parseInt(b.id));

  const sections = sortedAEPs.map((aep) => {
    // Get the raw markdown content without frontmatter and components
    let content = aep.contents.contents;

    // Remove any remaining component imports or JSX-style tags
    content = content.replace(/import\s+.*from\s+['"].*['"];?\n?/g, "");
    content = content.replace(
      /<[A-Z][^>]*\/?>.*?<\/[A-Z][^>]*>|<[A-Z][^>]*\/>/gs,
      "",
    );

    // Clean up any remaining MDX artifacts
    content = content.replace(/\{\/\*[\s\S]*?\*\/\}/g, ""); // Remove JSX comments
    content = content.replace(/<!--[\s\S]*?-->/g, ""); // Remove HTML comments
    content = content.trim();

    return `# AEP-${aep.id} ${aep.title}\n\n${content}`;
  });

  return sections.join("\n\n---\n\n");
}

let sidebar: Sidebar[] = [
  {
    label: "Overview",
    link: "1",
    icon: "bars",
    items: [],
  },
  {
    label: "AEPs",
    link: "/general",
    icon: "open-book",
    items: [],
  },
];

// Log folder detection status
logFolderDetection();

if (AEP_LOC != "") {
  console.log("=== Processing AEP Repository ===");
  // Build config.
  let config = loadConfigFiles("hero.yaml", "urls.yaml", "site.yaml");
  writeSidebar(config, "config.json");

  // Write assorted pages.
  sidebar = await writePages(AEP_LOC, sidebar);

  // Build out AEPs.
  let aeps = await assembleAEPs();

  // Build sidebar.
  sidebar = buildSidebar(aeps, readGroupFile(AEP_LOC), sidebar);

  let full_aeps = buildFullAEPList(aeps);
  writeSidebar(full_aeps, "full_aeps.json");

  // Write AEPs to files.
  for (var aep of aeps) {
    writeMarkdown(aep);
  }

  writeSidebar(buildRedirects(aeps), "redirects.json");

  // Generate llms.txt file with all AEP contents
  const llmsTxtContent = buildLLMsTxt(aeps);
  writeFile("public/llms.txt", llmsTxtContent);
} else {
  console.warn("AEP repo is not found.");
}

writeSidebar(sidebar, "sidebar.json");

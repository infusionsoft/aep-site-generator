import * as fs from "node:fs";
import * as path from "node:path";
import type { AEP } from "./types.ts";

/**
 * Logs file read operations
 */
export function logFileRead(filePath: string, source: string = "unknown") {
  console.log(`📖 Reading file: ${filePath} (source: ${source})`);
}

/**
 * Logs file write operations
 */
export function logFileWrite(filePath: string, size?: number) {
  const sizeInfo = size ? ` (${size} bytes)` : "";
  console.log(`📝 Writing file: ${filePath}${sizeInfo}`);
}

/**
 * Extracts the title from markdown content (first H1)
 */
export function getTitle(contents: string): string {
  let title_regex = /# (.*)\n/;
  const matches = new RegExp(title_regex).exec(contents);
  return matches[1].replaceAll(":", "-").replaceAll("`", "");
}

/**
 * Writes a file to disk, creating directories as needed
 */
export function writeFile(filePath: string, contents: string) {
  const outDir = path.dirname(filePath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, {recursive: true});
  }

  logFileWrite(filePath, contents.length);
  fs.writeFileSync(filePath, contents, {flag: "w"});
}

/**
 * Gets all folders in a directory
 */
export async function getFolders(dirPath: string): Promise<string[]> {
  const entries = await fs.promises.readdir(dirPath, {withFileTypes: true});

  const folders = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(dirPath, entry.name));

  return folders;
}

/**
 * Copies images referenced in the AEP from the source repository to the
 * local 'src/assets/generated' directory. This allows Vite/Astro to
 * process and optimize the images during the site build.
 *
 * @param aep - The AEP object containing the list of images to copy.
 */
export function copyImages(aep: AEP) {
  if (aep.contents.images.length === 0) return;

  const targetDir = path.join(process.cwd(), "src/assets/generated");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  for (const img of aep.contents.images) {
    if (fs.existsSync(img.sourceAbsolutePath)) {
      fs.copyFileSync(img.sourceAbsolutePath, img.targetAbsolutePath);
    } else {
      console.warn(`⚠️  Image source not found: ${img.sourceAbsolutePath}`);
    }
  }
}

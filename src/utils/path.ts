/**
 * Utility functions for handling paths with base configuration
 */

const BASE_PATH = import.meta.env.BASE_URL || "/";

/**
 * Prefixes a path with the base path if needed
 * @param path The path to prefix
 * @returns The path prefixed with the base path
 */
export function withBase(path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // Remove trailing slash from BASE_PATH for consistent concatenation
  const basePath = BASE_PATH.endsWith("/") ? BASE_PATH.slice(0, -1) : BASE_PATH;

  // Avoid double slashes
  if (basePath === "/" || basePath === "") {
    return normalizedPath;
  }

  return `${basePath}${normalizedPath}`;
}

/**
 * Strips the base path from a given path
 * @param path The path to strip
 * @returns The path without the base path prefix
 */
export function stripBase(path: string): string {
  const basePath = BASE_PATH.endsWith("/") ? BASE_PATH.slice(0, -1) : BASE_PATH;

  if (basePath === "/" || basePath === "") {
    return path;
  }

  if (path.startsWith(basePath)) {
    return path.slice(basePath.length) || "/";
  }

  return path;
}


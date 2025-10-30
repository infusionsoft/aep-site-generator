/**
 * Capitalize only the first character of a string.
 * - If the input is not a string, returns it unchanged to preserve original behavior.
 * - If the string is empty, returns it as-is.
 */
export function capitalizeFirst<T>(value: T): T {
  if (typeof value !== 'string') return value as T;
  const str = value as unknown as string;
  if (str.length === 0) return value as T;
  return (str[0].toUpperCase() + str.slice(1)) as unknown as T;
}

/** Joins truthy class names. Local to the ui primitives; no dependency added. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

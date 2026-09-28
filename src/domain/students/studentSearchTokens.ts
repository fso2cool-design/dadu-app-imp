/**
 * Pure domain: student search tokens.
 * Extracted from services/firestore/students.ts (Phase 1).
 */export function buildStudentSearchTokens(fullName?: string, parentName?: string): string[] {
  const tokenSet = new Set<string>();
  const processText = (text?: string) => {
    if (!text) return;
    const normalized = text.toLowerCase().trim().replace(/\s+/g, ' ');
    if (!normalized) return;
    const words = normalized.split(' ').filter(Boolean);
    for (const word of words) {
      const maxLen = Math.min(word.length, 20);
      for (let i = 2; i <= maxLen; i++) tokenSet.add(word.substring(0, i));
    }
  };
  processText(fullName); processText(parentName);
  return Array.from(tokenSet);
}

// Pure domain: shared validators
export function isValidEmail(e: string): boolean { const t=e.trim(); return t.includes("@") && t.includes(".") && !t.includes(" "); }
export function isValidNISN(nisn: string): boolean { return /^\d{10,}$/.test(nisn.trim()); }
export function isValidRollNumber(n: string): boolean { return n === "" || /^\d+(\.\d+)?$/.test(n); }
export function normalizeTrim(s: string | undefined): string { return (s || "").trim(); }

/**
 * Lazy loader for the `xlsx` library (~425kB).
 * Static `import * as XLSX from 'xlsx'` in 18 files forced the whole
 * library into the initial bundle. Import it dynamically only inside
 * export/import click handlers so it loads on demand.
 *
 * Usage inside an (async) handler:
 *   const XLSX = await loadXlsx();
 *   const ws = XLSX.utils.json_to_sheet(rows);
 */
export async function loadXlsx(): Promise<typeof import('xlsx')> {
  return await import('xlsx');
}

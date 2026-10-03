const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'features', 'reports', 'PrintDocumentLayout.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The exact target block in toolbar
const targetBlockLF = `      {/* Document Control Bar (Hidden on Print) */}
      <div className="no-print bg-white dark:bg-[#141722] border border-slate-200/90 dark:border-[#232838] rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-cyan-950/60 text-orange-600 dark:text-cyan-400 border border-orange-200 dark:border-cyan-500/40 flex items-center justify-center">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-100 text-xs block">Pratinjau Dokumen Cetak</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Format Kertas: <strong className="text-slate-700 dark:text-slate-200">{paperSize}</strong> • Orientasi: <strong className="text-slate-700 dark:text-slate-200">{paperOrientation}</strong>
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Letterhead */}
          <button
            type="button"
            onClick={() => setShowLetterhead(!showLetterhead)}
            className={\`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer \${
              showLetterhead 
                ? 'bg-orange-50 dark:bg-cyan-950/50 border-orange-200 dark:border-cyan-500/40 text-orange-700 dark:text-cyan-300' 
                : 'bg-white dark:bg-[#141722] border-slate-200 dark:border-[#232838] text-slate-600 dark:text-slate-400'
            }\`}
          >
            <Buildings className="w-3.5 h-3.5" />
            <span>{showLetterhead ? 'Kop Madrasah: Aktif' : 'Kop Madrasah: Nonaktif'}</span>
          </button>

          {/* Toggle Signatures */}
          <button
            type="button"
            onClick={() => setShowSignatures(!showSignatures)}
            className={\`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer \${
              showSignatures 
                ? 'bg-orange-50 dark:bg-cyan-950/50 border-orange-200 dark:border-cyan-500/40 text-orange-700 dark:text-cyan-300' 
                : 'bg-white dark:bg-[#141722] border-slate-200 dark:border-[#232838] text-slate-600 dark:text-slate-400'
            }\`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{showSignatures ? 'Tanda Tangan: Aktif' : 'Tanda Tangan: Nonaktif'}</span>
          </button>

          {/* Export Excel if provided */}
          {onExportExcel && (
            <button
              type="button"
              onClick={onExportExcel}
              disabled={excelExportDisabled}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#232838] bg-white dark:bg-[#141722] hover:bg-slate-50 dark:hover:bg-[#1b1f2e] text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <FileCsv className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Ekspor Excel</span>
            </button>
          )}

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="btn-primary px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Dokumen</span>
          </button>

          {/* Close Button if modal mode */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-[#232838] bg-white dark:bg-[#141722] hover:bg-slate-100 dark:hover:bg-[#1b1f2e] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>`;

const targetBlockCRLF = targetBlockLF.replace(/\n/g, '\r\n');

const replacementBlockLF = `      {/* Document Control Bar (Hidden on Print) */}
      <div className="no-print bg-[var(--ds-surface-elevated)] border border-[var(--ds-border)] rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent)] border border-[var(--ds-border)] flex items-center justify-center">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-[var(--ds-text)] text-xs block">Pratinjau Dokumen Cetak</span>
            <span className="text-[11px] text-[var(--ds-text-muted)]">
              Format Kertas: <strong className="text-[var(--ds-text)]">{paperSize}</strong> • Orientasi: <strong className="text-[var(--ds-text)]">{paperOrientation}</strong>
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Letterhead */}
          <button
            type="button"
            onClick={() => setShowLetterhead(!showLetterhead)}
            className={\`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer \${
              showLetterhead 
                ? 'bg-[var(--ds-accent-soft)] border-[var(--ds-accent)] text-[var(--ds-accent)]' 
                : 'bg-[var(--ds-surface)] border-[var(--ds-border)] text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]'
            }\`}
          >
            <Buildings className="w-3.5 h-3.5" />
            <span>{showLetterhead ? 'Kop Madrasah: Aktif' : 'Kop Madrasah: Nonaktif'}</span>
          </button>

          {/* Toggle Signatures */}
          <button
            type="button"
            onClick={() => setShowSignatures(!showSignatures)}
            className={\`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer \${
              showSignatures 
                ? 'bg-[var(--ds-accent-soft)] border-[var(--ds-accent)] text-[var(--ds-accent)]' 
                : 'bg-[var(--ds-surface)] border-[var(--ds-border)] text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]'
            }\`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{showSignatures ? 'Tanda Tangan: Aktif' : 'Tanda Tangan: Nonaktif'}</span>
          </button>

          {/* Export Excel if provided */}
          {onExportExcel && (
            <button
              type="button"
              onClick={onExportExcel}
              disabled={excelExportDisabled}
              className="px-3.5 py-1.5 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] hover:bg-[var(--ds-surface-muted)] text-[var(--ds-text)] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <FileCsv className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Ekspor Excel</span>
            </button>
          )}

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="btn-primary px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Dokumen</span>
          </button>

          {/* Close Button if modal mode */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] hover:bg-[var(--ds-surface-muted)] text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>`;

const replacementBlockCRLF = replacementBlockLF.replace(/\n/g, '\r\n');

if (content.includes(targetBlockCRLF)) {
  content = content.replace(targetBlockCRLF, replacementBlockCRLF);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('PrintDocumentLayout.tsx updated successfully (CRLF match)');
} else if (content.includes(targetBlockLF)) {
  content = content.replace(targetBlockLF, replacementBlockLF);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('PrintDocumentLayout.tsx updated successfully (LF match)');
} else {
  console.error('Target block not found in PrintDocumentLayout.tsx');
  process.exit(1);
}

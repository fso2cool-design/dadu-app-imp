import React from 'react';
import { Printer, FileCsv, X } from '@phosphor-icons/react';

export interface PrintOptions {
  paperSize: 'A4' | 'F4';
  orientation: 'PORTRAIT' | 'LANDSCAPE';
  useKop: boolean;
  useSignature: boolean;
}

interface PrintActionBarProps {
  options: PrintOptions;
  onOptionsChange: (options: PrintOptions) => void;
  onPrint: () => void;
  isGenerating?: boolean;
  onExportExcel?: () => void;
  excelExportDisabled?: boolean;
  onClose?: () => void;
}

export const PrintActionBar: React.FC<PrintActionBarProps> = ({
  options,
  onOptionsChange,
  onPrint,
  isGenerating = false,
  onExportExcel,
  excelExportDisabled = false,
  onClose,
}) => {
  return (
    <div className="no-print bg-[var(--ds-surface-elevated)] border border-[var(--ds-border)] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 select-none mb-6">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {/* Paper Size */}
        <div className="flex items-center gap-1.5">
          <label className="font-semibold text-[var(--ds-text)]">Kertas:</label>
          <select
            value={options.paperSize}
            onChange={(e) => onOptionsChange({ ...options, paperSize: e.target.value as 'A4' | 'F4' })}
            className="px-2.5 py-1.5 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] font-medium text-[var(--ds-text)] focus:outline-none focus:border-[var(--ds-accent)] cursor-pointer"
          >
            <option value="A4">A4</option>
            <option value="F4">F4 (Folio)</option>
          </select>
        </div>

        {/* Orientation */}
        <div className="flex items-center gap-1.5">
          <label className="font-semibold text-[var(--ds-text)]">Orientasi:</label>
          <select
            value={options.orientation}
            onChange={(e) => onOptionsChange({ ...options, orientation: e.target.value as 'PORTRAIT' | 'LANDSCAPE' })}
            className="px-2.5 py-1.5 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] font-medium text-[var(--ds-text)] focus:outline-none focus:border-[var(--ds-accent)] cursor-pointer"
          >
            <option value="PORTRAIT">Potret</option>
            <option value="LANDSCAPE">Lanskap</option>
          </select>
        </div>

        <div className="w-px h-5 bg-[var(--ds-border)] hidden sm:block" />

        {/* Toggles */}
        <label className="flex items-center gap-1.5 cursor-pointer group">
          <input
            type="checkbox"
            checked={options.useKop}
            onChange={(e) => onOptionsChange({ ...options, useKop: e.target.checked })}
            className="w-4 h-4 rounded text-[var(--ds-accent)] focus:ring-[var(--ds-accent)] cursor-pointer"
          />
          <span className="text-[var(--ds-text)] font-medium group-hover:text-[var(--ds-accent)] transition-colors">
            Kop Surat
          </span>
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer group">
          <input
            type="checkbox"
            checked={options.useSignature}
            onChange={(e) => onOptionsChange({ ...options, useSignature: e.target.checked })}
            className="w-4 h-4 rounded text-[var(--ds-accent)] focus:ring-[var(--ds-accent)] cursor-pointer"
          />
          <span className="text-[var(--ds-text)] font-medium group-hover:text-[var(--ds-accent)] transition-colors">
            Tanda Tangan
          </span>
        </label>
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
        {onExportExcel && (
          <button
            type="button"
            onClick={onExportExcel}
            disabled={excelExportDisabled}
            className="px-3.5 py-2 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] hover:bg-[var(--ds-surface-muted)] text-[var(--ds-text)] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <FileCsv className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Ekspor Excel</span>
          </button>
        )}

        <button
          type="button"
          onClick={onPrint}
          disabled={isGenerating}
          className="flex-1 md:flex-initial px-5 py-2 rounded-xl btn-primary text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          ) : (
            <Printer className="w-4 h-4" />
          )}
          <span>{isGenerating ? 'Memproses...' : 'Cetak Dokumen'}</span>
        </button>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] hover:bg-[var(--ds-surface-muted)] text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

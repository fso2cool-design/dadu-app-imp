import React, { useState } from 'react';
import { Modal } from './Modal';
import { Sparkle, CalendarBlank, CheckCircle, ArrowRight } from '@phosphor-icons/react';
import { LATEST_CHANGELOG, CHANGELOG_STORAGE_KEY } from '../../constants/changelog';

interface ChangeLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  isManualTrigger?: boolean;
}

export const ChangeLogModal: React.FC<ChangeLogModalProps> = ({
  isOpen,
  onClose,
  isManualTrigger = false,
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(true);

  const handleDismiss = () => {
    if (dontShowAgain && !isManualTrigger) {
      localStorage.setItem(CHANGELOG_STORAGE_KEY, 'true');
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleDismiss}
      title=""
      maxWidth="2xl"
    >
      <div className="space-y-5 -mt-2">
        {/* Header Visual — uses active design-system accent token */}
        <div className="rounded-2xl p-5 shadow-sm relative overflow-hidden border" style={{ background: "var(--ds-accent)", color: "var(--ds-accent-fg)", borderColor: "var(--ds-border)" }}>
          
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold backdrop-blur-sm border" style={{ background: "color-mix(in srgb, var(--ds-accent-fg) 14%, transparent)", color: "var(--ds-accent-fg)", borderColor: "color-mix(in srgb, var(--ds-accent-fg) 22%, transparent)" }}>
              <Sparkle className="w-3.5 h-3.5" style={{ color: "var(--ds-accent-fg)" }} />
              {LATEST_CHANGELOG.badge || 'Catatan Pembaruan'}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: "color-mix(in srgb, var(--ds-accent-fg) 78%, transparent)" }}>
              <CalendarBlank className="w-3.5 h-3.5" />
              {LATEST_CHANGELOG.releaseDate}
            </span>
          </div>

          <h2 className="text-xl font-bold tracking-tight" style={{ color: "var(--ds-accent-fg)" }}>
            {LATEST_CHANGELOG.version}
          </h2>
          <p className="text-xs mt-1 max-w-lg leading-relaxed" style={{ color: "color-mix(in srgb, var(--ds-accent-fg) 82%, transparent)" }}>
            {LATEST_CHANGELOG.title}
          </p>
        </div>

        {/* Change List Categories */}
        <div className="max-h-[380px] overflow-y-auto space-y-4 pr-1 scrollbar-thin">
          {LATEST_CHANGELOG.highlights.map((cat, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl border bg-white dark:bg-slate-900 transition-colors" style={{ borderColor: "var(--ds-border)" } as any}
            >
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-3.5 rounded-full inline-block" style={{ background: "var(--ds-accent)" }} />
                {cat.category}
              </h4>
              <ul className="space-y-1.5">
                {cat.items.map((item, iIdx) => (
                  <li key={iIdx} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2 leading-relaxed">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "var(--ds-accent)" }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer with Checkbox & Action */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 cursor-pointer" style={{ accentColor: "var(--ds-accent)" } as any}
            />
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Jangan tampilkan lagi untuk versi ini
            </span>
          </label>

          <button
            type="button"
            onClick={handleDismiss}
            className="btn-primary px-5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <span>Mengerti & Lanjutkan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Modal>
  );
};

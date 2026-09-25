import React, { useState } from 'react';
import { Modal } from './Modal';
import { Sparkles, Calendar, CheckCircle2, ArrowRight } from 'lucide-react';
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
        {/* Header Visual */}
        <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 rounded-2xl p-5 text-white shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
          
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 backdrop-blur-sm text-white border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              {LATEST_CHANGELOG.badge || 'Catatan Pembaruan'}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-100 font-medium">
              <Calendar className="w-3.5 h-3.5" />
              {LATEST_CHANGELOG.releaseDate}
            </span>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-white">
            {LATEST_CHANGELOG.version}
          </h2>
          <p className="text-xs text-emerald-100 mt-1 max-w-lg leading-relaxed">
            {LATEST_CHANGELOG.title}
          </p>
        </div>

        {/* Change List Categories */}
        <div className="max-h-[380px] overflow-y-auto space-y-4 pr-1 scrollbar-thin">
          {LATEST_CHANGELOG.highlights.map((cat, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors"
            >
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-3.5 rounded-full bg-emerald-600 inline-block" />
                {cat.category}
              </h4>
              <ul className="space-y-1.5">
                {cat.items.map((item, iIdx) => (
                  <li key={iIdx} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2 leading-relaxed">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
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
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
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

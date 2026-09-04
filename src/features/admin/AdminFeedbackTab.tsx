import React, { useState, useEffect } from 'react';
import { FeedbackItem, FeedbackStatus, FeedbackType } from '../../types';
import { 
  getAllFeedbacks, 
  updateFeedbackStatus, 
  deleteFeedback 
} from '../../services/firestore/feedbacks';
import { useToast } from '../../context/ToastContext';
import { 
  Bug, 
  Lightbulb, 
  Sparkles, 
  HelpCircle, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  MessageSquare, 
  RefreshCw, 
  Filter, 
  Search,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';

interface AdminFeedbackTabProps {
  onFeedbackCountChange?: () => void;
}

export const AdminFeedbackTab: React.FC<AdminFeedbackTabProps> = ({
  onFeedbackCountChange,
}) => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected feedback for reply / resolution modal
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [updating, setUpdating] = useState<boolean>(false);

  // Delete feedback modal state
  const [feedbackToDelete, setFeedbackToDelete] = useState<FeedbackItem | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const data = await getAllFeedbacks();
      setFeedbacks(data);
      if (onFeedbackCountChange) onFeedbackCountChange();
    } catch (err: any) {
      console.error('Error fetching feedbacks:', err);
      toastError('Gagal memuat feedback: ' + (err.message || 'Cek koneksi database'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const handleUpdateStatus = async (item: FeedbackItem, newStatus: FeedbackStatus, reply?: string) => {
    setUpdating(true);
    try {
      await updateFeedbackStatus(item.id, newStatus, reply);
      setFeedbacks(prev => prev.map(f => f.id === item.id ? { 
        ...f, 
        status: newStatus, 
        adminReply: reply !== undefined ? reply : f.adminReply 
      } : f));
      toastSuccess(`Status feedback berhasil diubah ke: ${newStatus}`);
      if (onFeedbackCountChange) onFeedbackCountChange();
      setSelectedFeedback(null);
    } catch (err: any) {
      console.error('Error updating feedback:', err);
      toastError('Gagal memperbarui status: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!feedbackToDelete) return;
    setDeleting(true);
    try {
      await deleteFeedback(feedbackToDelete.id);
      setFeedbacks(prev => prev.filter(f => f.id !== feedbackToDelete.id));
      toastSuccess('Laporan feedback berhasil dihapus permanen dari database.');
      if (onFeedbackCountChange) onFeedbackCountChange();
      setFeedbackToDelete(null);
    } catch (err: any) {
      console.error('Error deleting feedback:', err);
      toastError('Gagal menghapus feedback: ' + (err.message || 'Periksa koneksi database'));
    } finally {
      setDeleting(false);
    }
  };

  const getTypeMeta = (type: FeedbackType) => {
    switch (type) {
      case 'BUG':
        return {
          label: 'Bug / Kendala',
          icon: Bug,
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        };
      case 'FEATURE':
        return {
          label: 'Usulan Fitur',
          icon: Lightbulb,
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        };
      case 'IMPROVEMENT':
        return {
          label: 'Perbaikan',
          icon: Sparkles,
          badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        };
      default:
        return {
          label: 'Lainnya',
          icon: HelpCircle,
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        };
    }
  };

  const getStatusBadge = (status: FeedbackStatus) => {
    switch (status) {
      case 'NEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-600 text-white animate-pulse shadow-sm shadow-rose-600/50">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            Laporan Baru
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <Clock className="w-3 h-3" />
            Sedang Diproses
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3 h-3" />
            Selesai / Dituntaskan
          </span>
        );
    }
  };

  const filteredFeedbacks = feedbacks.filter(f => {
    const matchesStatus = statusFilter === 'ALL' || f.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || f.type === typeFilter;
    const matchesSearch = 
      f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.userEmail.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });

  const countNew = feedbacks.filter(f => f.status === 'NEW').length;
  const countInProgress = feedbacks.filter(f => f.status === 'IN_PROGRESS').length;
  const countResolved = feedbacks.filter(f => f.status === 'RESOLVED').length;

  return (
    <div className="space-y-6">
      {/* Top Stat Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Masukan</div>
            <div className="text-xl font-black text-white">{feedbacks.length}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Perlu Ditinjau (Baru)</div>
            <div className="text-xl font-black text-rose-400">{countNew}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Sedang Diproses</div>
            <div className="text-xl font-black text-amber-400">{countInProgress}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Telah Selesai</div>
            <div className="text-xl font-black text-emerald-400">{countResolved}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul, guru, email, atau isi..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Status Filter */}
          <div className="flex items-center rounded-xl bg-slate-800 p-1 border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                statusFilter === 'ALL' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Semua ({feedbacks.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('NEW')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                statusFilter === 'NEW' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Baru ({countNew})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('IN_PROGRESS')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                statusFilter === 'IN_PROGRESS' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Diproses
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('RESOLVED')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                statusFilter === 'RESOLVED' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Selesai
            </button>
          </div>

          <button
            type="button"
            onClick={fetchFeedbacks}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            title="Muat Ulang"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Feedbacks List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400" />
          <p className="text-xs">Memuat laporan feedback...</p>
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">Tidak Ada Laporan Masukan</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'ALL'
              ? 'Tidak ada feedback yang cocok dengan filter atau kata kunci pencarian saat ini.'
              : 'Belum ada guru yang mengirimkan laporan kendala atau usulan fitur.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredFeedbacks.map((item) => {
            const meta = getTypeMeta(item.type);
            const Icon = meta.icon;
            const formattedDate = item.createdAt?.toDate 
              ? item.createdAt.toDate().toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Baru saja';

            return (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border transition-all ${
                  item.status === 'NEW'
                    ? 'bg-slate-900/95 border-rose-500/40 ring-1 ring-rose-500/20 shadow-lg'
                    : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${meta.badge}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {meta.label}
                    </span>
                    {getStatusBadge(item.status)}
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {formattedDate}
                    </span>
                  </div>

                  {/* Actions for Admin */}
                  <div className="flex items-center gap-1.5">
                    {item.status !== 'IN_PROGRESS' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(item, 'IN_PROGRESS')}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
                      >
                        Tandai Diproses
                      </button>
                    )}
                    {item.status !== 'RESOLVED' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(item, 'RESOLVED')}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
                      >
                        Tandai Selesai
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFeedback(item);
                        setReplyText(item.adminReply || '');
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-colors cursor-pointer"
                    >
                      {item.adminReply ? 'Edit Catatan' : '+ Catatan Admin'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedbackToDelete(item)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Hapus Feedback Permanen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Title and Content */}
                <h4 className="text-sm font-bold text-white mb-1.5">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed mb-3.5 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                  {item.description}
                </p>

                {/* Sender Info Footer */}
                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/70 pt-2.5 gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Pengirim:</span>
                    <span className="font-semibold text-slate-200">{item.userName}</span>
                    <span className="text-slate-500">({item.userEmail})</span>
                  </div>

                  {item.adminReply && (
                    <div className="w-full mt-1.5 p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200">
                      <span className="font-bold text-indigo-300 block mb-0.5">Catatan Administrator:</span>
                      <p className="text-[11px] text-slate-200">{item.adminReply}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Notes & Reply Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              Catatan / Balasan Admin untuk "{selectedFeedback.title}"
            </h4>
            <textarea
              rows={4}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Tuliskan catatan perbaikan atau balasan yang sudah dilakukan..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedFeedback(null)}
                disabled={updating}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={updating}
                onClick={() => handleUpdateStatus(selectedFeedback, selectedFeedback.status, replyText.trim())}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 cursor-pointer"
              >
                {updating ? 'Menyimpan...' : 'Simpan Catatan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Feedback Confirmation Modal */}
      {feedbackToDelete && (
        <Modal
          isOpen={!!feedbackToDelete}
          onClose={() => {
            if (!deleting) setFeedbackToDelete(null);
          }}
          title="Konfirmasi Hapus Laporan Masukan"
          size="sm"
        >
          <div className="space-y-4 text-slate-800 dark:text-slate-200">
            <div className="flex items-start gap-3 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-rose-900 dark:text-rose-200">
                  Hapus permanen dari database Firestore?
                </p>
                <p className="text-rose-700 dark:text-rose-300/80 leading-relaxed">
                  Laporan dengan judul <strong className="text-rose-950 dark:text-white">"{feedbackToDelete.title}"</strong> dari <strong className="text-rose-950 dark:text-white">{feedbackToDelete.userName || feedbackToDelete.userEmail}</strong> akan dihapus dan tidak dapat dikembalikan.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setFeedbackToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition-colors cursor-pointer"
              >
                {deleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Permanen</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

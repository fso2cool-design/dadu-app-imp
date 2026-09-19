import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { 
  createSharedReport, 
  getUserSharedReports, 
  revokeSharedReport, 
  deleteSharedReport 
} from '../../services/firestore/sharedReports';
import { SharedReport, SharedReportType, SharedReportPayload } from '../../types';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { 
  Share2, 
  Link, 
  Copy, 
  Check, 
  Lock, 
  Clock, 
  ShieldCheck, 
  AlertCircle,
  ExternalLink,
  Ban,
  Trash2,
  List,
  PlusCircle,
  Eye,
  Calendar,
  KeyRound
} from 'lucide-react';

interface ShareReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: SharedReportType;
  defaultTitle: string;
  payload: SharedReportPayload;
}

export const ShareReportModal: React.FC<ShareReportModalProps> = ({
  isOpen,
  onClose,
  reportType,
  defaultTitle,
  payload,
}) => {
  const { user } = useAuth();
  const { success, error, info } = useToast();

  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState('');
  const [usePasscode, setUsePasscode] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<number>(30); // 7, 30, 90, 0 (no exp)
  
  const [loading, setLoading] = useState(false);
  const [createdReport, setCreatedReport] = useState<SharedReport | null>(null);
  const [copied, setCopied] = useState(false);

  // User's existing shared reports list
  const [userReports, setUserReports] = useState<SharedReport[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && activeTab === 'list' && user) {
      loadUserReports();
    }
  }, [isOpen, activeTab, user]);

  const loadUserReports = async () => {
    if (!user) return;
    try {
      setLoadingList(true);
      const list = await getUserSharedReports(user.uid);
      setUserReports(list);
    } catch (err: any) {
      console.error('Failed to load user reports:', err);
      error('Gagal memuat daftar tautan berbagi.');
    } finally {
      setLoadingList(false);
    }
  };

  // Derive full public URL
  const publicShareUrl = createdReport
    ? `${window.location.origin}/?share=${createdReport.id}`
    : '';

  const handleGenerateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      const rep = await createSharedReport({
        userId: user.uid,
        userName: user.displayName || 'Guru Madrasah',
        reportType: reportType,
        title: title.trim() || defaultTitle,
        description: description.trim(),
        passcode: usePasscode && passcode.trim() ? passcode.trim() : undefined,
        expiresInDays: expiresInDays > 0 ? expiresInDays : undefined,
        payload: {
          ...payload,
          title: title.trim() || defaultTitle,
        },
      });

      setCreatedReport(rep);
      success('Tautan publik aman berhasil dibuat dengan proteksi data!');
    } catch (err: any) {
      console.error('Failed to create shared report:', err);
      error('Gagal membuat tautan berbagi: ' + (err.message || 'Kesalahan sistem'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (urlToCopy?: string) => {
    const targetUrl = urlToCopy || publicShareUrl;
    if (!targetUrl) return;
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    info('Tautan berhasil disalin ke papan klip!');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleShareWhatsApp = () => {
    if (!publicShareUrl || !createdReport) return;
    const msg = `*LAPORAN RESMI MADRASAH*\n` +
      `*${createdReport.title}*\n` +
      `Madrasah: ${payload.schoolName}\n` +
      `Kelas: ${payload.className}${payload.subjectName ? ` | Mapel: ${payload.subjectName}` : ''}\n` +
      (createdReport.passcode ? `Kode Akses (PIN): *${createdReport.passcode}*\n` : '') +
      `Tautan Akses: ${publicShareUrl}\n\n` +
      `_Tautan resmi ini dapat dibuka langsung tanpa perlu login akun._`;

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  const handleRevoke = async (token: string) => {
    if (!window.confirm('Cabut akses tautan ini? Pihak luar tidak akan dapat membuka dokumen ini lagi.')) return;
    try {
      setActionLoadingId(token);
      await revokeSharedReport(token);
      success('Akses tautan berhasil dicabut.');
      await loadUserReports();
    } catch (err: any) {
      error('Gagal mencabut tautan: ' + (err.message || 'Error'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (token: string) => {
    if (!window.confirm('Hapus permanen tautan berbagi ini dari database?')) return;
    try {
      setActionLoadingId(token);
      await deleteSharedReport(token);
      success('Tautan berbagi berhasil dihapus secara permanen.');
      await loadUserReports();
    } catch (err: any) {
      error('Gagal menghapus tautan: ' + (err.message || 'Error'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const isReportExpired = (rep: SharedReport) => {
    if (!rep.expiresAt) return false;
    const expTime = rep.expiresAt.toMillis
      ? rep.expiresAt.toMillis()
      : typeof rep.expiresAt === 'string'
      ? new Date(rep.expiresAt).getTime()
      : 0;
    return expTime > 0 && expTime < Date.now();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tautan Berbagi Laporan Resmi"
      maxWidth="max-w-xl"
    >
      <div className="space-y-4 text-xs">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-[#232838]">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-1.5 px-4 py-2.5 font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'create'
                ? 'border-orange-600 dark:border-cyan-500 text-orange-600 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Buat Tautan Baru</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-1.5 px-4 py-2.5 font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'list'
                ? 'border-orange-600 dark:border-cyan-500 text-orange-600 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Kelola Tautan Berbagi</span>
            {userReports.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#1b1f2e] text-[10px] text-slate-600 dark:text-slate-300">
                {userReports.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'create' ? (
          !createdReport ? (
            <form onSubmit={handleGenerateLink} className="space-y-4">
              <div className="p-3 bg-orange-50/70 dark:bg-cyan-950/40 border border-orange-200/80 dark:border-cyan-500/40 rounded-xl text-orange-950 dark:text-cyan-200 flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-orange-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-xs text-orange-900 dark:text-cyan-300">
                    Akses Read-Only Resmi & Aman
                  </p>
                  <p className="text-[11px] text-orange-800/90 dark:text-cyan-400/80 leading-relaxed">
                    Pimpinan madrasah, pengawas Kemenag, atau komite dapat langsung melihat rekapitulasi data resmi ini tanpa perlu login akun.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Judul Laporan Resmi
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#232838] bg-white dark:bg-[#141722] text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Catatan Pengantar (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Laporan rekapitulasi kehadiran semester ganjil untuk evaluasi mingguan pimpinan..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#232838] bg-white dark:bg-[#141722] text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    Masa Berlaku Tautan
                  </label>
                  <select
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#232838] bg-white dark:bg-[#141722] text-slate-800 dark:text-slate-200 text-xs font-medium cursor-pointer"
                  >
                    <option value={7}>7 Hari (1 Minggu)</option>
                    <option value={30}>30 Hari (1 Bulan)</option>
                    <option value={90}>90 Hari (1 Semester)</option>
                    <option value={0}>Selamanya (Tanpa Kadaluarsa)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    Perlindungan Sandi (PIN)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="chk-passcode"
                      checked={usePasscode}
                      onChange={(e) => setUsePasscode(e.target.checked)}
                      className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                    <label htmlFor="chk-passcode" className="text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
                      Enkripsi Klien (Zero-Knowledge)
                    </label>
                  </div>
                  {usePasscode && (
                    <div className="space-y-1 mt-1.5">
                      <input
                        type="text"
                        maxLength={8}
                        placeholder="Contoh: 123456"
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-orange-300 dark:border-cyan-500/50 bg-orange-50/50 dark:bg-cyan-950/20 text-xs font-mono font-bold text-center tracking-widest text-orange-950 dark:text-cyan-200"
                      />
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Data dienkripsi via AES-GCM 256-bit. PIN tidak pernah disimpan di database.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#232838]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1b1f2e] text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  {loading ? 'Membuat Tautan...' : 'Buat Tautan Publik'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 py-1 animate-in fade-in duration-150">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-center space-y-1">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 mx-auto flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-emerald-950 dark:text-emerald-200 text-xs">
                  Tautan Berbagi Siap Digunakan!
                </h3>
                <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                  Pihak yang menerima tautan ini dapat melihat laporan langsung dari browser tanpa akun login.
                </p>
              </div>

              {/* Link & Copy Box */}
              <div className="space-y-1.5">
                <label className="text-slate-700 dark:text-slate-300 font-semibold block">
                  Tautan Akses Publik:
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={publicShareUrl}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-[#232838] bg-slate-50 dark:bg-[#0c0e15] font-mono text-[11px] text-slate-800 dark:text-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyLink()}
                    className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>
              </div>

              {/* Details Strip */}
              <div className="p-3 bg-slate-50 dark:bg-[#141722] border border-slate-200 dark:border-[#232838] rounded-xl space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Token Akses:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{createdReport.id}</span>
                </div>
                {createdReport.passcode && (
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>Kode Sandi (PIN):</span>
                    <span className="font-mono font-bold text-orange-600 dark:text-cyan-400">{createdReport.passcode}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Masa Berlaku:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {createdReport.expiresAt ? new Date(createdReport.expiresAt.toMillis ? createdReport.expiresAt.toMillis() : createdReport.expiresAt).toLocaleDateString('id-ID') : 'Selamanya'}
                  </span>
                </div>
              </div>

              {/* Share WhatsApp or Preview */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="w-full sm:w-auto flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <span>Kirim via WhatsApp</span>
                </button>

                <a
                  href={publicShareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-200 dark:border-[#232838] hover:bg-slate-50 dark:hover:bg-[#1b1f2e] text-slate-700 dark:text-slate-300 font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Pratinjau</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setCreatedReport(null);
                    setActiveTab('list');
                  }}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1b1f2e] dark:hover:bg-[#232838] text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Kelola Tautan
                </button>
              </div>
            </div>
          )
        ) : (
          /* Tab 2: Manage Existing Reports */
          <div className="space-y-3">
            {loadingList ? (
              <div className="py-8 text-center text-slate-400 space-y-2">
                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p>Memuat daftar tautan berbagi...</p>
              </div>
            ) : userReports.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-2 bg-slate-50 dark:bg-[#141722] rounded-2xl border border-dashed border-slate-200 dark:border-[#232838]">
                <Share2 className="w-8 h-8 mx-auto opacity-40 text-slate-500" />
                <p className="font-semibold text-xs text-slate-600 dark:text-slate-300">Belum Ada Tautan Berbagi</p>
                <p className="text-[11px]">Anda belum pernah membuat tautan publik untuk dibagikan.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className="mt-2 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs"
                >
                  Buat Tautan Pertama
                </button>
              </div>
            ) : (
              <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
                {userReports.map((rep) => {
                  const expired = isReportExpired(rep);
                  const shareUrl = `${window.location.origin}/?share=${rep.id}`;
                  const isActionLoading = actionLoadingId === rep.id;

                  return (
                    <div
                      key={rep.id}
                      className="p-3 bg-white dark:bg-[#141722] border border-slate-200 dark:border-[#232838] rounded-xl space-y-2 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                            {rep.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                            <span className="px-1.5 py-0.5 rounded-md font-semibold bg-slate-100 dark:bg-[#1b1f2e] text-slate-600 dark:text-slate-300">
                              {rep.reportType}
                            </span>
                            {rep.hasPasscode || rep.encryptedPayload || rep.passcode ? (
                              <span className="px-1.5 py-0.5 rounded-md font-semibold bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" /> PIN
                              </span>
                            ) : null}
                            <span className="flex items-center gap-1 text-slate-400">
                              <Eye className="w-2.5 h-2.5" /> {rep.viewCount || 0}x dilihat
                            </span>
                          </div>
                        </div>

                        {/* Status badge */}
                        <div>
                          {rep.isRevoked ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-900">
                              Dicabut
                            </span>
                          ) : expired ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900">
                              Kadaluarsa
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900">
                              Aktif
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-[#1b1f2e] gap-2">
                        <div className="font-mono text-[10px] text-slate-400 truncate max-w-[200px]">
                          Token: {rep.id}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {!rep.isRevoked && !expired && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleCopyLink(shareUrl)}
                                title="Salin Tautan"
                                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1b1f2e] cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <a
                                href={shareUrl}
                                target="_blank"
                                rel="noreferrer"
                                title="Buka Tautan"
                                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1b1f2e]"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                              <button
                                type="button"
                                disabled={isActionLoading}
                                onClick={() => handleRevoke(rep.id)}
                                title="Cabut Akses Publik"
                                className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 cursor-pointer disabled:opacity-50"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => handleDelete(rep.id)}
                            title="Hapus Permanen"
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

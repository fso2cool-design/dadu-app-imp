import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { 
  getAllUsers, 
  setAccountStatus, 
  adminUpdateUserProfile,
  purgeEntireUserWorkspace, 
  purgeOrphanedResiduals,
  scanOrphanResiduals,
  OrphanResidualItem,
  getUserStorageStats,
  UserStorageStats 
} from '../../services/firestore/users';
import { getUnreadFeedbackCount } from '../../services/firestore/feedbacks';
import { AdminFeedbackTab } from './AdminFeedbackTab';
import { EditUserModal } from './EditUserModal';
import { UserProfile } from '../../types';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { 
  ShieldCheck, 
  Users, 
  UserX, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Search, 
  RefreshCw, 
  Database, 
  LogOut, 
  ExternalLink,
  Shield,
  GraduationCap,
  HardDrive,
  Check,
  X,
  UserCheck,
  AlertCircle,
  MessageSquare,
  Sparkles,
  Clock,
  Edit
} from 'lucide-react';

const formatLastLoginDate = (timestamp: any): string => {
  if (!timestamp) return '';
  try {
    let date: Date;
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }
    if (isNaN(date.getTime())) return '';
    
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const formatRelativeTime = (timestamp: any): string => {
  if (!timestamp) return '';
  try {
    let date: Date;
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }
    if (isNaN(date.getTime())) return '';

    const diffMs = Date.now() - date.getTime();
    if (diffMs < 0) return 'Baru saja';
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Baru saja';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} mnt lalu`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays} hari lalu`;
    return '';
  } catch {
    return '';
  }
};

interface AdminUserManagementPageProps {
  onSwitchToTeacherApp?: () => void;
}

export const AdminUserManagementPage: React.FC<AdminUserManagementPageProps> = ({
  onSwitchToTeacherApp,
}) => {
  const { user, profile, logout } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Admin section tabs: USERS vs FEEDBACK
  const [activeAdminTab, setActiveAdminTab] = useState<'USERS' | 'FEEDBACK'>('USERS');
  const [unreadFeedbackCount, setUnreadFeedbackCount] = useState<number>(0);

  // Sweep orphaned residuals state
  const [showResidualSweepModal, setShowResidualSweepModal] = useState<boolean>(false);
  const [residualUidInput, setResidualUidInput] = useState<string>('');
  const [sweepingResidual, setSweepingResidual] = useState<boolean>(false);
  const [sweepResult, setSweepResult] = useState<{ success: boolean; count: number; message: string } | null>(null);
  const [scanningOrphans, setScanningOrphans] = useState<boolean>(false);
  const [detectedOrphans, setDetectedOrphans] = useState<OrphanResidualItem[]>([]);
  const [hasScanned, setHasScanned] = useState<boolean>(false);
  const [sweepingAll, setSweepingAll] = useState<boolean>(false);

  // Stats inspecting state
  const [inspectingUser, setInspectingUser] = useState<UserProfile | null>(null);
  const [userStats, setUserStats] = useState<UserStorageStats | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);

  // Purge modal state
  const [purgeTarget, setPurgeTarget] = useState<UserProfile | null>(null);
  const [purgeConfirmText, setPurgeConfirmText] = useState<string>('');
  const [purging, setPurging] = useState<boolean>(false);
  const [purgeSuccessCount, setPurgeSuccessCount] = useState<number | null>(null);

  // Edit user modal state
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    if (type === 'success') {
      toastSuccess(text);
    } else {
      toastError(text);
    }
  };

  const loadUnreadFeedbackCount = async () => {
    try {
      const count = await getUnreadFeedbackCount();
      setUnreadFeedbackCount(count);
    } catch (err) {
      console.warn('Failed to load feedback unread count:', err);
    }
  };

  const loadAllUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsersList(data);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      showToast('error', 'Gagal memuat daftar pengguna: ' + (err.message || 'Periksa koneksi/aturan database'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllUsers();
    loadUnreadFeedbackCount();
  }, []);

  const handleAutoScanOrphans = async () => {
    setScanningOrphans(true);
    setSweepResult(null);
    try {
      const found = await scanOrphanResiduals();
      setDetectedOrphans(found);
      setHasScanned(true);
      if (found.length === 0) {
        showToast('success', 'Database Bersih! Tidak ada residu akun yatim terdeteksi di Firestore.');
      } else {
        showToast('success', `Deteksi selesai: Ditemukan ${found.length} akun terhapus dengan sisa dokumen.`);
      }
    } catch (err: any) {
      console.error('Scan orphans error:', err);
      showToast('error', 'Gagal memindai residu: ' + (err.message || 'Periksa aturan Firestore'));
    } finally {
      setScanningOrphans(false);
    }
  };

  const handleSweepDetectedOrphan = async (targetUid: string) => {
    setSweepingResidual(true);
    try {
      const count = await purgeOrphanedResiduals(targetUid);
      setDetectedOrphans(prev => prev.filter(o => o.uid !== targetUid));
      showToast('success', `Berhasil menyapu ${count} dokumen residu dari UID: ${targetUid.substring(0, 10)}...`);
      setSweepResult({
        success: true,
        count,
        message: `UID ${targetUid} berhasil disapu bersih (${count} dokumen terhapus).`,
      });
    } catch (err: any) {
      console.error('Error sweeping detected orphan:', err);
      showToast('error', 'Gagal menyapu: ' + err.message);
    } finally {
      setSweepingResidual(false);
    }
  };

  const handleSweepAllDetectedOrphans = async () => {
    if (detectedOrphans.length === 0) return;
    setSweepingAll(true);
    let totalPurged = 0;
    try {
      for (const orphan of detectedOrphans) {
        const count = await purgeOrphanedResiduals(orphan.uid);
        totalPurged += count;
      }
      setDetectedOrphans([]);
      setSweepResult({
        success: true,
        count: totalPurged,
        message: `Seluruh residu (${totalPurged} dokumen dari ${detectedOrphans.length} akun) telah disapu bersih dari Firestore.`,
      });
      showToast('success', `Sapu massal tuntas: ${totalPurged} dokumen terhapus.`);
    } catch (err: any) {
      console.error('Error sweeping all orphans:', err);
      showToast('error', 'Gagal sapu massal: ' + err.message);
    } finally {
      setSweepingAll(false);
    }
  };

  const handleSweepResidualByUid = async () => {
    const trimmedUid = residualUidInput.trim();
    if (!trimmedUid) {
      showToast('error', 'Silakan masukkan UID target terlebih dahulu.');
      return;
    }

    setSweepingResidual(true);
    setSweepResult(null);
    try {
      const count = await purgeOrphanedResiduals(trimmedUid);
      setSweepResult({
        success: true,
        count,
        message: `Pembersihan residu tuntas! Sebanyak ${count} dokumen telah dihapus dari seluruh 14 sub-koleksi Firestore.`,
      });
      showToast('success', `Berhasil membersihkan ${count} dokumen residu dari UID: ${trimmedUid}`);
      loadAllUsers();
    } catch (err: any) {
      console.error('Error sweeping residuals:', err);
      setSweepResult({
        success: false,
        count: 0,
        message: 'Gagal menyapu residu: ' + (err.message || 'Periksa izin aturan Firestore'),
      });
      showToast('error', 'Gagal menyapu residu: ' + err.message);
    } finally {
      setSweepingResidual(false);
    }
  };

  const handleToggleStatus = async (targetUser: UserProfile) => {
    const newStatus = targetUser.accountStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    try {
      await setAccountStatus(targetUser.uid, newStatus);
      setUsersList(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, accountStatus: newStatus } : u));
      showToast('success', `Status akun ${targetUser.displayName || targetUser.email} berhasil diubah menjadi ${newStatus === 'ACTIVE' ? 'Aktif' : 'Ditangguhkan (Suspend)'}.`);
    } catch (err: any) {
      console.error('Error updating status:', err);
      showToast('error', 'Gagal mengubah status: ' + err.message);
    }
  };

  const handleInspectStorage = async (targetUser: UserProfile) => {
    setInspectingUser(targetUser);
    setLoadingStats(true);
    try {
      const stats = await getUserStorageStats(targetUser.uid);
      setUserStats(stats);
    } catch (err) {
      console.error('Error getting stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleExecutePurge = async () => {
    if (!purgeTarget) return;
    if (purgeConfirmText !== 'HAPUS' && purgeConfirmText !== purgeTarget.email) {
      showToast('error', 'Teks konfirmasi tidak sesuai. Ketik "HAPUS" untuk melanjutkan.');
      return;
    }

    setPurging(true);
    try {
      const count = await purgeEntireUserWorkspace(purgeTarget.uid);
      setPurgeSuccessCount(count);
      setUsersList(prev => prev.filter(u => u.uid !== purgeTarget.uid));
      showToast('success', `Berhasil menghapus total data akun ${purgeTarget.email}. Sebanyak ${count} dokumen telah dihapus dari Firestore.`);
      setTimeout(() => {
        setPurgeTarget(null);
        setPurgeConfirmText('');
        setPurgeSuccessCount(null);
      }, 2000);
    } catch (err: any) {
      console.error('Error purging workspace:', err);
      showToast('error', 'Gagal menghapus total data: ' + err.message);
    } finally {
      setPurging(false);
    }
  };

  const handleSaveUserProfile = async (targetUid: string, updatedData: Partial<UserProfile>) => {
    try {
      await adminUpdateUserProfile(targetUid, updatedData);
      setUsersList(prev => prev.map(u => u.uid === targetUid ? { ...u, ...updatedData } : u));
      showToast('success', 'Profil pengguna berhasil diperbarui.');
    } catch (err: any) {
      console.error('Error updating user profile:', err);
      showToast('error', 'Gagal memperbarui profil: ' + (err.message || 'Kesalahan sistem'));
      throw err;
    }
  };

  // Filter users
  const filteredUsers = usersList.filter(u => {
    const matchesSearch = 
      (u.displayName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (u.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (u.nip || '').includes(searchQuery);

    const matchesStatus = statusFilter === 'ALL' || u.accountStatus === statusFilter;
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  const totalUsers = usersList.length;
  const activeCount = usersList.filter(u => u.accountStatus === 'ACTIVE' || !u.accountStatus).length;
  const suspendedCount = usersList.filter(u => u.accountStatus === 'SUSPENDED').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-3.5 sm:px-8 py-3 sm:py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/30 shrink-0">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">Panel Admin</h1>
              <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                SUPER ADMIN
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate hidden sm:block">
              Pengelolaan Akun Pengguna & Efisiensi Kuota Database Firestore
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {onSwitchToTeacherApp && (
            <button
              type="button"
              onClick={onSwitchToTeacherApp}
              title="Buka Mode Guru (Workspace)"
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
            >
              <GraduationCap className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Buka Mode Guru</span>
              <span className="inline sm:hidden">Mode Guru</span>
            </button>
          )}

          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-semibold border border-rose-500/30 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-8 space-y-6 pb-20">
        {/* Admin Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto [scrollbar-width:none]">
          <button
            type="button"
            onClick={() => setActiveAdminTab('USERS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeAdminTab === 'USERS'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Pengguna & Kuota DB</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminTab('FEEDBACK')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative whitespace-nowrap shrink-0 ${
              activeAdminTab === 'FEEDBACK'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Pusat Masukan & Laporan</span>
            {unreadFeedbackCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
                {unreadFeedbackCount}
              </span>
            )}
          </button>
        </div>

        {activeAdminTab === 'FEEDBACK' ? (
          <AdminFeedbackTab onFeedbackCountChange={loadUnreadFeedbackCount} />
        ) : (
          <>
            {/* Database Quota Information Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4.5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 block">Total Akun Terdaftar</span>
                  <span className="text-2xl font-black text-white">{totalUsers}</span>
                  <span className="text-[11px] text-slate-500 block">di database Firestore</span>
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4.5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 block">Akun Aktif (Active)</span>
                  <span className="text-2xl font-black text-emerald-400">{activeCount}</span>
                  <span className="text-[11px] text-slate-500 block">Dapat login & input data</span>
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4.5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <UserX className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 block">Akun Ditangguhkan</span>
                  <span className="text-2xl font-black text-amber-400">{suspendedCount}</span>
                  <span className="text-[11px] text-slate-500 block">Akses masuk diblokir</span>
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4.5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                  <HardDrive className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 block">Optimasi Kuota DB</span>
                  <span className="text-sm font-bold text-cyan-300">Spark Free Tier</span>
                  <span className="text-[11px] text-slate-400 block">Gunakan Purge untuk bersihkan sampah</span>
                </div>
              </div>
            </div>

            {/* Action & Filter Toolbar */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row flex-1 items-stretch sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama guru, email, atau NIP..."
                    className="w-full pl-9.5 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-medium text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-semibold text-slate-300 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="ACTIVE">Hanya Aktif</option>
                    <option value="SUSPENDED">Hanya Suspend</option>
                  </select>

                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-semibold text-slate-300 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="ALL">Semua Peran</option>
                    <option value="ADMIN">Hanya Admin</option>
                    <option value="TEACHER">Hanya Guru</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full lg:w-auto justify-start lg:justify-end overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowResidualSweepModal(true);
                    setResidualUidInput('');
                    setSweepResult(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold flex items-center gap-1.5 border border-amber-500/30 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  title="Bersihkan data orphan / residu akun yang sudah dihapus"
                >
                  <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sapu Residu (UID)</span>
                </button>

                <button
                  type="button"
                  onClick={loadAllUsers}
                  disabled={loading}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

        {/* Users Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="sm:hidden px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300">Daftar Akun ({filteredUsers.length})</span>
            <span className="text-emerald-400 font-medium">Geser ke kanan →</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Nama Guru / Staf</th>
                  <th className="py-3.5 px-4">Email & NIP</th>
                  <th className="py-3.5 px-4">Peran (Role)</th>
                  <th className="py-3.5 px-4 text-center">Status Akun</th>
                  <th className="py-3.5 px-4 text-center">Terakhir Login</th>
                  <th className="py-3.5 px-4 text-center">Penggunaan DB</th>
                  <th className="py-3.5 px-4 text-right">Tindakan Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="inline-flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                        <span>Memuat data pengguna dari Firestore...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <p className="text-xs mb-2">Tidak ada akun pengguna yang cocok dengan kriteria filter/pencarian.</p>
                      {(searchQuery || statusFilter !== 'ALL' || roleFilter !== 'ALL') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setStatusFilter('ALL');
                            setRoleFilter('ALL');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-medium border border-slate-700 transition-colors"
                        >
                          Reset Pencarian & Filter
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = u.uid === user?.uid;
                    const isSuspended = u.accountStatus === 'SUSPENDED';
                    const isSuper = (u.role === 'ADMIN' && (u.email === 'johanrovian90@gmail.com' || u.email === 'fso2cool@gmail.com'));
                    const isProtected = isSelf || isSuper;

                    return (
                      <tr key={u.uid} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-emerald-400 shrink-0">
                              {(u.displayName || u.email || 'G').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-white block">
                                {u.displayName || 'Nama Belum Diisi'}
                                {isSelf && <span className="ml-1.5 text-[10px] text-emerald-400 font-semibold">(Akun Anda)</span>}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">UID: {u.uid.slice(0, 8)}...</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-slate-300 font-medium block">{u.email}</span>
                          <span className="text-[11px] text-slate-500 font-mono">NIP: {u.nip || '-'}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          {u.role === 'ADMIN' || u.email === 'johanrovian90@gmail.com' || u.email === 'fso2cool@gmail.com' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" />
                              <span>Admin</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-semibold">
                              <GraduationCap className="w-3 h-3 text-emerald-400" />
                              <span>Guru</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isSuspended 
                               ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' 
                              : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isSuspended ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                            {isSuspended ? 'Ditangguhkan' : 'Aktif'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {u.role === 'ADMIN' || u.email === 'johanrovian90@gmail.com' || u.email === 'fso2cool@gmail.com' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-400 border border-slate-700/60 text-[10px] font-semibold">
                              <Shield className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>Administrator</span>
                            </span>
                          ) : u.lastLoginAt ? (
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              <span className="text-white font-semibold text-[11px] inline-flex items-center gap-1">
                                <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                                <span>{formatLastLoginDate(u.lastLoginAt)}</span>
                              </span>
                              {formatRelativeTime(u.lastLoginAt) && (
                                <span className="text-[10px] text-slate-400 font-medium">
                                  ({formatRelativeTime(u.lastLoginAt)})
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-medium">
                              <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>Belum Pernah Login</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleInspectStorage(u)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium border border-slate-700 inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Database className="w-3 h-3 text-cyan-400" />
                            <span>Cek Dokumen</span>
                          </button>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Edit User Profile button */}
                            <button
                              type="button"
                              onClick={() => setEditingUser(u)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white text-[11px] font-semibold border border-emerald-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Edit Profil & Hak Akses"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Edit Profil</span>
                            </button>

                            {/* Suspend / Activate toggle */}
                            {!isProtected && (
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(u)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                                  isSuspended
                                    ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-600 hover:text-white'
                                    : 'bg-amber-600/20 text-amber-300 border-amber-500/30 hover:bg-amber-600 hover:text-white'
                                }`}
                              >
                                {isSuspended ? 'Aktifkan Akun' : 'Tangguhkan (Suspend)'}
                              </button>
                            )}

                            {/* Purge Total DB Button */}
                            {!isProtected && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPurgeTarget(u);
                                  setPurgeConfirmText('');
                                  setPurgeSuccessCount(null);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-600/20 text-rose-300 hover:bg-rose-600 hover:text-white text-[11px] font-semibold border border-rose-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                                title="Hapus Total Akun & Semua Data DB"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Hapus Total (Clean DB)</span>
                              </button>
                            )}

                            {isProtected && (
                              <span className="text-[11px] text-slate-500 italic">
                                {isSelf ? 'Akun Anda' : 'Akun Utama'}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
          </>
        )}
      </main>

      {/* INSPECT STORAGE STATS MODAL */}
      {inspectingUser && (
        <Modal
          isOpen={!!inspectingUser}
          onClose={() => setInspectingUser(null)}
          title={`Estimasi Dokumen DB: ${inspectingUser.displayName || inspectingUser.email}`}
          size="md"
        >
          <div className="space-y-4 text-slate-800">
            {loadingStats ? (
              <div className="py-8 text-center text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                <span className="text-xs">Menghitung dokumen di Firestore...</span>
              </div>
            ) : userStats ? (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950">Total Dokumen Workspace</span>
                  <span className="text-lg font-black text-emerald-700">{userStats.totalDocuments} Dokumen</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                    <span className="text-slate-600">Rombel / Kelas</span>
                    <span className="font-bold text-slate-900">{userStats.classesCount}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                    <span className="text-slate-600">Mata Pelajaran</span>
                    <span className="font-bold text-slate-900">{userStats.subjectsCount}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                    <span className="text-slate-600">Master Siswa</span>
                    <span className="font-bold text-slate-900">{userStats.studentsCount}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                    <span className="text-slate-600">Penugasan KBM</span>
                    <span className="font-bold text-slate-900">{userStats.assignmentsCount}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                    <span className="text-slate-600">Jurnal & Pertemuan</span>
                    <span className="font-bold text-slate-900">{userStats.meetingsCount}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                    <span className="text-slate-600">Rekap Presensi</span>
                    <span className="font-bold text-slate-900">{userStats.attendanceCount}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between col-span-2">
                    <span className="text-slate-600">Asesmen & Nilai Siswa</span>
                    <span className="font-bold text-slate-900">{userStats.gradesCount}</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 italic mt-2">
                  Data di atas adalah estimasi dokumen Firestore yang terpakai oleh pengguna ini.
                </p>
              </div>
            ) : null}
          </div>
        </Modal>
      )}

      {/* DANGEROUS PURGE CONFIRMATION MODAL */}
      {purgeTarget && (
        <Modal
          isOpen={!!purgeTarget}
          onClose={() => {
            if (!purging) {
              setPurgeTarget(null);
              setPurgeConfirmText('');
              setPurgeSuccessCount(null);
            }
          }}
          title="⚠️ Konfirmasi Hapus Total & Bersihkan Database"
          size="md"
        >
          <div className="space-y-4 text-slate-800">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-2">
              <div className="flex items-center gap-2 text-rose-800 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>TINDAKAN PERMANEN & BERDAMPAK BESAR</span>
              </div>
              <p className="text-rose-900 leading-relaxed">
                Anda akan menghapus total akun <strong>{purgeTarget.displayName || purgeTarget.email}</strong> beserta <strong>seluruh data siswa, kelas, jadwal mengajar, presensi, jurnal KBM, dan nilai</strong> yang tersimpan di Firestore.
              </p>
              <p className="text-rose-700 font-medium">
                Tindakan ini ditujukan untuk membebaskan ruang penyimpanan dan menghemat kuota Firestore gratis (Spark Tier). Data yang sudah dihapus tidak dapat dipulihkan kembali.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Ketik <span className="font-mono text-rose-600 bg-rose-50 px-1 py-0.5 rounded">HAPUS</span> atau email pengguna untuk konfirmasi:
              </label>
              <input
                type="text"
                value={purgeConfirmText}
                onChange={(e) => setPurgeConfirmText(e.target.value)}
                placeholder="Ketik HAPUS..."
                disabled={purging}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setPurgeTarget(null);
                  setPurgeConfirmText('');
                }}
                disabled={purging}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecutePurge}
                disabled={purging || (purgeConfirmText !== 'HAPUS' && purgeConfirmText !== purgeTarget.email)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {purging ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus Dokumen dari DB...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Total Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* SWEEP ORPHANED RESIDUALS MODAL (AUTO-DETECTION & UID) */}
      {showResidualSweepModal && (
        <Modal
          isOpen={showResidualSweepModal}
          onClose={() => {
            if (!sweepingResidual && !sweepingAll && !scanningOrphans) {
              setShowResidualSweepModal(false);
              setResidualUidInput('');
              setSweepResult(null);
            }
          }}
          title="🧹 Pembersihan Data Residu (Data Tanpa Relasi)"
          size="lg"
        >
          <div className="space-y-4 text-slate-800">
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1.5">
              <div className="flex items-center gap-2 text-amber-800 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Pembersihan Residu Data Akun yang Telah Dihapus</span>
              </div>
              <p className="text-amber-900 leading-relaxed">
                Di Firestore, akun yang dihapus dari Firebase Auth Console sering kali masih meninggalkan data di 14 sub-koleksi (seperti nilai, absensi, atau siswa). Fitur ini dapat mendeteksi seluruh residu tersebut secara otomatis tanpa Anda perlu membuka console.
              </p>
            </div>

            {/* AUTO SCAN SECTION */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-amber-600" />
                    Deteksi Otomatis Dokumen Yatim
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Pindai seluruh sub-koleksi untuk mencari ID akun yang sudah terhapus
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAutoScanOrphans}
                  disabled={scanningOrphans || sweepingResidual || sweepingAll}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-amber-600/30 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {scanningOrphans ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Memindai Firestore...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>{hasScanned ? 'Pindai Ulang Database' : 'Mulai Pindai Residu Otomatis'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Scan Results */}
              {hasScanned && detectedOrphans.length === 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold">Database Bersih & Rapi! </span>
                    <span className="text-[11px] text-emerald-700">Tidak ada residu akun yatim yang terdeteksi di Firestore. Seluruh dokumen terhubung dengan akun pengguna aktif.</span>
                  </div>
                </div>
              )}

              {detectedOrphans.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      Terdeteksi {detectedOrphans.length} Akun Yatim Berisi Dokumen:
                    </span>
                    <button
                      type="button"
                      onClick={handleSweepAllDetectedOrphans}
                      disabled={sweepingAll || sweepingResidual}
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1 shadow-sm shadow-rose-600/30 cursor-pointer disabled:opacity-50"
                    >
                      {sweepingAll ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Menyapu Seluruh Akun...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Sapu Bersih Semua Sekaligus</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                    {detectedOrphans.map(item => (
                      <div key={item.uid} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2.5 shadow-2xs">
                        <div className="min-w-0">
                          <div className="font-mono text-xs font-bold text-slate-800 truncate">
                            UID: <span className="text-emerald-600">{item.uid}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                              ~{item.detectedDocCount} dokumen terdeteksi
                            </span>
                            <span className="text-slate-400">di koleksi:</span>
                            <span className="font-mono text-slate-600 font-medium">
                              {item.sampleCollections.join(', ')}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSweepDetectedOrphan(item.uid)}
                          disabled={sweepingResidual || sweepingAll}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                        >
                          {sweepingResidual ? 'Menyapu...' : 'Sapu UID Ini'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* MANUAL UID SECTION */}
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Atau Masukkan UID Manual (Opsional):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={residualUidInput}
                  onChange={(e) => setResidualUidInput(e.target.value)}
                  placeholder="Contoh: E4iMZEZoZTWuOy11SxLq8Qw..."
                  disabled={sweepingResidual || sweepingAll}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:outline-hidden focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={handleSweepResidualByUid}
                  disabled={sweepingResidual || sweepingAll || !residualUidInput.trim()}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                >
                  {sweepingResidual ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyapu...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Sapu UID Manual</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {sweepResult && (
              <div className={`p-3 rounded-xl border text-xs ${
                sweepResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-medium'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                {sweepResult.message}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setShowResidualSweepModal(false);
                  setResidualUidInput('');
                  setSweepResult(null);
                }}
                disabled={sweepingResidual || sweepingAll || scanningOrphans}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* EDIT USER PROFILE MODAL */}
      {editingUser && (
        <EditUserModal
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          targetUser={editingUser}
          onSave={handleSaveUserProfile}
          isCurrentUser={editingUser.uid === user?.uid}
        />
      )}
    </div>
  );
};

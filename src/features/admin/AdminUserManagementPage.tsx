import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { 
  getAllUsers, 
  setAccountStatus, 
  purgeEntireUserWorkspace, 
  getUserStorageStats,
  UserStorageStats 
} from '../../services/firestore/users';
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
  AlertCircle
} from 'lucide-react';

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

  // Stats inspecting state
  const [inspectingUser, setInspectingUser] = useState<UserProfile | null>(null);
  const [userStats, setUserStats] = useState<UserStorageStats | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);

  // Purge modal state
  const [purgeTarget, setPurgeTarget] = useState<UserProfile | null>(null);
  const [purgeConfirmText, setPurgeConfirmText] = useState<string>('');
  const [purging, setPurging] = useState<boolean>(false);
  const [purgeSuccessCount, setPurgeSuccessCount] = useState<number | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    if (type === 'success') {
      toastSuccess(text);
    } else {
      toastError(text);
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
  }, []);

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
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">Admin & Database Storage Panel</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                SUPER ADMIN
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Pengelolaan Akun Pengguna & Efisiensi Kuota Database Firestore
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onSwitchToTeacherApp && (
            <button
              type="button"
              onClick={onSwitchToTeacherApp}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
            >
              <GraduationCap className="w-4 h-4 text-indigo-400" />
              <span>Buka Mode Guru (Workspace)</span>
            </button>
          )}

          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-semibold border border-rose-500/30 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Database Quota Information Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4.5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
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
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama guru, email, atau NIP..."
                className="w-full pl-9.5 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-medium text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 transition-colors"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-semibold text-slate-300 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="ACTIVE">Hanya Aktif</option>
              <option value="SUSPENDED">Hanya Ditangguhkan (Suspend)</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-semibold text-slate-300 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">Semua Peran</option>
              <option value="ADMIN">Hanya Admin</option>
              <option value="TEACHER">Hanya Guru</option>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={loadAllUsers}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Nama Guru / Staf</th>
                  <th className="py-3.5 px-4">Email & NIP</th>
                  <th className="py-3.5 px-4">Peran (Role)</th>
                  <th className="py-3.5 px-4 text-center">Status Akun</th>
                  <th className="py-3.5 px-4 text-center">Penggunaan DB</th>
                  <th className="py-3.5 px-4 text-right">Tindakan Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="inline-flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                        <span>Memuat data pengguna dari Firestore...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <p className="text-xs mb-2">Tidak ada akun pengguna yang cocok dengan kriteria filter/pencarian.</p>
                      {(searchQuery || statusFilter !== 'ALL' || roleFilter !== 'ALL') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setStatusFilter('ALL');
                            setRoleFilter('ALL');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-medium border border-slate-700 transition-colors"
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
                    const isSuper = u.role === 'ADMIN' && u.email === 'johanrovian90@gmail.com';
                    const isProtected = isSelf || isSuper;

                    return (
                      <tr key={u.uid} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-indigo-400 shrink-0">
                              {(u.displayName || u.email || 'G').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-white block">
                                {u.displayName || 'Nama Belum Diisi'}
                                {isSelf && <span className="ml-1.5 text-[10px] text-indigo-400 font-semibold">(Akun Anda)</span>}
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
                          {u.role === 'ADMIN' || u.email === 'johanrovian90@gmail.com' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold">
                              <ShieldCheck className="w-3 h-3 text-indigo-400" />
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
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                <span className="text-xs">Menghitung dokumen di Firestore...</span>
              </div>
            ) : userStats ? (
              <div className="space-y-3">
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950">Total Dokumen Workspace</span>
                  <span className="text-lg font-black text-indigo-700">{userStats.totalDocuments} Dokumen</span>
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
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  Shield, 
  GraduationCap, 
  Briefcase, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle,
  Hash
} from 'lucide-react';
import { UserProfile, UserRole, AccountStatus } from '../../types';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: UserProfile | null;
  onSave: (targetUid: string, updatedData: Partial<UserProfile>) => Promise<void>;
  isCurrentUser: boolean;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  onSave,
  isCurrentUser,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [nip, setNip] = useState('');
  const [nuptk, setNuptk] = useState('');
  const [nik, setNik] = useState('');
  const [phone, setPhone] = useState('');
  const [mainSubject, setMainSubject] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState<UserProfile['employmentStatus']>('PNS');
  const [role, setRole] = useState<UserRole>('TEACHER');
  const [accountStatus, setAccountStatus] = useState<AccountStatus>('ACTIVE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (targetUser) {
      setDisplayName(targetUser.displayName || '');
      setEmail(targetUser.email || '');
      setNip(targetUser.nip || '');
      setNuptk(targetUser.nuptk || '');
      setNik(targetUser.nik || '');
      setPhone(targetUser.phone || '');
      setMainSubject(targetUser.mainSubject || '');
      setEmploymentStatus(targetUser.employmentStatus || 'PNS');
      setRole(targetUser.role || 'TEACHER');
      setAccountStatus(targetUser.accountStatus || 'ACTIVE');
      setErrorMessage(null);
    }
  }, [targetUser, isOpen]);

  if (!isOpen || !targetUser) return null;

  const isSuperAdminEmail = targetUser.email === 'johanrovian90@gmail.com' || targetUser.email === 'fso2cool@gmail.com';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorMessage('Nama Lengkap tidak boleh kosong.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: Partial<UserProfile> = {
        displayName: displayName.trim(),
        nip: nip.trim() || undefined,
        nuptk: nuptk.trim() || undefined,
        nik: nik.trim() || undefined,
        phone: phone.trim() || undefined,
        mainSubject: mainSubject.trim() || undefined,
        employmentStatus,
        role: isSuperAdminEmail ? 'ADMIN' : role,
        accountStatus: isSuperAdminEmail ? 'ACTIVE' : accountStatus,
      };

      await onSave(targetUser.uid, payload);
      onClose();
    } catch (err: any) {
      console.error('Error saving user profile in admin:', err);
      setErrorMessage(err.message || 'Gagal memperbarui profil pengguna.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Edit Profil Akun Pengguna</h3>
              <p className="text-xs text-slate-400">
                Ubah informasi profil, NIP, status kepegawaian, dan perizinan sistem
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 [scrollbar-width:thin]">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* User Meta Banner */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <Mail className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300 font-medium">{email}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
              <span>UID:</span>
              <span className="text-slate-300">{targetUser.uid}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Display Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nama Lengkap & Gelar <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Contoh: Drs. H. Ahmad Fauzi, M.Pd."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                />
              </div>
            </div>

            {/* NIP */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                NIP (Nomor Induk Pegawai)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  placeholder="Contoh: 198503122011011002"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                />
              </div>
            </div>

            {/* NUPTK */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                NUPTK
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={nuptk}
                  onChange={(e) => setNuptk(e.target.value)}
                  placeholder="Contoh: 4539763665200002"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                />
              </div>
            </div>

            {/* NIK */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                NIK (KTP)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={nik}
                  onChange={(e) => setNik(e.target.value)}
                  placeholder="16 Digit NIK"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                />
              </div>
            </div>

            {/* Nomor HP / WA */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nomor Telepon / WhatsApp
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08123456789"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* Mapel Utama */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mata Pelajaran Utama
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={mainSubject}
                  onChange={(e) => setMainSubject(e.target.value)}
                  placeholder="Contoh: Matematika, Fikih, IPA"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* Status Kepegawaian */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Status Kepegawaian
              </label>
              <select
                value={employmentStatus || 'PNS'}
                onChange={(e) => setEmploymentStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
              >
                <option value="PNS">PNS (Pegawai Negeri Sipil)</option>
                <option value="PPPK">PPPK</option>
                <option value="TETAP_YAYASAN">Guru Tetap Yayasan (GTY)</option>
                <option value="GTT">Guru Tidak Tetap (GTT)</option>
                <option value="HONORER">Honorer</option>
              </select>
            </div>

            {/* Peran Sistem (Role) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Peran Pengguna (System Role)
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                disabled={isSuperAdminEmail}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-60 cursor-pointer"
              >
                <option value="TEACHER">Guru (Teacher)</option>
                <option value="ADMIN">Administrator (Super Admin)</option>
              </select>
              {isSuperAdminEmail && (
                <span className="text-[10px] text-amber-400 mt-1 block">
                  Peran Super Admin Akun Utama tidak dapat diubah.
                </span>
              )}
            </div>

            {/* Status Akun */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Status Akun (Login Permission)
              </label>
              <select
                value={accountStatus}
                onChange={(e) => setAccountStatus(e.target.value as AccountStatus)}
                disabled={isSuperAdminEmail || isCurrentUser}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-60 cursor-pointer"
              >
                <option value="ACTIVE">Aktif (Dapat Mengakses & Input)</option>
                <option value="SUSPENDED">Ditangguhkan (Blokir Akses Masuk)</option>
                <option value="INACTIVE">Non-Aktif</option>
              </select>
              {(isSuperAdminEmail || isCurrentUser) && (
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {isCurrentUser ? 'Tidak dapat menangguhkan akun sendiri.' : 'Akun utama selalu aktif.'}
                </span>
              )}
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn-primary px-4 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan Perubahan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

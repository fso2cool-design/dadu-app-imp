import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { submitOnboarding, OnboardingData } from '../../services/firestore/onboarding';
import { 
  User, 
  Building2, 
  Calendar, 
  Layers, 
  BookOpen, 
  Briefcase, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Plus, 
  Trash2, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { DaduLogo } from '../../components/common/DaduLogo';
import { APP_CONFIG } from '../../constants/app';

export const OnboardingWizard: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { reloadWorkspaceData } = useWorkspace();

  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<OnboardingData>({
    profile: {
      displayName: profile?.displayName || user?.displayName || '',
      nip: '',
      nik: '',
      phone: '',
    },
    school: {
      schoolName: '',
      schoolShortName: '',
      nsm: '',
      npsn: '',
      address: '',
      headmasterName: '',
      headmasterNip: '',
    },
    academicYear: {
      label: '2026/2027',
      startYear: 2026,
      endYear: 2027,
      currentSemester: 'GANJIL',
    },
    classes: [
      { name: 'X-A', gradeLevel: '10', major: 'Umum', isHomeroom: false },
      { name: 'X-B', gradeLevel: '10', major: 'Umum', isHomeroom: false },
    ],
    subjects: [
      { code: 'ENG', name: 'Bahasa Inggris' },
    ],
    assignments: [
      { classIndex: 0, subjectIndex: 0 },
      { classIndex: 1, subjectIndex: 0 },
    ],
  });

  const handleFinish = async () => {
    if (!user) return;
    setError(null);
    setSubmitting(true);

    try {
      if (!formData.profile.displayName.trim()) {
        throw new Error('Nama guru wajib diisi.');
      }
      if (!formData.school.schoolName.trim()) {
        throw new Error('Nama madrasah/sekolah wajib diisi.');
      }
      if (!formData.school.headmasterName.trim()) {
        throw new Error('Nama kepala madrasah/sekolah wajib diisi.');
      }
      if (formData.classes.length === 0) {
        throw new Error('Minimal harus ada 1 kelas yang didaftarkan.');
      }
      if (formData.subjects.length === 0) {
        throw new Error('Minimal harus ada 1 mata pelajaran yang didaftarkan.');
      }

      await submitOnboarding(user.uid, user.email || '', formData);
      await refreshProfile();
      await reloadWorkspaceData();
    } catch (err: any) {
      console.error('Onboarding submission error:', err);
      setError(err.message || 'Gagal menyimpan data onboarding.');
      setSubmitting(false);
    }
  };

  // Helper to add/remove classes
  const addClass = () => {
    setFormData(prev => ({
      ...prev,
      classes: [...prev.classes, { name: '', gradeLevel: '10', major: 'Umum', isHomeroom: false }],
    }));
  };

  const removeClass = (index: number) => {
    if (formData.classes.length <= 1) return;
    setFormData(prev => {
      const newClasses = prev.classes.filter((_, i) => i !== index);
      const newAssignments = prev.assignments
        .filter(a => a.classIndex !== index)
        .map(a => ({
          ...a,
          classIndex: a.classIndex > index ? a.classIndex - 1 : a.classIndex,
        }));
      return { ...prev, classes: newClasses, assignments: newAssignments };
    });
  };

  // Helper to add/remove subjects
  const addSubject = () => {
    setFormData(prev => ({
      ...prev,
      subjects: [...prev.subjects, { code: '', name: '' }],
    }));
  };

  const removeSubject = (index: number) => {
    if (formData.subjects.length <= 1) return;
    setFormData(prev => {
      const newSubjects = prev.subjects.filter((_, i) => i !== index);
      const newAssignments = prev.assignments
        .filter(a => a.subjectIndex !== index)
        .map(a => ({
          ...a,
          subjectIndex: a.subjectIndex > index ? a.subjectIndex - 1 : a.subjectIndex,
        }));
      return { ...prev, subjects: newSubjects, assignments: newAssignments };
    });
  };

  const toggleAssignment = (classIdx: number, subjectIdx: number) => {
    setFormData(prev => {
      const exists = prev.assignments.some(
        a => a.classIndex === classIdx && a.subjectIndex === subjectIdx
      );
      if (exists) {
        return {
          ...prev,
          assignments: prev.assignments.filter(
            a => !(a.classIndex === classIdx && a.subjectIndex === subjectIdx)
          ),
        };
      } else {
        return {
          ...prev,
          assignments: [...prev.assignments, { classIndex: classIdx, subjectIndex: subjectIdx }],
        };
      }
    });
  };

  const stepsList = [
    { num: 1, title: 'Profil Guru', icon: User },
    { num: 2, title: 'Madrasah', icon: Building2 },
    { num: 3, title: 'Tahun Ajaran', icon: Calendar },
    { num: 4, title: 'Kelas', icon: Layers },
    { num: 5, title: 'Mata Pelajaran', icon: BookOpen },
    { num: 6, title: 'Pengajaran', icon: Briefcase },
  ];

  return (
    <div className="min-h-screen bg-[#0E1017] text-slate-100 flex flex-col justify-center px-4 py-8 relative select-none">
      {/* Background ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <div className="w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-orange-500/10 via-amber-500/10 to-cyan-500/10 blur-3xl opacity-50" />
      </div>

      <div className="max-w-3xl w-full mx-auto relative z-10">
        {/* Header Branding with Dadu Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-[#161922] border border-slate-700/80 shadow-lg flex items-center justify-center p-2">
              <DaduLogo size="md" />
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              Inisialisasi {APP_CONFIG.name}
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-serif">
            Selamat Datang di {APP_CONFIG.name}
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1.5 max-w-lg mx-auto">
            Mari siapkan workspace Anda dalam beberapa langkah sederhana. Data ini akan menjadi pondasi otomasi presensi, jurnal, dan penilaian.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2 [scrollbar-width:none]">
          {stepsList.map((s, idx) => {
            const Icon = s.icon;
            const isCompleted = step > s.num;
            const isCurrent = step === s.num;
            return (
              <div key={s.num} className="flex items-center shrink-0">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${
                      isCurrent
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 ring-2 ring-orange-400'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#161922] text-slate-400 border border-slate-800'
                    }`}
                  >
                    {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-[11px] font-medium mt-1.5 hidden sm:block ${
                    isCurrent ? 'text-orange-400 font-semibold' : isCompleted ? 'text-emerald-400' : 'text-slate-500'
                  }`}>
                    {s.title}
                  </span>
                </div>
                {idx < stepsList.length - 1 && (
                  <div className={`w-8 sm:w-12 h-0.5 mx-1.5 sm:mx-2 rounded ${
                    step > idx + 1 ? 'bg-emerald-600' : 'bg-slate-800'
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Card Container */}
        <div className="bg-[#141722]/95 border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Profil Guru */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-3 mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2 font-serif">
                  <User className="w-5 h-5 text-orange-400" />
                  1. Data Profil Guru
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Informasi ini digunakan pada kop dokumen resmi dan laporan akademik.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nama Lengkap & Gelar <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.profile.displayName}
                  onChange={e => setFormData(prev => ({
                    ...prev,
                    profile: { ...prev.profile, displayName: e.target.value }
                  }))}
                  placeholder="Contoh: Ahmad Dahlan, S.Pd.I., M.Pd."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    NIP (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.profile.nip}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      profile: { ...prev.profile, nip: e.target.value }
                    }))}
                    placeholder="198501012010011001"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    NIK (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.profile.nik}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      profile: { ...prev.profile, nik: e.target.value }
                    }))}
                    placeholder="3201..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nomor HP / WhatsApp (Opsional)
                </label>
                <input
                  type="text"
                  value={formData.profile.phone}
                  onChange={e => setFormData(prev => ({
                    ...prev,
                    profile: { ...prev.profile, phone: e.target.value }
                  }))}
                  placeholder="081234567890"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Identitas Madrasah */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-3 mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2 font-serif">
                  <Building2 className="w-5 h-5 text-orange-400" />
                  2. Identitas Madrasah / Sekolah
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Digunakan untuk kop laporan, daftar nilai, legger, dan export PDF.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nama Resmi Madrasah / Sekolah <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.school.schoolName}
                  onChange={e => setFormData(prev => ({
                    ...prev,
                    school: { ...prev.school, schoolName: e.target.value }
                  }))}
                  placeholder="Contoh: MAN 1 Model Bukittinggi / SMA Negeri 1"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    NPSN (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.school.npsn}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      school: { ...prev.school, npsn: e.target.value }
                    }))}
                    placeholder="10304567"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    NSM / Nomor Statistik (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.school.nsm}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      school: { ...prev.school, nsm: e.target.value }
                    }))}
                    placeholder="131113750001"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Alamat Lengkap Madrasah / Sekolah
                </label>
                <input
                  type="text"
                  value={formData.school.address}
                  onChange={e => setFormData(prev => ({
                    ...prev,
                    school: { ...prev.school, address: e.target.value }
                  }))}
                  placeholder="Jl. Raya Pendidikan No. 45..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nama Kepala Madrasah / Sekolah <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.school.headmasterName}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      school: { ...prev.school, headmasterName: e.target.value }
                    }))}
                    placeholder="Drs. H. Syukri, M.Pd."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    NIP Kepala Madrasah
                  </label>
                  <input
                    type="text"
                    value={formData.school.headmasterNip}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      school: { ...prev.school, headmasterNip: e.target.value }
                    }))}
                    placeholder="197005121995031002"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Tahun Ajaran */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-3 mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2 font-serif">
                  <Calendar className="w-5 h-5 text-orange-400" />
                  3. Tahun Ajaran & Semester Berjalan
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tahun ajaran aktif yang akan menjadi konteks utama pekerjaan Anda.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Label Tahun Ajaran <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.academicYear.label}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      academicYear: { ...prev.academicYear, label: e.target.value }
                    }))}
                    placeholder="2026/2027"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Tahun Mulai
                  </label>
                  <input
                    type="number"
                    value={formData.academicYear.startYear}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      academicYear: { ...prev.academicYear, startYear: parseInt(e.target.value) || 2026 }
                    }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Tahun Selesai
                  </label>
                  <input
                    type="number"
                    value={formData.academicYear.endYear}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      academicYear: { ...prev.academicYear, endYear: parseInt(e.target.value) || 2027 }
                    }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Semester Aktif Berjalan <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['GANJIL', 'GENAP'] as const).map(sem => (
                    <button
                      key={sem}
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        academicYear: { ...prev.academicYear, currentSemester: sem }
                      }))}
                      className={`p-4 rounded-xl border text-center font-semibold text-sm transition-all cursor-pointer ${
                        formData.academicYear.currentSemester === sem
                          ? 'bg-orange-500/20 border-orange-500 text-orange-400 ring-1 ring-orange-500 font-bold'
                          : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      Semester {sem === 'GANJIL' ? 'Ganjil (1)' : 'Genap (2)'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Kelas */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-3 mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2 font-serif">
                    <Layers className="w-5 h-5 text-orange-400" />
                    4. Daftar Rombongan Belajar (Kelas)
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tambahkan kelas yang Anda ajar. Tandai "Wali Kelas" hanya jika Anda ditugaskan membina kelas tersebut.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addClass}
                  className="px-3 py-1.5 rounded-lg bg-orange-600/30 hover:bg-orange-600 text-orange-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Kelas
                </button>
              </div>

              {/* Homeroom guidance badge */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span>Bukan Wali Kelas? Biarkan opsi <b>"Wali Kelas di sini"</b> tidak dicentang.</span>
                </div>
                {formData.classes.some(c => c.isHomeroom) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        classes: prev.classes.map(c => ({ ...c, isHomeroom: false }))
                      }));
                    }}
                    className="text-[11px] text-orange-400 hover:text-orange-300 underline font-medium cursor-pointer"
                  >
                    Setel Semua Bukan Wali Kelas
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {formData.classes.map((cls, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full">
                      <input
                        type="text"
                        required
                        value={cls.name}
                        onChange={e => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            classes: prev.classes.map((c, i) => i === idx ? { ...c, name: val } : c)
                          }));
                        }}
                        placeholder="Nama Kelas (misal: X-A)"
                        className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-orange-500"
                      />
                      <input
                        type="text"
                        value={cls.gradeLevel}
                        onChange={e => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            classes: prev.classes.map((c, i) => i === idx ? { ...c, gradeLevel: val } : c)
                          }));
                        }}
                        placeholder="Tingkat (misal: 10 / 11 / 12)"
                        className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-orange-500"
                      />
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none bg-slate-800 px-3 py-2 rounded-lg border border-slate-700">
                        <input
                          type="checkbox"
                          checked={cls.isHomeroom}
                          onChange={e => {
                            const checked = e.target.checked;
                            setFormData(prev => ({
                              ...prev,
                              // If checked, usually one class is homeroom, but allow flexibility
                              classes: prev.classes.map((c, i) => i === idx ? { ...c, isHomeroom: checked } : c)
                            }));
                          }}
                          className="rounded border-slate-700 text-orange-500 focus:ring-orange-500 accent-orange-500"
                        />
                        <span className="truncate font-medium">Wali Kelas di sini</span>
                      </label>
                    </div>
                    {formData.classes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeClass(idx)}
                        className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: Mata Pelajaran */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-3 mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2 font-serif">
                    <BookOpen className="w-5 h-5 text-orange-400" />
                    5. Mata Pelajaran yang Anda Ampu
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Masukkan kode singkat dan nama resmi mata pelajaran.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addSubject}
                  className="px-3 py-1.5 rounded-lg bg-orange-600/30 hover:bg-orange-600 text-orange-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Mapel
                </button>
              </div>

              <div className="space-y-3">
                {formData.subjects.map((sub, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-700 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <input
                        type="text"
                        required
                        value={sub.code}
                        onChange={e => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            subjects: prev.subjects.map((s, i) => i === idx ? { ...s, code: val } : s)
                          }));
                        }}
                        placeholder="Kode (misal: ENG, MAT, BIND)"
                        className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs uppercase focus:ring-1 focus:ring-orange-500"
                      />
                      <input
                        type="text"
                        required
                        value={sub.name}
                        onChange={e => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            subjects: prev.subjects.map((s, i) => i === idx ? { ...s, name: val } : s)
                          }));
                        }}
                        placeholder="Nama Mapel (misal: Bahasa Inggris)"
                        className="sm:col-span-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                    {formData.subjects.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSubject(idx)}
                        className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 6: Pengajaran */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-3 mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2 font-serif">
                  <Briefcase className="w-5 h-5 text-orange-400" />
                  6. Hubungkan Kelas & Mata Pelajaran
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Centang kombinasi kelas dan mata pelajaran yang Anda ajar.
                </p>
              </div>

              <div className="space-y-4">
                {formData.classes.map((cls, cIdx) => (
                  <div key={cIdx} className="p-4 rounded-xl bg-slate-900/70 border border-slate-700">
                    <div className="font-semibold text-sm text-orange-300 mb-2.5 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-400" />
                      Kelas {cls.name || `Kelas ${cIdx + 1}`}
                      {cls.isHomeroom && (
                        <span className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full border border-orange-500/30 font-semibold">
                          Wali Kelas
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {formData.subjects.map((sub, sIdx) => {
                        const isChecked = formData.assignments.some(
                          a => a.classIndex === cIdx && a.subjectIndex === sIdx
                        );
                        return (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => toggleAssignment(cIdx, sIdx)}
                            className={`p-3 rounded-lg border text-left flex items-center justify-between text-xs transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-orange-500/20 border-orange-500 text-white ring-1 ring-orange-500'
                                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <span className="font-medium">
                              {sub.name || `Mapel ${sIdx + 1}`} ({sub.code || 'CODE'})
                            </span>
                            <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                              isChecked ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-600'
                            }`}>
                              {isChecked && <Check className="w-3 h-3" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-800">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => { setStep(s => s - 1); setError(null); }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Kembali
              </button>
            ) : <div />}

            {step < 6 ? (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  if (step === 1 && !formData.profile.displayName.trim()) {
                    setError('Nama lengkap wajib diisi.');
                  } else if (step === 2 && (!formData.school.schoolName.trim() || !formData.school.headmasterName.trim())) {
                    setError('Nama madrasah dan nama kepala madrasah wajib diisi.');
                  } else if (step === 4 && formData.classes.some(c => !c.name.trim())) {
                    setError('Semua nama kelas harus diisi.');
                  } else if (step === 5 && formData.subjects.some(s => !s.name.trim() || !s.code.trim())) {
                    setError('Semua kode dan nama mata pelajaran harus diisi.');
                  } else {
                    setStep(s => s + 1);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-orange-600/30 transition-all cursor-pointer"
              >
                Lanjut <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleFinish}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/30 transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Menyimpan ke Database...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Selesaikan & Mulai Bekerja
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { updateUserProfile } from '../../services/firestore/users';
import { 
  getSchoolSettings, 
  saveSchoolSettings, 
  getDocumentSettings, 
  saveDocumentSettings,
  getUserPreferences, 
  saveUserPreferences 
} from '../../services/firestore/settings';
import { 
  exportFullDatabase, 
  importFullDatabase, 
  getDatabaseStatistics, 
  resetSemesterData,
  previewSemesterReset,
  DatabaseBackup,
  DatabaseStatistics,
  ResetSemesterOptions,
  ResetSemesterScope,
  ResetSemesterSummary,
  ImportProgressInfo
} from '../../services/firestore/backup';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { SchoolSettings, DocumentSettings, UserPreferences } from '../../types';
import { SignaturePadModal } from '../../components/common/SignaturePadModal';
import { UnsavedChangesModal } from '../../components/common/UnsavedChangesModal';
import { AttendanceHolidaysModal } from '../../components/common/AttendanceHolidaysModal';
import { Badge } from '../../components/common/Badge';
import { 
  User, 
  Building2, 
  FileCode2, 
  Sliders, 
  Calendar,
  Save, 
  CheckCircle2, 
  AlertCircle,
  Database,
  Download,
  Upload,
  RefreshCw,
  Activity,
  HardDrive,
  Trash2,
  PenTool,
  Image as ImageIcon,
  Check,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Eye,
  ShieldCheck,
  AlertTriangle,
  Server,
  Palette,
  Sun,
  Moon,
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { THEME_OPTIONS, ThemeKey, useAppTheme } from '../../context/ThemeContext';
import { DEFAULT_KEMENAG_LOGO } from '../../components/common/OfficialDocumentHeader';
import { ChangeLogModal } from '../../components/common/ChangeLogModal';
import { APP_CONFIG } from '../../constants/app';
import { APP_CHANGELOGS } from '../../constants/changelog';
import { RelationshipRecoverySection } from './RelationshipRecoverySection';

interface SettingsPageProps {
  initialTab?: string;
}

type TabType = 'profile' | 'school' | 'document' | 'preferences' | 'backup' | 'stats' | 'maintenance';

export const SettingsPage: React.FC<SettingsPageProps> = ({ initialTab = 'profile' }) => {
  const { user, profile, refreshProfile } = useAuth();
  const { classes, academicYears, activeAcademicYear, activeSemester, reloadWorkspaceData, triggerSyncFeedback, attendanceSettings } = useWorkspace();
  const { activeTheme, applyAndSaveTheme } = useAppTheme();
  const { success: toastSuccess, error: toastError } = useToast();
  const [selectedTheme, setSelectedTheme] = useState<ThemeKey>(activeTheme);

  useEffect(() => {
    setSelectedTheme(activeTheme);
  }, [activeTheme]);

  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Profile Form
  const [profileData, setProfileData] = useState({
    displayName: profile?.displayName || '',
    nip: profile?.nip || '',
    nuptk: profile?.nuptk || '',
    nik: profile?.nik || '',
    phone: profile?.phone || '',
    employmentStatus: (profile?.employmentStatus || 'PNS') as any,
    mainSubject: profile?.mainSubject || '',
    signatureUrl: profile?.signatureUrl || '',
  });

  // School Form
  const [schoolData, setSchoolData] = useState<SchoolSettings>({
    schoolName: '',
    schoolShortName: '',
    schoolLevel: 'MTs',
    accreditation: 'A',
    nsm: '',
    npsn: '',
    kemenagDistrict: '',
    kemenagLogoUrl: '',
    schoolLogoUrl: '',
    address: '',
    village: '',
    district: '',
    regency: '',
    province: '',
    postalCode: '',
    phone: '',
    email: '',
    website: '',
    logoUrl: '',
    headmasterName: '',
    headmasterNip: '',
    headmasterSignatureUrl: '',
    stampImageUrl: '',
  });

  // Document Form
  const [documentData, setDocumentData] = useState<DocumentSettings>({
    documentFont: 'Plus Jakarta Sans',
    paperSize: 'A4',
    defaultOrientation: 'PORTRAIT',
    letterheadStyle: 'CLASSIC_DOUBLE',
    headerEnabled: true,
    signatureEnabled: true,
    stampEnabled: true,
    signatureImageUrl: '',
    city: '',
  });

  // Preferences Form
  const [preferencesData, setPreferencesData] = useState<UserPreferences>({
    defaultSemester: 'GANJIL',
    theme: 'light',
  });

  // Signature Pad Modals
  const [isTeacherSigModalOpen, setIsTeacherSigModalOpen] = useState(false);
  const [isHeadmasterSigModalOpen, setIsHeadmasterSigModalOpen] = useState(false);
  const [isStampModalOpen, setIsStampModalOpen] = useState(false);

  // Backup & Stats State
  const [dbStats, setDbStats] = useState<DatabaseStatistics | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [backupFileContent, setBackupFileContent] = useState<DatabaseBackup | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgressText, setImportProgressText] = useState<string | null>(null);

  // Maintenance & Semantic Reset State
  const [resetAcademicYearId, setResetAcademicYearId] = useState<string>('');
  const [resetSemester, setResetSemester] = useState<'ALL' | '1' | '2'>('ALL');
  const [resetScope, setResetScope] = useState<ResetSemesterScope>({
    meetingsAndAttendance: true,
    assessmentsAndScores: true,
    dailyAttendance: true,
    teacherAttendance: false,
    classSchedules: false,
    studentNotes: false,
  });
  const [resetPreview, setResetPreview] = useState<ResetSemesterSummary | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [lastResetSummary, setLastResetSummary] = useState<ResetSemesterSummary | null>(null);
  const [confirmResetText, setConfirmResetText] = useState<string>('');
  const [isResetting, setIsResetting] = useState(false);
  const [isChangeLogModalOpen, setIsChangeLogModalOpen] = useState(false);

  useEffect(() => {
    if (initialTab) {
      const cleanTab = initialTab.replace('settings-', '') as TabType;
      if (['profile', 'school', 'document', 'preferences', 'backup', 'stats', 'maintenance'].includes(cleanTab)) {
        setActiveTab(cleanTab);
      }
    }
  }, [initialTab]);

  // Dirty state tracking references
  const initialProfileRef = useRef(profileData);
  const initialSchoolRef = useRef(schoolData);
  const initialDocRef = useRef(documentData);
  const initialPrefRef = useRef(preferencesData);

  const [isDirtyModalOpen, setIsDirtyModalOpen] = useState(false);
  const [pendingTab, setPendingTab] = useState<TabType | null>(null);

  // Sync profile when auth state updates
  useEffect(() => {
    if (profile) {
      const p = {
        displayName: profile.displayName || '',
        nip: profile.nip || '',
        nuptk: profile.nuptk || '',
        nik: profile.nik || '',
        phone: profile.phone || '',
        employmentStatus: (profile.employmentStatus || 'PNS') as any,
        mainSubject: profile.mainSubject || '',
        signatureUrl: profile.signatureUrl || '',
      };
      setProfileData(p);
      initialProfileRef.current = p;
    }
  }, [profile]);

  // Load Firestore Settings
  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const [sch, docS, pref] = await Promise.all([
          getSchoolSettings(user.uid),
          getDocumentSettings(user.uid),
          getUserPreferences(user.uid),
        ]);

        if (sch) {
          setSchoolData(sch);
          initialSchoolRef.current = sch;
        }
        if (docS) {
          setDocumentData(docS);
          initialDocRef.current = docS;
        }
        if (pref) {
          setPreferencesData(pref);
          initialPrefRef.current = pref;
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [user]);

  const isProfileDirty = JSON.stringify(profileData) !== JSON.stringify(initialProfileRef.current);
  const isSchoolDirty = JSON.stringify(schoolData) !== JSON.stringify(initialSchoolRef.current);
  const isDocDirty = JSON.stringify(documentData) !== JSON.stringify(initialDocRef.current);
  const isPrefDirty = JSON.stringify(preferencesData) !== JSON.stringify(initialPrefRef.current);

  const isCurrentTabDirty = (tab: TabType): boolean => {
    if (tab === 'profile') return isProfileDirty;
    if (tab === 'school') return isSchoolDirty;
    if (tab === 'document') return isDocDirty;
    if (tab === 'preferences') return isPrefDirty;
    return false;
  };

  const getTabLabel = (tab: TabType): string => {
    switch (tab) {
      case 'profile': return 'Profil Guru';
      case 'school': return 'Identitas Madrasah';
      case 'document': return 'Format Dokumen & Kop';
      case 'preferences': return 'Preferensi Workspace';
      default: return 'Pengaturan';
    }
  };

  const handleTabClick = (targetTab: TabType) => {
    if (targetTab === activeTab) return;
    if (isCurrentTabDirty(activeTab)) {
      setPendingTab(targetTab);
      setIsDirtyModalOpen(true);
    } else {
      setActiveTab(targetTab);
      setSuccessMsg(null);
      setErrorMsg(null);
    }
  };

  const handleSaveAndProceed = async () => {
    try {
      await handleSave();
      if (pendingTab) {
        setActiveTab(pendingTab);
        setPendingTab(null);
      }
      setIsDirtyModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDiscardAndProceed = () => {
    if (activeTab === 'profile') setProfileData(initialProfileRef.current);
    if (activeTab === 'school') setSchoolData(initialSchoolRef.current);
    if (activeTab === 'document') setDocumentData(initialDocRef.current);
    if (activeTab === 'preferences') setPreferencesData(initialPrefRef.current);

    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
    setIsDirtyModalOpen(false);
  };

  // Warning when leaving or reloading browser tab with unsaved changes
  useEffect(() => {
    const isAnyDirty = isProfileDirty || isSchoolDirty || isDocDirty || isPrefDirty;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isAnyDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isProfileDirty, isSchoolDirty, isDocDirty, isPrefDirty]);

  // Fetch Database Statistics when Stats tab is active
  const loadDatabaseStats = async () => {
    if (!user) return;
    try {
      setStatsLoading(true);
      const stats = await getDatabaseStatistics(user.uid);
      setDbStats(stats);
    } catch (err) {
      console.error('Error getting stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'stats' && !dbStats && user) {
      loadDatabaseStats();
    }
    if (activeAcademicYear && !resetAcademicYearId) {
      setResetAcademicYearId(activeAcademicYear.id);
    }
  }, [activeTab, user]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;

    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      triggerSyncFeedback('syncing', `Menyimpan pengaturan ${getTabLabel(activeTab)}...`);

      if (activeTab === 'profile') {
        await updateUserProfile(user.uid, profileData);
        await refreshProfile();
        initialProfileRef.current = JSON.parse(JSON.stringify(profileData));
      } else if (activeTab === 'school') {
        await saveSchoolSettings(user.uid, schoolData);
        initialSchoolRef.current = JSON.parse(JSON.stringify(schoolData));
      } else if (activeTab === 'document') {
        await saveDocumentSettings(user.uid, documentData);
        initialDocRef.current = JSON.parse(JSON.stringify(documentData));
      } else if (activeTab === 'preferences') {
        await saveUserPreferences(user.uid, preferencesData);
        initialPrefRef.current = JSON.parse(JSON.stringify(preferencesData));
      }

      triggerSyncFeedback('saved', 'Pengaturan berhasil disimpan!');
      setSuccessMsg('Pengaturan berhasil disimpan ke cloud database!');
      toastSuccess('Pengaturan berhasil disimpan ke cloud database!');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      triggerSyncFeedback('synced');
      setErrorMsg(err.message || 'Gagal menyimpan pengaturan.');
      toastError(err.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  // Helper: Read and compress image to base64 DataURL (max 400x400)
  const processImageFile = (file: File, maxDim = 400): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('Berkas harus berupa gambar (PNG, JPG, SVG, WebP).'));
        return;
      }
      // If SVG, read as text/dataURL directly
      if (file.type === 'image/svg+xml') {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/png', 0.9));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Kemenag Logo Upload Handler
  const handleKemenagLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await processImageFile(file, 400);
      setSchoolData(prev => ({ ...prev, kemenagLogoUrl: dataUrl }));
      toastSuccess('Logo Kementerian Agama berhasil diunggah!');
    } catch (err: any) {
      toastError(err.message || 'Gagal memproses gambar logo');
    }
  };

  // Madrasah Logo Upload Handler
  const handleSchoolLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await processImageFile(file, 400);
      setSchoolData(prev => ({ ...prev, schoolLogoUrl: dataUrl, logoUrl: dataUrl }));
      toastSuccess('Logo Madrasah berhasil diunggah!');
    } catch (err: any) {
      toastError(err.message || 'Gagal memproses gambar logo');
    }
  };

  // 1. Export JSON Full Backup
  const handleExportFullBackup = async () => {
    if (!user) return;
    try {
      setIsExporting(true);
      setSuccessMsg(null);
      setErrorMsg(null);

      const backup = await exportFullDatabase(
        user.uid, 
        profileData.displayName || user.displayName || 'Guru', 
        schoolData.schoolName || 'Madrasah'
      );

      const jsonStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `Backup_TeacherWorkspace_${dateStr}_${(profileData.displayName || 'Guru').replace(/\s+/g, '_')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccessMsg(`Backup data berhasil diunduh (${backup.metadata.totalDocuments} rekaman dokumen diekspor)!`);
    } catch (err: any) {
      console.error('Error exporting backup:', err);
      setErrorMsg('Gagal mengekspor data backup: ' + (err.message || 'Error'));
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Select & Parse Backup File
  const handleBackupFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.collections || !parsed.version) {
          throw new Error('Struktur JSON tidak valid sebagai berkas backup Dadu.');
        }
        setBackupFileContent(parsed);
        setSuccessMsg('File backup valid dan siap dipulihkan.');
        toastSuccess('Berkas backup valid dan siap dipulihkan.');
      } catch (err: any) {
        setErrorMsg('Format file tidak valid: ' + (err.message || 'JSON Parse Error'));
        toastError('Format file tidak valid: ' + (err.message || 'JSON Parse Error'));
        setBackupFileContent(null);
      }
    };
    reader.readAsText(file);
  };

  // 3. Execute Restore Backup with progress and idempotency feedback
  const handleExecuteRestore = async () => {
    if (!user || !backupFileContent) return;
    try {
      setIsImporting(true);
      setImportProgressText('Menghubungkan ke Firestore & menulis data batch...');
      setErrorMsg(null);
      setSuccessMsg(null);

      const result = await importFullDatabase(
        user.uid, 
        backupFileContent, 
        importMode,
        (prog) => {
          setImportProgressText(`${prog.message} (${prog.percentage}%)`);
        }
      );
      
      setSuccessMsg(`Restorasi berhasil! Total ${result.totalRestored} entri dokumen telah dipulihkan secara aman & idempoten.`);
      toastSuccess(`Restorasi berhasil! Total ${result.totalRestored} dokumen telah dipulihkan.`);
      setBackupFileContent(null);
      await reloadWorkspaceData();
      await refreshProfile();
    } catch (err: any) {
      console.error('Error restoring backup:', err);
      setErrorMsg('Gagal memulihkan backup: ' + (err.message || 'Error'));
      toastError('Gagal memulihkan backup: ' + (err.message || 'Error'));
    } finally {
      setIsImporting(false);
      setImportProgressText(null);
    }
  };

  // 3b. Quick Safety Backup Download Before Destructive Operation
  const handleQuickSafetyBackup = async () => {
    if (!user) return;
    try {
      setIsExporting(true);
      const backupData = await exportFullDatabase(
        user.uid, 
        profileData.displayName, 
        schoolData.schoolName
      );
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `SAFETY_BACKUP_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toastSuccess('Cadangan pengaman berhasil diunduh sebelum tindakan pembersihan!');
    } catch (err: any) {
      toastError('Gagal mengunduh cadangan pengaman: ' + (err.message || 'Error'));
    } finally {
      setIsExporting(false);
    }
  };

  // 4a. Dry-Run / Pre-Flight Preview of Documents to be Reset
  const handlePreviewReset = async () => {
    if (!user || !resetAcademicYearId) return;
    try {
      setIsPreviewLoading(true);
      setErrorMsg(null);
      const preview = await previewSemesterReset(user.uid, {
        academicYearId: resetAcademicYearId,
        semester: resetSemester,
        scope: resetScope,
      });
      setResetPreview(preview);
    } catch (err: any) {
      console.error('Error previewing reset:', err);
      setErrorMsg('Gagal memuat pratinjau data reset: ' + (err.message || 'Error'));
      toastError('Gagal memuat pratinjau data reset');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // 4b. Handle Semantic Reset Semester Data
  const handleResetSemester = async () => {
    if (!user || !resetAcademicYearId) return;

    // Check if Academic Year is archived
    const selectedAY = academicYears.find(ay => ay.id === resetAcademicYearId);
    if (selectedAY?.isArchived) {
      setErrorMsg('Tahun Ajaran ini berstatus diarsipkan (read-only). Buka status arsip terlebih dahulu di master Tahun Ajaran sebelum menghapus data KBM.');
      toastError('Tahun Ajaran ini diarsipkan (read-only).');
      return;
    }

    // Validate confirmation string
    if (confirmResetText !== 'RESET DATA') {
      setErrorMsg('Teks konfirmasi salah. Harap ketik "RESET DATA" secara tepat.');
      return;
    }

    // Check if at least one scope is enabled
    const hasAnyScope = Object.values(resetScope).some(v => Boolean(v));
    if (!hasAnyScope) {
      setErrorMsg('Pilih minimal satu cakupan data yang ingin dibersihkan.');
      return;
    }

    try {
      setIsResetting(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const summary = await resetSemesterData(user.uid, {
        academicYearId: resetAcademicYearId,
        semester: resetSemester,
        scope: resetScope,
      });

      setLastResetSummary(summary);
      setSuccessMsg(`Reset data semester selesai! Total ${summary.totalDeleted} dokumen transaksional berhasil dibersihkan (${summary.meetings} KBM, ${summary.attendanceRecords} presensi mapel, ${summary.assessmentItems} asesmen, ${summary.scores} nilai, ${summary.dailyAttendanceSessions} sesi presensi harian).`);
      toastSuccess(`Reset berhasil! Sebanyak ${summary.totalDeleted} dokumen dibersihkan.`);
      setConfirmResetText('');
      setResetPreview(null);
      await reloadWorkspaceData();
    } catch (err: any) {
      console.error('Error resetting semester:', err);
      setErrorMsg('Gagal mereset data semester: ' + (err.message || 'Error'));
      toastError('Gagal mereset data: ' + (err.message || 'Error'));
    } finally {
      setIsResetting(false);
    }
  };

  const tabs: Array<{ id: TabType; label: string; icon: any; badge?: string }> = [
    { id: 'profile', label: 'Profil Guru', icon: User },
    { id: 'school', label: 'Identitas Madrasah', icon: Building2 },
    { id: 'document', label: 'Format Dokumen & Kop', icon: FileCode2 },
    { id: 'backup', label: 'Backup & Restore', icon: Database, badge: 'Portabilitas' },
    { id: 'stats', label: 'Kesehatan Database', icon: Activity },
    { id: 'preferences', label: 'Preferensi', icon: Sliders },
    { id: 'maintenance', label: 'Pemeliharaan', icon: Trash2 },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-orange-500 dark:text-cyan-400" />
            Pengaturan & Profil Guru
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Kelola identitas guru, kop madrasah, tanda tangan digital, backup/restore data, dan preferensi aplikasi.
          </p>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex border-b border-slate-200 dark:border-[#232838] overflow-x-auto gap-2 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isDirty = isCurrentTabDirty(tab.id);
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-orange-500 dark:border-cyan-400 text-orange-600 dark:text-cyan-400 bg-orange-50/50 dark:bg-cyan-950/40'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-orange-500 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500'}`} />
              <span>{tab.label}</span>
              {isDirty && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Ada perubahan belum disimpan" />
              )}
              {tab.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {/* Error Notification */}
      {errorMsg && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs">
        
        {/* TAB 1: PROFIL GURU */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-800">Biodata & Informasi Akun Guru</h3>
                <p className="text-[11px] text-slate-400">Data ini digunakan sebagai nama penandatangan resmi di setiap laporan.</p>
              </div>
              <Badge variant="blue" size="sm">Akun Terverifikasi</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Lengkap & Gelar Akademik <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={profileData.displayName}
                  onChange={e => setProfileData(p => ({ ...p, displayName: e.target.value }))}
                  placeholder="Contoh: Ust. Ahmad Fauzi, S.Pd.I, M.Pd"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">NIP (Nomor Induk Pegawai)</label>
                <input
                  type="text"
                  value={profileData.nip}
                  onChange={e => setProfileData(p => ({ ...p, nip: e.target.value }))}
                  placeholder="19850715 201001 1 012"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">NUPTK</label>
                <input
                  type="text"
                  value={profileData.nuptk}
                  onChange={e => setProfileData(p => ({ ...p, nuptk: e.target.value }))}
                  placeholder="1234765890123456"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">NIK (Kependudukan)</label>
                <input
                  type="text"
                  value={profileData.nik}
                  onChange={e => setProfileData(p => ({ ...p, nik: e.target.value }))}
                  placeholder="3201..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status Kepegawaian</label>
                <select
                  value={profileData.employmentStatus}
                  onChange={e => setProfileData(p => ({ ...p, employmentStatus: e.target.value as any }))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium"
                >
                  <option value="PNS">PNS (Pegawai Negeri Sipil)</option>
                  <option value="PPPK">PPPK (Pegawai Pemerintah dgn Perjanjian Kerja)</option>
                  <option value="GTT">Guru Tidak Tetap (GTT / Honorer)</option>
                  <option value="TETAP_YAYASAN">Guru Tetap Yayasan (GTY)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mata Pelajaran Utama / Pengampu</label>
                <input
                  type="text"
                  value={profileData.mainSubject}
                  onChange={e => setProfileData(p => ({ ...p, mainSubject: e.target.value }))}
                  placeholder="Contoh: Fikih / Matematika / Bahasa Arab"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nomor WhatsApp / HP Aktif</label>
                <input
                  type="text"
                  value={profileData.phone}
                  onChange={e => setProfileData(p => ({ ...p, phone: e.target.value }))}
                  placeholder="081234567890"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
            </div>

            {/* Teacher Digital Signature Section */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-800 flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-emerald-600" />
                    Tanda Tangan Digital Guru
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Otomatis dibubuhkan pada dokumen rekap nilai, presensi, dan jurnal KBM saat dicetak.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsTeacherSigModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-emerald-600 text-xs font-semibold hover:bg-emerald-50 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>{profileData.signatureUrl ? 'Ubah Tanda Tangan' : 'Buat Tanda Tangan'}</span>
                </button>
              </div>

              {profileData.signatureUrl ? (
                <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-200">
                  <div className="h-16 w-36 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center p-1">
                    <img
                      src={profileData.signatureUrl}
                      alt="Tanda Tangan Guru"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Tanda Tangan Aktif
                    </span>
                    <p className="text-[11px] text-slate-400">Siap dicantumkan pada titimangsa dokumen cetak resmi.</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Belum ada tanda tangan digital yang disimpan.</p>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer transition-all"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Menyimpan...' : 'Simpan Profil Guru'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: IDENTITAS MADRASAH */}
        {activeTab === 'school' && (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Identitas Resmi Madrasah / Satuan Kerja</h3>
              <p className="text-[11px] text-slate-400">Konfigurasi Kop Surat 4 Tingkat, Logo Kemenag & Madrasah, Kepala Madrasah, dan stempel resmi.</p>
            </div>

            {/* SECTION 1: DUAL LOGO KOP SURAT (KEMENAG & MADRASAH) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-orange-500 dark:text-cyan-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Logo Resmi Dokumen (Kemenag & Madrasah)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold border border-emerald-200/60 dark:border-emerald-800/40">
                  Tersimpan di Cloud (Multi-Device)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Logo 1: Kementerian Agama */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Logo Kemenag (Sisi Kiri)</span>
                      <span className="text-[10px] text-slate-400">Tingkat 1 Instansi Kementerian Agama RI</span>
                    </div>
                    {schoolData.kemenagLogoUrl ? (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 font-medium">Custom</span>
                    ) : (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-medium">Default Resmi</span>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-2 shrink-0 shadow-2xs">
                      <img
                        src={schoolData.kemenagLogoUrl || DEFAULT_KEMENAG_LOGO}
                        alt="Logo Kemenag"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="space-y-2 flex-1">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 shadow-2xs cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5 text-orange-500 dark:text-cyan-400" />
                        <span>Unggah Logo Kemenag</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleKemenagLogoFileChange}
                          className="hidden"
                        />
                      </label>

                      {schoolData.kemenagLogoUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setSchoolData(prev => ({ ...prev, kemenagLogoUrl: '' }));
                            toastSuccess('Menggunakan logo default resmi Ikhlas Beramal.');
                          }}
                          className="block text-[11px] text-rose-500 hover:text-rose-600 dark:text-rose-400 font-semibold cursor-pointer"
                        >
                          Gunakan Logo Resmi Default
                        </button>
                      )}
                      <p className="text-[10px] text-slate-400 leading-tight">Mendukung file PNG transparan, JPG, atau SVG.</p>
                    </div>
                  </div>
                </div>

                {/* Logo 2: Madrasah / Sekolah */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Logo Madrasah (Sisi Kanan)</span>
                      <span className="text-[10px] text-slate-400">Lambang satuan kerja / madrasah</span>
                    </div>
                    {(schoolData.schoolLogoUrl || schoolData.logoUrl) ? (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 font-medium">Terpasang</span>
                    ) : (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 font-medium">Belum Diatur</span>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-2 shrink-0 shadow-2xs">
                      {(schoolData.schoolLogoUrl || schoolData.logoUrl) ? (
                        <img
                          src={schoolData.schoolLogoUrl || schoolData.logoUrl}
                          alt="Logo Madrasah"
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <div className="text-center text-slate-300 dark:text-slate-600 flex flex-col items-center">
                          <Building2 className="w-7 h-7 mb-0.5" />
                          <span className="text-[8px] font-bold uppercase">Madrasah</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 flex-1">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 shadow-2xs cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5 text-orange-500 dark:text-cyan-400" />
                        <span>{(schoolData.schoolLogoUrl || schoolData.logoUrl) ? 'Ganti Logo Madrasah' : 'Unggah Logo Madrasah'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleSchoolLogoFileChange}
                          className="hidden"
                        />
                      </label>

                      {(schoolData.schoolLogoUrl || schoolData.logoUrl) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSchoolData(prev => ({ ...prev, schoolLogoUrl: '', logoUrl: '' }));
                            toastSuccess('Logo madrasah dihapus.');
                          }}
                          className="block text-[11px] text-rose-500 hover:text-rose-600 dark:text-rose-400 font-semibold cursor-pointer"
                        >
                          Hapus Logo
                        </button>
                      )}
                      <p className="text-[10px] text-slate-400 leading-tight">Otomatis disinkronkan ke seluruh dokumen cetak.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: TEKS TINGKAT KOP SURAT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tingkat 2: Kantor Kementerian Agama Kabupaten / Kota
                </label>
                <input
                  type="text"
                  value={schoolData.kemenagDistrict || ''}
                  onChange={e => setSchoolData(s => ({ ...s, kemenagDistrict: e.target.value }))}
                  placeholder="Contoh: KANTOR KEMENTERIAN AGAMA KABUPATEN SERAM BAGIAN TIMUR"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold uppercase text-slate-900 dark:text-slate-100"
                />
                <p className="text-[10px] text-slate-400 mt-1">Baris ke-2 kop surat. Jika kosong, akan otomatis dibuat dari nama Kota/Kabupaten.</p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tingkat 3: Nama Resmi Madrasah / Satuan Kerja <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={schoolData.schoolName}
                  onChange={e => setSchoolData(s => ({ ...s, schoolName: e.target.value }))}
                  placeholder="Contoh: MAN 2 SERAM BAGIAN TIMUR"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold uppercase text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nama Singkat / Akronim</label>
                <input
                  type="text"
                  value={schoolData.schoolShortName || ''}
                  onChange={e => setSchoolData(s => ({ ...s, schoolShortName: e.target.value }))}
                  placeholder="Contoh: MAN 2 SBT"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Jenjang</label>
                  <select
                    value={schoolData.schoolLevel || 'MA'}
                    onChange={e => setSchoolData(s => ({ ...s, schoolLevel: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100"
                  >
                    <option value="MI">MI (Madrasah Ibtidaiyah)</option>
                    <option value="MTs">MTs (Madrasah Tsanawiyah)</option>
                    <option value="MA">MA (Madrasah Aliyah)</option>
                    <option value="MAK">MAK (Kejuruan)</option>
                    <option value="SD">SD</option>
                    <option value="SMP">SMP</option>
                    <option value="SMA">SMA</option>
                    <option value="SMK">SMK</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Akreditasi</label>
                  <select
                    value={schoolData.accreditation || 'A'}
                    onChange={e => setSchoolData(s => ({ ...s, accreditation: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100"
                  >
                    <option value="A">A (Unggul)</option>
                    <option value="B">B (Baik)</option>
                    <option value="C">C (Cukup)</option>
                    <option value="BELUM">Belum Terakreditasi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">NSM (Nomor Statistik Madrasah)</label>
                <input
                  type="text"
                  value={schoolData.nsm || ''}
                  onChange={e => setSchoolData(s => ({ ...s, nsm: e.target.value }))}
                  placeholder="1211..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">NPSN (Nomor Pokok Sekolah Nasional)</label>
                <input
                  type="text"
                  value={schoolData.npsn || ''}
                  onChange={e => setSchoolData(s => ({ ...s, npsn: e.target.value }))}
                  placeholder="2058..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tingkat 4: Alamat Jalan & Nomor Satuan Kerja
                </label>
                <input
                  type="text"
                  value={schoolData.address || ''}
                  onChange={e => setSchoolData(s => ({ ...s, address: e.target.value }))}
                  placeholder="Jl. dr. Sugiono – Kelapa Dua"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Kecamatan</label>
                  <input
                    type="text"
                    value={schoolData.district || ''}
                    onChange={e => setSchoolData(s => ({ ...s, district: e.target.value }))}
                    placeholder="Bula"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Kota / Kabupaten</label>
                  <input
                    type="text"
                    value={schoolData.regency || ''}
                    onChange={e => setSchoolData(s => ({ ...s, regency: e.target.value }))}
                    placeholder="Seram Bagian Timur"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Provinsi</label>
                  <input
                    type="text"
                    value={schoolData.province || ''}
                    onChange={e => setSchoolData(s => ({ ...s, province: e.target.value }))}
                    placeholder="Maluku"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Kode Pos</label>
                  <input
                    type="text"
                    value={schoolData.postalCode || ''}
                    onChange={e => setSchoolData(s => ({ ...s, postalCode: e.target.value }))}
                    placeholder="97554"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nama Kepala Madrasah</label>
                <input
                  type="text"
                  value={schoolData.headmasterName || ''}
                  onChange={e => setSchoolData(s => ({ ...s, headmasterName: e.target.value }))}
                  placeholder="Drs. H. Muhammad Ilyas, M.Pd"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">NIP Kepala Madrasah</label>
                <input
                  type="text"
                  value={schoolData.headmasterNip || ''}
                  onChange={e => setSchoolData(s => ({ ...s, headmasterNip: e.target.value }))}
                  placeholder="19700101 199503 1 001"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Headmaster Signature & Madrasah Stamp */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Headmaster Signature */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Tanda Tangan Kepala Madrasah</span>
                  <button
                    type="button"
                    onClick={() => setIsHeadmasterSigModalOpen(true)}
                    className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 dark:text-cyan-400 dark:hover:text-cyan-300 cursor-pointer"
                  >
                    {schoolData.headmasterSignatureUrl ? 'Ubah' : '+ Tambah'}
                  </button>
                </div>
                {schoolData.headmasterSignatureUrl ? (
                  <div className="h-16 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center p-1">
                    <img
                      src={schoolData.headmasterSignatureUrl}
                      alt="Tanda Tangan Kepala"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">Belum diatur (Opsional)</p>
                )}
              </div>

              {/* Madrasah Stamp / Cap */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Cap / Stempel Resmi Madrasah</span>
                  <button
                    type="button"
                    onClick={() => setIsStampModalOpen(true)}
                    className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 dark:text-cyan-400 dark:hover:text-cyan-300 cursor-pointer"
                  >
                    {schoolData.stampImageUrl ? 'Ubah' : '+ Upload Stempel'}
                  </button>
                </div>
                {schoolData.stampImageUrl ? (
                  <div className="h-16 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center p-1">
                    <img
                      src={schoolData.stampImageUrl}
                      alt="Stempel Madrasah"
                      className="max-h-full max-w-full object-contain -rotate-6 opacity-85"
                    />
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">Belum diatur (Opsional)</p>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer transition-all"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Menyimpan...' : 'Simpan Identitas Madrasah'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: FORMAT DOKUMEN & KOP */}
        {activeTab === 'document' && (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Format & Tata Letak Dokumen Resmi</h3>
              <p className="text-[11px] text-slate-400">Pengaturan ukuran kertas standar, tata letak kop surat, dan posisi titimangsa.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Ukuran Kertas Standar</label>
                <select
                  value={documentData.paperSize}
                  onChange={e => setDocumentData(d => ({ ...d, paperSize: e.target.value as any }))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100"
                >
                  <option value="A4">A4 (210 x 297 mm)</option>
                  <option value="F4">F4 / Folio (215 x 330 mm)</option>
                  <option value="LETTER">US Letter (215 x 279 mm)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Orientasi Default</label>
                <select
                  value={documentData.defaultOrientation}
                  onChange={e => setDocumentData(d => ({ ...d, defaultOrientation: e.target.value as any }))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100"
                >
                  <option value="PORTRAIT">Tegak (Portrait)</option>
                  <option value="LANDSCAPE">Mendatar (Landscape)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Kota Titimangsa Tanda Tangan</label>
                <input
                  type="text"
                  value={documentData.city || ''}
                  onChange={e => setDocumentData(d => ({ ...d, city: e.target.value }))}
                  placeholder="Contoh: Bula / Surabaya"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Checkbox Toggles */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Fitur Dokumen Cetak</span>
              
              <label className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={documentData.headerEnabled}
                  onChange={e => setDocumentData(d => ({ ...d, headerEnabled: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500 dark:text-cyan-500 dark:focus:ring-cyan-500"
                />
                <span>Sertakan Kop Surat Baku 4 Tingkat & Dual Logo (Kemenag & Madrasah)</span>
              </label>

              <label className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={documentData.signatureEnabled}
                  onChange={e => setDocumentData(d => ({ ...d, signatureEnabled: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500 dark:text-cyan-500 dark:focus:ring-cyan-500"
                />
                <span>Sertakan Kolom Tanda Tangan Resmi (Guru & Kepala Madrasah)</span>
              </label>
            </div>

            {/* Kop Surat Live Preview: Baku 4-Tier Standar Kemenag */}
            <div className="border border-slate-300 dark:border-slate-700 rounded-2xl p-6 bg-white text-slate-900 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Pratinjau Kop Surat Baku (4 Tingkat + Dual Logo)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold font-mono">Format Dinas Resmi</span>
              </div>
              
              <div className="pb-3">
                <div className="flex items-center justify-between gap-3 text-center pb-2">
                  {/* Left Logo: Kemenag */}
                  <div className="w-18 flex items-center justify-center shrink-0">
                    <img
                      src={schoolData.kemenagLogoUrl || DEFAULT_KEMENAG_LOGO}
                      alt="Logo Kemenag"
                      className="w-16 h-16 max-w-full max-h-full object-contain"
                    />
                  </div>

                  {/* 4-Tier Official Text */}
                  <div className="flex-1 text-center px-2">
                    {/* Tingkat 1 */}
                    <h5 className="text-xs font-semibold tracking-wider uppercase text-slate-800 leading-tight">
                      KEMENTERIAN AGAMA REPUBLIK INDONESIA
                    </h5>
                    {/* Tingkat 2 */}
                    <h6 className="text-[11px] font-semibold tracking-wide uppercase text-slate-800 leading-tight mt-0.5">
                      {schoolData.kemenagDistrict || (
                        schoolData.regency 
                          ? `KANTOR KEMENTERIAN AGAMA KABUPATEN ${schoolData.regency.toUpperCase().replace(/^KABUPATEN\s+|^KOTA\s+/i, '')}`
                          : 'KANTOR KEMENTERIAN AGAMA KABUPATEN'
                      )}
                    </h6>
                    {/* Tingkat 3 */}
                    <h3 className="text-base font-black tracking-wide uppercase text-slate-950 my-1 leading-snug">
                      {schoolData.schoolName || 'MAN 2 SERAM BAGIAN TIMUR'}
                    </h3>
                    {/* Tingkat 4: Alamat tanpa NSM/NPSN */}
                    <p className="text-[11px] text-slate-700 leading-snug">
                      {schoolData.address 
                        ? `${schoolData.address}${schoolData.village ? `, ${schoolData.village}` : ''}${schoolData.district ? `, Kec. ${schoolData.district}` : ''}${schoolData.regency ? `, ${schoolData.regency}` : ''}${schoolData.province ? `, ${schoolData.province}` : ''}`
                        : 'Jl. dr. Sugiono – Kelapa Dua Kec. Bula, Kab. Seram Bagian Timur, Bula'}
                    </p>
                  </div>

                  {/* Right Logo: Madrasah */}
                  <div className="w-18 flex items-center justify-center shrink-0">
                    {(schoolData.schoolLogoUrl || schoolData.logoUrl) ? (
                      <img
                        src={schoolData.schoolLogoUrl || schoolData.logoUrl}
                        alt="Logo Madrasah"
                        className="w-16 h-16 max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400">
                        <Building2 className="w-6 h-6 text-slate-400 mb-0.5" />
                        <span className="text-[8px] font-bold uppercase">Madrasah</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Double Border Rule */}
                <div className="border-b-2 border-slate-950"></div>
                <div className="border-b border-slate-950 mt-0.5"></div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer transition-all"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Menyimpan...' : 'Simpan Format Dokumen'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 4: BACKUP & RESTORE DATA */}
        {activeTab === 'backup' && (
          <div className="space-y-8">
            <div>
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                Portabilitas & Backup Database Lengkap
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Unduh seluruh data guru, riwayat KBM, nilai, presensi, dan catatan kelas dalam satu berkas `.json` mandiri.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Full Database Export */}
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Download className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-800">Ekspor Seluruh Database (JSON)</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Mencakup 14 sub-koleksi: Tahun Ajaran, Kelas, Mapel, Siswa, Plotting Mengajar, Jurnal/Pertemuan, Presensi Mapel & Harian, Penilaian & Butir Nilai, Skor, Catatan Wali Kelas, dan Konfigurasi Madrasah.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleExportFullBackup}
                  disabled={isExporting}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExporting ? 'Mengekstrak Data...' : 'Unduh File Backup JSON (1-Klik)'}</span>
                </button>
              </div>

              {/* Card 2: Restore from JSON */}
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-800">Pulihkan Data dari File Backup</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Unggah file backup `.json` sebelumnya untuk mengembalikan seluruh catatan akademik ke akun Anda secara aman.
                  </p>
                </div>

                <div className="space-y-3">
                  <input
                    type="file"
                    id="restore-json-input"
                    accept=".json,application/json"
                    onChange={handleBackupFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="restore-json-input"
                    className="w-full py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 shadow-2xs transition-all cursor-pointer block text-center"
                  >
                    <Upload className="w-4 h-4 text-slate-500" />
                    <span>Pilih Berkas Backup (.json)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Selected Backup Preview & Execution Box */}
            {backupFileContent && (
              <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-xs text-emerald-950 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      Pratinjau Isi File Backup Terpilih
                    </h5>
                    <p className="text-[11px] text-emerald-700">
                      Waktu Ekspor: {new Date(backupFileContent.exportedAt).toLocaleString('id-ID')} • Versi: {backupFileContent.version}
                    </p>
                  </div>
                  <Badge variant="success" size="sm">File Siap</Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 bg-white rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-slate-400 block font-semibold">Tahun Ajaran</span>
                    <span className="font-bold text-slate-800">{backupFileContent.collections.academicYears?.length || 0} entri</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-slate-400 block font-semibold">Kelas / Rombel</span>
                    <span className="font-bold text-slate-800">{backupFileContent.collections.classes?.length || 0} entri</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-slate-400 block font-semibold">Siswa & Enrollment</span>
                    <span className="font-bold text-slate-800">{backupFileContent.collections.students?.length || 0} siswa</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-slate-400 block font-semibold">Pertemuan & Jurnal</span>
                    <span className="font-bold text-slate-800">{backupFileContent.collections.meetings?.length || 0} sesi</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-semibold text-slate-700">Mode Pemulihan:</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        value="merge"
                        checked={importMode === 'merge'}
                        onChange={() => setImportMode('merge')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Gabung Data (Merge)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        value="overwrite"
                        checked={importMode === 'overwrite'}
                        onChange={() => setImportMode('overwrite')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Timpa (Overwrite)</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setBackupFileContent(null)}
                      className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteRestore}
                      disabled={isImporting}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{isImporting ? 'Memproses Restorasi...' : 'Eksekusi Pemulihan Data'}</span>
                    </button>
                  </div>
                </div>

                {importProgressText && (
                  <p className="text-[11px] text-emerald-800 animate-pulse font-medium">
                    {importProgressText}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: STATISTIK & KESEHATAN DATABASE */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  Statistik & Status Kesehatan Firestore
                </h3>
                <p className="text-[11px] text-slate-400">Pemantauan volumetrik rekaman data aktif pada ruang penyimpanan terisolasi Anda.</p>
              </div>

              <button
                type="button"
                onClick={loadDatabaseStats}
                disabled={statsLoading}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${statsLoading ? 'animate-spin' : ''}`} />
                <span>Segarkan Status</span>
              </button>
            </div>

            {/* Health Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Koneksi Firestore</span>
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    Online & Terenkripsi
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Latensi Jaringan</span>
                  <span className="text-xs font-bold text-slate-800 font-mono">
                    {dbStats ? `${dbStats.latencyMs} ms (Sangat Cepat)` : 'Memeriksa...'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Dokumen Aktif</span>
                  <span className="text-xs font-bold text-purple-900 font-mono">
                    {dbStats ? `${dbStats.totalDocuments} Dokumen` : 'Memeriksa...'}
                  </span>
                </div>
              </div>
            </div>

            {/* Detailed Collection Breakdown Table */}
            {dbStats && (
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-slate-800">Rincian Dokumen per Koleksi</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                    <span className="text-slate-500 text-[11px] block">Tahun Ajaran</span>
                    <strong className="text-sm font-bold text-slate-800">{dbStats.academicYearsCount}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                    <span className="text-slate-500 text-[11px] block">Rombel / Kelas</span>
                    <strong className="text-sm font-bold text-slate-800">{dbStats.classesCount}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                    <span className="text-slate-500 text-[11px] block">Mata Pelajaran</span>
                    <strong className="text-sm font-bold text-slate-800">{dbStats.subjectsCount}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                    <span className="text-slate-500 text-[11px] block">Master Siswa</span>
                    <strong className="text-sm font-bold text-slate-800">{dbStats.studentsCount}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                    <span className="text-slate-500 text-[11px] block">Plotting Mengajar</span>
                    <strong className="text-sm font-bold text-slate-800">{dbStats.teachingAssignmentsCount}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                    <span className="text-slate-500 text-[11px] block">Sesi Pertemuan KBM</span>
                    <strong className="text-sm font-bold text-slate-800">{dbStats.meetingsCount}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                    <span className="text-slate-500 text-[11px] block">Log Presensi Siswa</span>
                    <strong className="text-sm font-bold text-slate-800">{dbStats.attendanceRecordsCount}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                    <span className="text-slate-500 text-[11px] block">Butir Nilai & Skor</span>
                    <strong className="text-sm font-bold text-slate-800">{dbStats.assessmentItemsCount + dbStats.scoresCount}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Relationship Recovery & Identity Governance Section */}
            {user && (
              <RelationshipRecoverySection
                uid={user.uid}
                classes={classes}
                academicYears={academicYears}
                userDisplayName={profile?.displayName || user.displayName || undefined}
                onRefreshStats={loadDatabaseStats}
              />
            )}
          </div>
        )}

        {/* TAB 6: PREFERENSI */}
        {activeTab === 'preferences' && (
          <div className="space-y-8">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Preferensi Workspace & Personalisasi Tema</h3>
              <p className="text-[11px] text-slate-400">Sesuaikan semester default dan pilih tema visual workspace Anda.</p>
            </div>

            {/* Semester Bawaan Form */}
            <form onSubmit={handleSave} className="space-y-4 max-w-lg p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase tracking-wider">
                Pengaturan Alur Kerja Dasar
              </span>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Semester Bawaan Saat Membuka Modul</label>
                <select
                  value={preferencesData.defaultSemester}
                  onChange={e => setPreferencesData(p => ({ ...p, defaultSemester: e.target.value as any }))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium"
                >
                  <option value="GANJIL">Semester Ganjil (1)</option>
                  <option value="GENAP">Semester Genap (2)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">Semester yang otomatis aktif saat membuka modul presensi dan nilai.</p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer transition-all"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Menyimpan...' : 'Simpan Preferensi Workspace'}
                </button>
              </div>
            </form>

            {/* Kalender & Hari Libur Madrasah Card */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4 max-w-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-orange-500 dark:text-cyan-400" />
                    Sistem Hari Belajar & Kalender Libur Madrasah
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Atur kebijakan 5 hari vs 6 hari sekolah (apakah Sabtu aktif KBM atau libur) serta daftar tanggal libur khusus madrasah.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHolidayModalOpen(true)}
                  className="px-4 py-2 bg-white dark:bg-[#141722] hover:bg-slate-100 dark:hover:bg-[#1c2130] border border-slate-300 dark:border-[#232838] text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-2 transition-colors cursor-pointer shrink-0"
                >
                  <Calendar className="w-3.5 h-3.5 text-orange-500 dark:text-cyan-400" />
                  <span>Kelola Kalender & Libur</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-white dark:bg-[#141722] rounded-xl border border-slate-200/70 dark:border-[#232838]">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Sistem Belajar Mingguan</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {attendanceSettings.schoolDaysOption === 6 ? '6 Hari (Senin – Sabtu Aktif KBM)' : '5 Hari (Senin – Jumat Aktif, Sabtu Libur)'}
                  </p>
                </div>
                <div className="p-3 bg-white dark:bg-[#141722] rounded-xl border border-slate-200/70 dark:border-[#232838]">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Hari Libur Kustom Terdaftar</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {attendanceSettings.holidays?.length || 0} Tanggal / Agenda Libur Khusus
                  </p>
                </div>
              </div>
            </div>

            {/* Visual Theme Selector Section */}
            <div className="space-y-6 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Pilihan Skema Warna Workspace
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      applyAndSaveTheme(selectedTheme);
                      setSuccessMsg('Tema visual berhasil diterapkan dan disimpan!');
                      setTimeout(() => setSuccessMsg(null), 3500);
                    }}
                    disabled={selectedTheme === activeTheme}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                      selectedTheme !== activeTheme
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    <span>Terapkan & Simpan Tema</span>
                  </button>
                </div>
              </div>

              {/* 2-Theme Grid Selector (Citrus Lime Fresh vs Tron Cyber Grid) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {THEME_OPTIONS.map((t) => {
                  const isSelected = selectedTheme === t.id;
                  const isCurrentlyActive = activeTheme === t.id;
                  const isDarkTheme = t.category === 'dark';

                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTheme(t.id)}
                      className={`p-5 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                        isDarkTheme ? 'bg-[#141722] text-white' : 'bg-white text-slate-900'
                      } ${
                        isSelected
                          ? isDarkTheme 
                            ? 'border-cyan-400 shadow-xl shadow-cyan-500/20 ring-2 ring-cyan-500/30' 
                            : 'border-orange-500 shadow-xl shadow-orange-500/15 ring-2 ring-orange-500/30'
                          : isDarkTheme
                            ? 'border-[#232838] hover:border-cyan-500/40'
                            : 'border-slate-200 hover:border-orange-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            {isDarkTheme ? (
                              <Moon className="w-5 h-5 text-cyan-400" />
                            ) : (
                              <Sun className="w-5 h-5 text-orange-500" />
                            )}
                            <span className="font-bold text-sm tracking-tight flex items-center gap-2">
                              {t.name}
                            </span>
                          </div>
                          {isSelected && (
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-white ${
                              isDarkTheme ? 'bg-cyan-500 shadow-[0_0_10px_rgba(0,229,255,0.7)] text-slate-950' : 'bg-orange-500'
                            }`}>
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>

                        <p className={`text-xs leading-relaxed mb-4 ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
                          {t.description}
                        </p>

                        {/* Interactive UI Mockup Preview */}
                        <div className={`p-3.5 rounded-2xl border ${
                          isDarkTheme ? 'bg-[#0c0e15] border-[#232838]' : 'bg-slate-50 border-slate-200'
                        } space-y-2`}>
                          <div className="flex items-center justify-between">
                            <div className={`w-16 h-2 rounded ${isDarkTheme ? 'bg-slate-700' : 'bg-slate-300'}`} />
                            <div className={`w-8 h-2 rounded ${t.previewAccent}`} />
                          </div>
                          <div className={`p-2.5 rounded-xl border ${
                            isDarkTheme 
                              ? 'bg-[#141722] border-cyan-500/40 shadow-[0_0_10px_rgba(0,229,255,0.2)]' 
                              : 'bg-white border-slate-200 shadow-xs'
                          } flex items-center justify-between`}>
                            <div className={`w-20 h-2 rounded ${isDarkTheme ? 'bg-slate-800' : 'bg-slate-200'}`} />
                            <div className={`w-3 h-3 rounded-full ${isDarkTheme ? 'bg-cyan-400 shadow-[0_0_8px_rgba(0,229,255,0.8)]' : 'bg-orange-500'}`} />
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#232838] flex items-center justify-between">
                        <span className={`text-[11px] font-semibold ${
                          isCurrentlyActive 
                            ? isDarkTheme ? 'text-cyan-400' : 'text-orange-600'
                            : 'text-slate-400'
                        }`}>
                          {isCurrentlyActive ? '● Sedang Aktif' : 'Klik untuk memilih'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isDarkTheme 
                            ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/40' 
                            : 'bg-orange-50 text-orange-700 border border-orange-200'
                        }`}>
                          {isDarkTheme ? 'TRON CYBER OBSIDIAN' : 'CITRUS LIME FRESH'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Information Note */}
              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-slate-900 border border-emerald-100 dark:border-slate-800 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-400">
                <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  Pilihan tema akan langsung disimpan ke browser Anda. Klik tombol <strong>Terapkan & Simpan Tema</strong> untuk mengaktifkannya.
                </p>
              </div>

              {/* Versi & Catatan Pembaruan Card */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-cyan-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Versi Aplikasi: {APP_CONFIG.versionDisplay}
                    </span>
                    <span className="text-[10px] bg-emerald-50 dark:bg-slate-800 text-emerald-700 dark:text-cyan-300 px-2 py-0.5 rounded-md font-semibold border border-emerald-100 dark:border-slate-700">
                      Rilis {APP_CHANGELOGS[0]?.releaseDate || APP_CONFIG.releaseDate}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Buka jendela Catatan Pembaruan (Change Log) untuk membaca fitur-fitur baru di versi ini.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsChangeLogModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-emerald-700 dark:text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 border border-emerald-200/80 dark:border-slate-700"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Lihat Catatan Rilis</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: PEMELIHARAAN & RESET DATA SEMANTIK */}
        {activeTab === 'maintenance' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-600" />
                Pemeliharaan & Pembersihan Data Semester (Semantic Reset)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Fitur proteksi bergradasi untuk membersihkan data transaksional (jurnal KBM, absensi, dan nilai) pada pergantian semester secara aman dan terukur tanpa menghapus data master (siswa, kelas, mata pelajaran).
              </p>
            </div>

            {/* Quick Safety Backup Banner */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-amber-950">Disarankan: Unduh Cadangan Pengaman</h4>
                  <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                    Sebelum melakukan tindakan destruktif, unduh file snapshot database JSON sebagai arsip cadangan pengaman darurat.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleQuickSafetyBackup}
                disabled={isExporting}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting ? 'Mengunduh...' : 'Unduh Cadangan Pengaman'}</span>
              </button>
            </div>

            {/* Main Semantic Reset Form */}
            <div className="p-5 rounded-2xl bg-rose-50/50 border border-rose-200 space-y-5 max-w-2xl">
              <div className="flex items-start gap-3 border-b border-rose-100 pb-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-rose-950">Proteksi & Filter Semantik</h4>
                  <p className="text-[11px] text-rose-700 leading-relaxed mt-1">
                    Pilih tahun ajaran, semester sasaran, dan cakupan data yang ingin dibersihkan. Operasi ini berjalan dengan batch chunking tahan-kuota Firestore dan dilengkapi pratinjau pra-eksekusi.
                  </p>
                </div>
              </div>

              {/* 1. Target Academic Year */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  1. Pilih Tahun Ajaran Sasaran:
                </label>
                <select
                  value={resetAcademicYearId}
                  onChange={e => {
                    setResetAcademicYearId(e.target.value);
                    setResetPreview(null);
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:ring-2 focus:ring-rose-400 focus:outline-none"
                >
                  {academicYears.map(ay => (
                    <option key={ay.id} value={ay.id}>
                      Tahun Ajaran {ay.label} ({ay.currentSemester}) {ay.isArchived ? '— [DIARSIPKAN]' : (ay.isActive ? '— [SEDANG AKTIF]' : '')}
                    </option>
                  ))}
                </select>

                {academicYears.find(ay => ay.id === resetAcademicYearId)?.isArchived && (
                  <div className="mt-2 p-2.5 rounded-xl bg-red-100/90 border border-red-300 text-[11px] text-red-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>
                      <strong>Tahun Ajaran ini Diarsipkan:</strong> Status read-only aktif. Reset data dikunci untuk menjaga integritas riwayat terdahulu.
                    </span>
                  </div>
                )}
              </div>

              {/* 2. Target Semester Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  2. Pilih Semester yang Dibersihkan:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => { setResetSemester('ALL'); setResetPreview(null); }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex items-center gap-2 ${
                      resetSemester === 'ALL'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${resetSemester === 'ALL' ? 'bg-white' : 'bg-rose-400'}`} />
                    <span>Semua Semester (1 & 2)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setResetSemester('1'); setResetPreview(null); }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex items-center gap-2 ${
                      resetSemester === '1'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${resetSemester === '1' ? 'bg-white' : 'bg-rose-400'}`} />
                    <span>Semester 1 (Ganjil)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setResetSemester('2'); setResetPreview(null); }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex items-center gap-2 ${
                      resetSemester === '2'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${resetSemester === '2' ? 'bg-white' : 'bg-rose-400'}`} />
                    <span>Semester 2 (Genap)</span>
                  </button>
                </div>
              </div>

              {/* 3. Granular Scope Checkboxes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  3. Tentukan Cakupan Koleksi Data yang Dihapus:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-rose-100 hover:border-rose-300 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={resetScope.meetingsAndAttendance}
                      onChange={e => {
                        setResetScope(s => ({ ...s, meetingsAndAttendance: e.target.checked }));
                        setResetPreview(null);
                      }}
                      className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">Jurnal KBM & Absensi Mapel</span>
                      <span className="text-[10px] text-slate-500">Pertemuan agenda guru dan presensi pertemuan per mapel.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-rose-100 hover:border-rose-300 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={resetScope.assessmentsAndScores}
                      onChange={e => {
                        setResetScope(s => ({ ...s, assessmentsAndScores: e.target.checked }));
                        setResetPreview(null);
                      }}
                      className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">Penilaian & Nilai Siswa</span>
                      <span className="text-[10px] text-slate-500">Daftar butir asesmen formatif/sumatif serta skor nilai siswa.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-rose-100 hover:border-rose-300 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={resetScope.dailyAttendance}
                      onChange={e => {
                        setResetScope(s => ({ ...s, dailyAttendance: e.target.checked }));
                        setResetPreview(null);
                      }}
                      className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">Presensi Harian Wali Kelas</span>
                      <span className="text-[10px] text-slate-500">Sesi harian kelas dan rekam kehadiran siswa oleh wali kelas.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-rose-100 hover:border-rose-300 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={resetScope.teacherAttendance}
                      onChange={e => {
                        setResetScope(s => ({ ...s, teacherAttendance: e.target.checked }));
                        setResetPreview(null);
                      }}
                      className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">Presensi Mandiri Guru (Opsional)</span>
                      <span className="text-[10px] text-slate-500">Rekam presensi kedatangan guru dan log bulanan.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-rose-100 hover:border-rose-300 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={resetScope.classSchedules}
                      onChange={e => {
                        setResetScope(s => ({ ...s, classSchedules: e.target.checked }));
                        setResetPreview(null);
                      }}
                      className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">Jadwal Pelajaran Kelas (Opsional)</span>
                      <span className="text-[10px] text-slate-500">Alokasi jadwal KBM mingguan pada semester terpilih.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-rose-100 hover:border-rose-300 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={resetScope.studentNotes}
                      onChange={e => {
                        setResetScope(s => ({ ...s, studentNotes: e.target.checked }));
                        setResetPreview(null);
                      }}
                      className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">Catatan Perkembangan Siswa</span>
                      <span className="text-[10px] text-slate-500">Catatan khusus BK dan karakter siswa pada semester ini.</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* 4. Pre-Flight Preview Button & Display */}
              <div className="pt-1 border-t border-rose-100">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-700">4. Pratinjau Dokumen Terdampak (Dry Run):</span>
                  <button
                    type="button"
                    onClick={handlePreviewReset}
                    disabled={isPreviewLoading || !resetAcademicYearId}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>{isPreviewLoading ? 'Menghitung Dokumen...' : 'Hitung Dokumen Terdampak'}</span>
                  </button>
                </div>

                {resetPreview && (
                  <div className="mt-3 p-3.5 rounded-xl bg-white border border-rose-200 text-xs space-y-2">
                    <div className="flex items-center justify-between font-bold text-rose-950 pb-2 border-b border-rose-100">
                      <span>Total Dokumen yang Akan Dihapus:</span>
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-xs font-mono font-bold">
                        {resetPreview.totalDeleted} Dokumen
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-600">
                      <div>Pertemuan KBM: <strong className="text-slate-800">{resetPreview.meetings}</strong></div>
                      <div>Presensi Mapel: <strong className="text-slate-800">{resetPreview.attendanceRecords}</strong></div>
                      <div>Butir Penilaian: <strong className="text-slate-800">{resetPreview.assessmentItems}</strong></div>
                      <div>Nilai Siswa: <strong className="text-slate-800">{resetPreview.scores}</strong></div>
                      <div>Sesi Presensi Harian: <strong className="text-slate-800">{resetPreview.dailyAttendanceSessions}</strong></div>
                      <div>Rekam Presensi Harian: <strong className="text-slate-800">{resetPreview.dailyAttendanceRecords}</strong></div>
                      {resetScope.teacherAttendance && (
                        <div>Presensi Guru: <strong className="text-slate-800">{resetPreview.teacherAttendanceRecords + resetPreview.teacherMonthlyAttendance}</strong></div>
                      )}
                      {resetScope.classSchedules && (
                        <div>Jadwal Kelas: <strong className="text-slate-800">{resetPreview.classSchedules}</strong></div>
                      )}
                      {resetScope.studentNotes && (
                        <div>Catatan Siswa: <strong className="text-slate-800">{resetPreview.studentNotes}</strong></div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Confirmation Input */}
              <div className="pt-1 border-t border-rose-100">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  5. Ketik <code className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-mono font-bold">RESET DATA</code> untuk konfirmasi eksekusi:
                </label>
                <input
                  type="text"
                  value={confirmResetText}
                  onChange={e => setConfirmResetText(e.target.value)}
                  placeholder="Ketik persis: RESET DATA"
                  className="w-full px-3.5 py-2 rounded-xl border border-rose-300 text-xs font-mono font-bold bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              {/* 6. Execution Button */}
              <button
                type="button"
                onClick={handleResetSemester}
                disabled={
                  isResetting || 
                  confirmResetText !== 'RESET DATA' || 
                  academicYears.find(ay => ay.id === resetAcademicYearId)?.isArchived ||
                  !Object.values(resetScope).some(v => Boolean(v))
                }
                className="w-full px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isResetting ? 'Mengeksekusi Pembersihan Batch...' : 'Bersihkan Data Semester Terpilih Sekarang'}</span>
              </button>
            </div>

            {/* Last Reset Audit Result Card */}
            {lastResetSummary && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-2 max-w-2xl">
                <div className="flex items-center gap-2 font-bold text-emerald-950">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Audit Pembersihan Terakhir Berhasil</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Sebanyak <strong>{lastResetSummary.totalDeleted}</strong> dokumen transaksional berhasil dihapus secara aman dari koleksi pengguna tanpa kesalahan batch.
                </p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Signature Modal for Teacher */}
      <SignaturePadModal
        isOpen={isTeacherSigModalOpen}
        onClose={() => setIsTeacherSigModalOpen(false)}
        onSave={(dataUrl) => {
          setProfileData(p => ({ ...p, signatureUrl: dataUrl }));
          setSuccessMsg('Tanda tangan guru berhasil diperbarui. Klik "Simpan Perubahan" untuk menyimpan ke cloud.');
        }}
        title="Tanda Tangan Digital Guru"
        subtitle="Goreskan tanda tangan guru pengampu atau unggah file PNG transparan"
      />

      {/* Signature Modal for Headmaster */}
      <SignaturePadModal
        isOpen={isHeadmasterSigModalOpen}
        onClose={() => setIsHeadmasterSigModalOpen(false)}
        onSave={(dataUrl) => {
          setSchoolData(s => ({ ...s, headmasterSignatureUrl: dataUrl }));
          setSuccessMsg('Tanda tangan kepala madrasah berhasil diperbarui. Klik "Simpan Perubahan" untuk menyimpan ke cloud.');
        }}
        title="Tanda Tangan Kepala Madrasah"
        subtitle="Goreskan tanda tangan Kepala Madrasah untuk laporan resmi"
      />

      {/* Signature Modal for Stamp / Cap */}
      <SignaturePadModal
        isOpen={isStampModalOpen}
        onClose={() => setIsStampModalOpen(false)}
        onSave={(dataUrl) => {
          setSchoolData(s => ({ ...s, stampImageUrl: dataUrl }));
          setSuccessMsg('Stempel resmi madrasah berhasil diperbarui. Klik "Simpan Perubahan" untuk menyimpan ke cloud.');
        }}
        title="Cap / Stempel Resmi Madrasah"
        subtitle="Unggah gambar stempel madrasah (format PNG transparan disarankan)"
      />

      {/* Unsaved Changes Warning Modal */}
      <UnsavedChangesModal
        isOpen={isDirtyModalOpen}
        onClose={() => {
          setIsDirtyModalOpen(false);
          setPendingTab(null);
        }}
        onDiscard={handleDiscardAndProceed}
        onSave={handleSaveAndProceed}
        title="Perubahan Belum Disimpan"
        message={`Terdapat perubahan yang belum disimpan pada tab "${getTabLabel(activeTab)}". Apakah Anda ingin menyimpan perubahan tersebut sebelum berpindah ke tab "${pendingTab ? getTabLabel(pendingTab) : ''}"?`}
        saveButtonText="Simpan & Pindah"
        discardButtonText="Buang Perubahan"
      />

      {/* Attendance Holidays & Calendar Modal */}
      <AttendanceHolidaysModal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
      />

      {/* Change Log Modal */}
      <ChangeLogModal
        isOpen={isChangeLogModalOpen}
        onClose={() => setIsChangeLogModalOpen(false)}
        isManualTrigger={true}
      />
    </div>
  );
};

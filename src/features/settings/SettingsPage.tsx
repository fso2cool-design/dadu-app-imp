import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useAuth } from '../auth/AuthContext';
import type { DatabaseStatistics, DatabaseBackup, ResetSemesterScope, ResetSemesterSummary } from '../../domain/backup.types';
import { useApplication } from '../../application/ApplicationContext';

import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import type { SchoolSettings, DocumentSettings, UserPreferences, SemesterType } from '../../types';
import { SignaturePadModal } from '../../components/common/SignaturePadModal';
import { UnsavedChangesModal } from '../../components/common/UnsavedChangesModal';
import { AttendanceHolidaysModal } from '../../components/common/AttendanceHolidaysModal';
import { ChangeLogModal } from '../../components/common/ChangeLogModal';
import {
  User,
  Buildings,
  FileCode,
  Sliders,
  Database,
  Pulse,
  Trash,
  CheckCircle,
  WarningCircle,
  CircleNotch,
  Palette,
} from '@phosphor-icons/react';

// Sub-components per tab
import { ProfileTab } from './tabs/ProfileTab';
import { SchoolTab } from './tabs/SchoolTab';
import { DocumentTab } from './tabs/DocumentTab';
import { PreferencesTab } from './tabs/PreferencesTab';
import { StatsTab } from './tabs/StatsTab';
import type { TabType, ProfileFormData } from './tabs/types';

// Lazy-loaded heavy tabs (jarang diakses pada alur kerja KBM harian)
const BackupTab = lazy(() => import('./tabs/BackupTab').then(m => ({ default: m.BackupTab })));
const MaintenanceTab = lazy(() => import('./tabs/MaintenanceTab').then(m => ({ default: m.MaintenanceTab })));
const ShowcaseTab = lazy(() => import('./tabs/ShowcaseTab').then(m => ({ default: m.ShowcaseTab })));

const TabLoadingFallback = () => (
  <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
    <CircleNotch className="w-6 h-6 animate-spin text-[var(--ds-accent)]" />
    <span className="text-xs font-medium">Memuat modul pengaturan...</span>
  </div>
);

interface SettingsPageProps {
  initialTab?: string;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ initialTab = 'profile' }) => {
  const { user, profile, refreshProfile } = useAuth();
  const app = useApplication();
  const { academicYears, activeAcademicYear, reloadWorkspaceData, triggerSyncFeedback, attendanceSettings } = useWorkspace();
  const { success: toastSuccess, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Profile Form
  const [profileData, setProfileData] = useState<ProfileFormData>({
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
      if (['profile', 'school', 'document', 'preferences', 'backup', 'stats', 'maintenance', 'showcase'].includes(cleanTab)) {
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
          app.settings.getSchoolSettings(user.uid),
          app.settings.getDocumentSettings(user.uid),
          app.workspace.getUserPreferences(user.uid),
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
      const stats = await app.settings.getDatabaseStats(user.uid);
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
        await app.auth.updateProfile(user.uid, profileData);
        await refreshProfile();
        initialProfileRef.current = JSON.parse(JSON.stringify(profileData));
      } else if (activeTab === 'school') {
        await app.settings.saveSchoolSettings(user.uid, schoolData);
        initialSchoolRef.current = JSON.parse(JSON.stringify(schoolData));
      } else if (activeTab === 'document') {
        await app.settings.saveDocumentSettings(user.uid, documentData);
        initialDocRef.current = JSON.parse(JSON.stringify(documentData));
      } else if (activeTab === 'preferences') {
        await app.workspace.saveUserPreferences(user.uid, preferencesData);
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

      const backup = await app.settings.exportBackup(
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

      const result = await app.settings.importBackup(
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
      const backupData = await app.settings.exportBackup(
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
      const targetSemester: 'ALL' | SemesterType = resetSemester === '1' ? 'GANJIL' : resetSemester === '2' ? 'GENAP' : 'ALL';
      const preview = await app.settings.previewResetSemester(user.uid, {
        academicYearId: resetAcademicYearId,
        semester: targetSemester,
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

    const selectedAY = academicYears.find(ay => ay.id === resetAcademicYearId);
    if (selectedAY?.isArchived) {
      setErrorMsg('Tahun Ajaran ini berstatus diarsipkan (read-only). Buka status arsip terlebih dahulu di master Tahun Ajaran sebelum menghapus data KBM.');
      toastError('Tahun Ajaran ini diarsipkan (read-only).');
      return;
    }

    if (confirmResetText !== 'RESET DATA') {
      setErrorMsg('Teks konfirmasi salah. Harap ketik "RESET DATA" secara tepat.');
      return;
    }

    const hasAnyScope = Object.values(resetScope).some(v => Boolean(v));
    if (!hasAnyScope) {
      setErrorMsg('Pilih minimal satu cakupan data yang ingin dibersihkan.');
      return;
    }

    try {
      setIsResetting(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const targetSemester: 'ALL' | SemesterType = resetSemester === '1' ? 'GANJIL' : resetSemester === '2' ? 'GENAP' : 'ALL';
      const summary = await app.settings.resetSemesterData(user.uid, {
        academicYearId: resetAcademicYearId,
        semester: targetSemester,
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
    { id: 'school', label: 'Identitas Madrasah', icon: Buildings },
    { id: 'document', label: 'Format Dokumen & Kop', icon: FileCode },
    { id: 'backup', label: 'Backup & Restore', icon: Database, badge: 'Portabilitas' },
    { id: 'stats', label: 'Kesehatan Database', icon: Pulse },
    { id: 'preferences', label: 'Preferensi', icon: Sliders },
    { id: 'maintenance', label: 'Pemeliharaan', icon: Trash },
    { id: 'showcase', label: 'Design System', icon: Palette, badge: 'Pratinjau' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[var(--ds-accent)]" />
            Pengaturan & Profil Guru
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Kelola identitas guru, kop madrasah, tanda tangan digital, backup/restore data, dan preferensi aplikasi.
          </p>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex border-b border-[var(--ds-border)] overflow-x-auto gap-2 scrollbar-none">
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
                  ? 'border-[var(--ds-accent)] text-[var(--ds-accent)] bg-[var(--ds-accent-soft)]'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--ds-accent)]' : 'text-slate-400 dark:text-slate-500'}`} />
              <span>{tab.label}</span>
              {isDirty && (
                <span className="w-2 h-2 rounded-full bg-amber-500" title="Ada perubahan belum disimpan" />
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
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {/* Error Notification */}
      {errorMsg && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs animate-in fade-in duration-150">
          <WarningCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-2xs">
        {activeTab === 'profile' && (
          <ProfileTab
            profileData={profileData}
            setProfileData={setProfileData}
            saving={saving}
            onSubmit={handleSave}
            isTeacherSigModalOpen={isTeacherSigModalOpen}
            setIsTeacherSigModalOpen={setIsTeacherSigModalOpen}
            onSuccess={toastSuccess}
            onError={toastError}
          />
        )}

        {activeTab === 'school' && (
          <SchoolTab
            schoolData={schoolData}
            setSchoolData={setSchoolData}
            saving={saving}
            onSubmit={handleSave}
            isHeadmasterSigModalOpen={isHeadmasterSigModalOpen}
            setIsHeadmasterSigModalOpen={setIsHeadmasterSigModalOpen}
            isStampModalOpen={isStampModalOpen}
            setIsStampModalOpen={setIsStampModalOpen}
            onKemenagLogoChange={handleKemenagLogoFileChange}
            onSchoolLogoChange={handleSchoolLogoFileChange}
            onSuccess={toastSuccess}
            onError={toastError}
          />
        )}

        {activeTab === 'document' && (
          <DocumentTab
            documentData={documentData}
            setDocumentData={setDocumentData}
            schoolData={schoolData}
            saving={saving}
            onSubmit={handleSave}
            onSuccess={toastSuccess}
            onError={toastError}
          />
        )}

        {activeTab === 'backup' && (
          <Suspense fallback={<TabLoadingFallback />}>
            <BackupTab
              saving={saving}
              isExporting={isExporting}
              setIsExporting={setIsExporting}
              backupFileContent={backupFileContent}
              setBackupFileContent={setBackupFileContent}
              importMode={importMode}
              setImportMode={setImportMode}
              isImporting={isImporting}
              setIsImporting={setIsImporting}
              importProgressText={importProgressText}
              setImportProgressText={setImportProgressText}
              onExportFullBackup={handleExportFullBackup}
              onBackupFileChange={handleBackupFileChange}
              onExecuteRestore={handleExecuteRestore}
              onSuccess={toastSuccess}
              onError={toastError}
            />
          </Suspense>
        )}

        {activeTab === 'stats' && (
          <StatsTab
            dbStats={dbStats}
            statsLoading={statsLoading}
            setStatsLoading={setStatsLoading}
            onRefreshStats={loadDatabaseStats}
          />
        )}

        {activeTab === 'preferences' && (
          <PreferencesTab
            preferencesData={preferencesData}
            setPreferencesData={setPreferencesData}
            attendanceSettings={attendanceSettings}
            saving={saving}
            onSubmit={handleSave}
            isHolidayModalOpen={isHolidayModalOpen}
            setIsHolidayModalOpen={setIsHolidayModalOpen}
            isChangeLogModalOpen={isChangeLogModalOpen}
            setIsChangeLogModalOpen={setIsChangeLogModalOpen}
            onSuccess={toastSuccess}
            onError={toastError}
          />
        )}

        {activeTab === 'maintenance' && (
          <Suspense fallback={<TabLoadingFallback />}>
            <MaintenanceTab
              saving={saving}
              academicYears={academicYears}
              resetAcademicYearId={resetAcademicYearId}
              setResetAcademicYearId={setResetAcademicYearId}
              resetSemester={resetSemester}
              setResetSemester={setResetSemester}
              resetScope={resetScope}
              setResetScope={setResetScope}
              resetPreview={resetPreview}
              setResetPreview={setResetPreview}
              isPreviewLoading={isPreviewLoading}
              setIsPreviewLoading={setIsPreviewLoading}
              lastResetSummary={lastResetSummary}
              confirmResetText={confirmResetText}
              setConfirmResetText={setConfirmResetText}
              isResetting={isResetting}
              setIsResetting={setIsResetting}
              isExporting={isExporting}
              setIsExporting={setIsExporting}
              onPreviewReset={handlePreviewReset}
              onResetSemester={handleResetSemester}
              onQuickSafetyBackup={handleQuickSafetyBackup}
              onSuccess={toastSuccess}
              onError={toastError}
            />
          </Suspense>
        )}

        {activeTab === 'showcase' && (
          <Suspense fallback={<TabLoadingFallback />}>
            <ShowcaseTab />
          </Suspense>
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

      {/* Attendance Holidays & CalendarBlank Modal */}
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

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { LoginPage } from './features/auth/LoginPage';
import { OnboardingWizard } from './features/onboarding/OnboardingWizard';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { AdminUserManagementPage } from './features/admin/AdminUserManagementPage';
import { MasterDataPage } from './features/master/MasterDataPage';
import { TeacherHubPage } from './features/teacher/TeacherHubPage';
import { HomeroomHubPage } from './features/homeroom/HomeroomHubPage';
import { ReportsHubPage } from './features/reports/ReportsHubPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { PhaseShellPage } from './components/common/PhaseShellPage';
import { LoadingScreen } from './components/common/LoadingScreen';
import { FeedbackModal } from './components/common/FeedbackModal';
import { getUnreadFeedbackCount } from './services/firestore/feedbacks';
import { PublicReportViewerPage } from './features/public/PublicReportViewerPage';

function MainApp() {
  const { user, profile, loading: authLoading } = useAuth();
  const { loading: workspaceLoading } = useWorkspace();
  const [currentRoute, setCurrentRoute] = useState<string>('dashboard');
  const [routeState, setRouteState] = useState<any>(null);
  const [isAdminView, setIsAdminView] = useState<boolean | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);
  const [adminBadgeCount, setAdminBadgeCount] = useState<number>(0);

  // Check for public share token in URL query params: ?share=<token> or /share/<token>
  const [publicShareToken, setPublicShareToken] = useState<string | null>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const shareParam = urlParams.get('share');
      if (shareParam) return shareParam;
      
      const pathParts = window.location.pathname.split('/');
      const shareIdx = pathParts.indexOf('share');
      if (shareIdx !== -1 && pathParts[shareIdx + 1]) {
        return pathParts[shareIdx + 1];
      }
    } catch {
      // Ignore
    }
    return null;
  });

  const isAdmin = profile?.role === 'ADMIN' || profile?.email === 'johanrovian90@gmail.com';

  // Quota-friendly unread count check: only run once on load if admin
  useEffect(() => {
    if (isAdmin) {
      getUnreadFeedbackCount()
        .then(count => setAdminBadgeCount(count))
        .catch(err => console.warn('Unread feedback count check failed:', err));
    }
  }, [isAdmin]);

  // Reset current route to dashboard when user logs out or session changes
  useEffect(() => {
    if (!user) {
      setCurrentRoute('dashboard');
      setRouteState(null);
      setIsAdminView(null);
    }
  }, [user]);

  // Default directly to Teacher Workspace after login (Admin panel accessible via profile dropdown)
  useEffect(() => {
    if (profile && isAdminView === null) {
      setIsAdminView(false);
    }
  }, [profile, isAdminView]);

  const handleNavigate = (route: string, state?: any) => {
    setRouteState(state || null);
    setCurrentRoute(route);
  };

  // If public share token is present in the URL, directly render read-only public viewer
  if (publicShareToken) {
    return <PublicReportViewerPage token={publicShareToken} />;
  }

  if (authLoading) {
    return <LoadingScreen message="Memeriksa sesi login..." />;
  }

  // Not logged in -> Show Login / Signup
  if (!user) {
    return <LoginPage />;
  }

  // Logged in but still initializing user profile or workspace data
  if (!profile || workspaceLoading) {
    return <LoadingScreen message="Menyiapkan ruang kerja Anda..." />;
  }

  // If user is suspended, show suspended notice
  if (profile?.accountStatus === 'SUSPENDED') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center text-2xl font-bold">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-white">Akun Ditangguhkan (Suspended)</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Akun Anda saat ini dinonaktifkan sementara oleh Administrator Madrasah untuk pemeliharaan kuota data. Silakan hubungi Administrator untuk mengaktifkan kembali akses Anda.
          </p>
        </div>
      </div>
    );
  }

  // If Admin is viewing the Admin Panel
  if (isAdmin && isAdminView) {
    return (
      <AdminUserManagementPage 
        onSwitchToTeacherApp={() => setIsAdminView(false)} 
      />
    );
  }

  // Logged in but not onboarded yet -> Show 6-Step Onboarding Wizard
  if (!profile?.isOnboarded) {
    return <OnboardingWizard />;
  }

  // Render current active page
  const renderPage = () => {
    switch (currentRoute) {
      case 'dashboard':
        return <DashboardPage onNavigate={handleNavigate} />;
      case 'teacher':
      case 'teaching':
      case 'teaching-classes':
      case 'teaching-schedule':
      case 'schedule':
      case 'meetings':
      case 'attendance-subject':
      case 'grades':
        return <TeacherHubPage initialTab={currentRoute} routeState={routeState} onNavigate={handleNavigate} />;
      case 'homeroom':
      case 'homeroom-dashboard':
      case 'homeroom-attendance-daily':
      case 'homeroom-attendance-monthly':
      case 'homeroom-daily-attendance':
      case 'homeroom-monthly-attendance':
      case 'homeroom-teacher-attendance':
      case 'homeroom-attendance-teacher':
      case 'homeroom-students':
      case 'homeroom-notes':
      case 'homeroom-class-schedule':
      case 'homeroom-schedule':
        return <HomeroomHubPage initialTab={currentRoute} routeState={routeState} onNavigate={handleNavigate} />;
      case 'reports':
      case 'reports-center':
      case 'reports-attendance':
      case 'reports-grades':
      case 'reports-legger':
      case 'reports-journal':
        return <ReportsHubPage initialTab={currentRoute} onNavigate={handleNavigate} />;
      case 'master':
      case 'master-academic-years':
      case 'master-classes':
      case 'master-students':
      case 'master-subjects':
      case 'master-teaching':
        return <MasterDataPage initialTab={currentRoute} onNavigate={handleNavigate} />;
      case 'settings':
      case 'settings-profile':
      case 'settings-school':
      case 'settings-document':
      case 'settings-backup':
      case 'settings-stats':
      case 'settings-preferences':
      case 'settings-maintenance':
        return <SettingsPage initialTab={currentRoute} />;
      default:
        return <PhaseShellPage route={currentRoute} onNavigate={handleNavigate} />;
    }
  };

  return (
    <>
      <AppLayout 
        currentRoute={currentRoute} 
        onNavigate={handleNavigate}
        isAdmin={isAdmin}
        adminBadgeCount={adminBadgeCount}
        onOpenAdminPanel={isAdmin ? () => setIsAdminView(true) : undefined}
        onOpenFeedbackModal={() => setShowFeedbackModal(true)}
      >
        {renderPage()}
      </AppLayout>

      {showFeedbackModal && (
        <FeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <ThemeProvider>
          <ToastProvider>
            <MainApp />
          </ToastProvider>
        </ThemeProvider>
      </WorkspaceProvider>
    </AuthProvider>
  );
}

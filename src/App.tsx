import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { BrowserRouter, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { LoginPage } from './features/auth/LoginPage';
import { AppLayout } from './components/layout/AppLayout';
import { LoadingScreen } from './components/common/LoadingScreen';
import { NotFoundPage } from './components/common/NotFoundPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { getUnreadFeedbackCount } from './services/firestore/feedbacks';
import { resolvePathToRouteKey, resolveRoutePath } from './routes/paths';

// Lazy-loaded page components for route-level code splitting
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const TeacherHubPage = lazy(() => import('./features/teacher/TeacherHubPage').then(m => ({ default: m.TeacherHubPage })));
const HomeroomHubPage = lazy(() => import('./features/homeroom/HomeroomHubPage').then(m => ({ default: m.HomeroomHubPage })));
const ReportsHubPage = lazy(() => import('./features/reports/ReportsHubPage').then(m => ({ default: m.ReportsHubPage })));
const MasterDataPage = lazy(() => import('./features/master/MasterDataPage').then(m => ({ default: m.MasterDataPage })));
const AdminUserManagementPage = lazy(() => import('./features/admin/AdminUserManagementPage').then(m => ({ default: m.AdminUserManagementPage })));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const OnboardingWizard = lazy(() => import('./features/onboarding/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })));
const PublicReportViewerPage = lazy(() => import('./features/public/PublicReportViewerPage').then(m => ({ default: m.PublicReportViewerPage })));
const FeedbackModal = lazy(() => import('./components/common/FeedbackModal').then(m => ({ default: m.FeedbackModal })));

function MainApp() {
  const { user, profile, loading: authLoading } = useAuth();
  const { loading: workspaceLoading } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);
  const [adminBadgeCount, setAdminBadgeCount] = useState<number>(0);

  // Check for public share token in URL query params: ?share=<token> or /share/<token>
  const publicShareToken = useMemo(() => {
    const queryToken = searchParams.get('share');
    if (queryToken) return queryToken;

    const pathParts = location.pathname.split('/');
    const shareIdx = pathParts.indexOf('share');
    if (shareIdx !== -1 && pathParts[shareIdx + 1]) {
      return pathParts[shareIdx + 1];
    }
    return null;
  }, [location.pathname, searchParams]);

  // Derive active route key from current URL path
  const currentRoute = useMemo(() => {
    return resolvePathToRouteKey(location.pathname);
  }, [location.pathname]);

  const isAdmin = profile?.role === 'ADMIN' || profile?.email === 'johanrovian90@gmail.com' || profile?.email === 'fso2cool@gmail.com';

  // Quota-friendly unread count check: only run once on load if admin
  useEffect(() => {
    if (isAdmin) {
      getUnreadFeedbackCount()
        .then(count => setAdminBadgeCount(count))
        .catch(err => console.warn('Unread feedback count check failed:', err));
    }
  }, [isAdmin]);

  // If user is logged in and visits /login, redirect cleanly to /dashboard
  useEffect(() => {
    if (user && location.pathname === '/login') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, location.pathname, navigate]);

  // Backward-compatible navigation handler: converts route keys or URL paths to navigate()
  const handleNavigate = (route: string, state?: any) => {
    const targetPath = resolveRoutePath(route);
    navigate(targetPath, { state });
  };

  // If public share token is present in the URL, directly render read-only public viewer
  if (publicShareToken) {
    return (
      <Suspense fallback={<LoadingScreen message="Memuat dokumen publik..." />}>
        <PublicReportViewerPage token={publicShareToken} />
      </Suspense>
    );
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

  // If Admin is viewing the Admin Panel route
  if (isAdmin && location.pathname === '/admin') {
    return (
      <Suspense fallback={<LoadingScreen message="Menyiapkan panel admin..." />}>
        <AdminUserManagementPage 
          onSwitchToTeacherApp={() => handleNavigate('dashboard')} 
        />
      </Suspense>
    );
  }

  // Logged in but not onboarded yet -> Show 6-Step Onboarding Wizard
  if (!profile?.isOnboarded) {
    return (
      <Suspense fallback={<LoadingScreen message="Menyiapkan wisaya orientasi..." />}>
        <OnboardingWizard />
      </Suspense>
    );
  }

  // Render current active page based on URL route
  const renderPage = () => {
    const path = location.pathname.replace(/\/+$/, '') || '/';

    if (path === '/' || path === '/dashboard') {
      return <DashboardPage onNavigate={handleNavigate} />;
    }
    if (path.startsWith('/teacher')) {
      return <TeacherHubPage initialTab={currentRoute} routeState={location.state} onNavigate={handleNavigate} />;
    }
    if (path.startsWith('/homeroom')) {
      return <HomeroomHubPage initialTab={currentRoute} routeState={location.state} onNavigate={handleNavigate} />;
    }
    if (path.startsWith('/reports')) {
      return <ReportsHubPage initialTab={currentRoute} onNavigate={handleNavigate} />;
    }
    if (path.startsWith('/master')) {
      return <MasterDataPage initialTab={currentRoute} onNavigate={handleNavigate} />;
    }
    if (path.startsWith('/settings')) {
      return <SettingsPage initialTab={currentRoute} />;
    }

    return <NotFoundPage onNavigate={handleNavigate} />;
  };

  return (
    <>
      <AppLayout 
        currentRoute={currentRoute} 
        onNavigate={handleNavigate}
        isAdmin={isAdmin}
        adminBadgeCount={adminBadgeCount}
        onOpenAdminPanel={isAdmin ? () => handleNavigate('admin') : undefined}
        onOpenFeedbackModal={() => setShowFeedbackModal(true)}
      >
        <ErrorBoundary fallbackTitle="Terjadi Kendala pada Halaman Ini">
          <Suspense fallback={<LoadingScreen message="Memuat halaman..." fullScreen={false} />}>
            {renderPage()}
          </Suspense>
        </ErrorBoundary>
      </AppLayout>

      {showFeedbackModal && (
        <Suspense fallback={null}>
          <FeedbackModal
            isOpen={showFeedbackModal}
            onClose={() => setShowFeedbackModal(false)}
          />
        </Suspense>
      )}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary isRoot fallbackTitle="Terjadi Kendala Aplikasi">
      <BrowserRouter>
        <AuthProvider>
          <WorkspaceProvider>
            <ThemeProvider>
              <ToastProvider>
                <MainApp />
              </ToastProvider>
            </ThemeProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

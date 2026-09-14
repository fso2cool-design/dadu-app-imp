import React, { useState, useEffect, ReactNode, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { ChangeLogModal } from '../common/ChangeLogModal';
import { CHANGELOG_STORAGE_KEY } from '../../constants/changelog';

interface AppLayoutProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  children: ReactNode;
  onOpenAdminPanel?: () => void;
  isAdmin?: boolean;
  adminBadgeCount?: number;
  onOpenFeedbackModal?: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentRoute,
  onNavigate,
  children,
  onOpenAdminPanel,
  isAdmin = false,
  adminBadgeCount = 0,
  onOpenFeedbackModal,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [changeLogOpen, setChangeLogOpen] = useState(false);
  const [isManualChangeLog, setIsManualChangeLog] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Periksa apakah guru sudah pernah melihat change log untuk versi rilis saat ini
  useEffect(() => {
    try {
      const seen = localStorage.getItem(CHANGELOG_STORAGE_KEY);
      if (!seen) {
        // Tampilkan pop-up setelah render awal
        const timer = setTimeout(() => {
          setIsManualChangeLog(false);
          setChangeLogOpen(true);
        }, 600);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore storage error
    }
  }, []);

  const handleOpenManualChangeLog = () => {
    setIsManualChangeLog(true);
    setChangeLogOpen(true);
  };

  const [isSidebarCompact, setIsSidebarCompact] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sidebar_compact') === 'true';
    } catch {
      return false;
    }
  });

  // Automatically scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [currentRoute]);

  const handleToggleSidebarCompact = () => {
    setIsSidebarCompact(prev => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_compact', String(next));
      } catch {}
      return next;
    });
  };

  return (
    <div className="min-h-screen flex bg-[#f1f5f9] dark:bg-[#0C0E15] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Sidebar (Desktop Persistent / Mobile Drawer) */}
      <Sidebar
        currentRoute={currentRoute}
        onNavigate={onNavigate}
        isMobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        isCompact={isSidebarCompact}
        onToggleCompact={handleToggleSidebarCompact}
        isAdmin={isAdmin}
        adminBadgeCount={adminBadgeCount}
        onOpenAdminPanel={onOpenAdminPanel}
        onOpenFeedbackModal={onOpenFeedbackModal}
        onOpenChangeLog={handleOpenManualChangeLog}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header
          currentRoute={currentRoute}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onNavigate={onNavigate}
          onOpenAdminPanel={onOpenAdminPanel}
          adminBadgeCount={adminBadgeCount}
          onOpenFeedbackModal={onOpenFeedbackModal}
        />

        {/* Content Area with clean padding and ample workspace */}
        <main 
          ref={mainContentRef}
          className="flex-1 p-3.5 sm:p-5 lg:p-7 pb-24 sm:pb-28 lg:pb-8 max-w-7xl w-full mx-auto animate-in fade-in duration-200"
          key={currentRoute}
        >
          {children}
        </main>

        {/* Mobile-Only Bottom Navigation Bar (Hidden on Desktop) */}
        <BottomNav
          currentRoute={currentRoute}
          onNavigate={onNavigate}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />
      </div>

      {/* Pop-up Catatan Pembaruan (Release Notes & Change Log) */}
      <ChangeLogModal
        isOpen={changeLogOpen}
        onClose={() => setChangeLogOpen(false)}
        isManualTrigger={isManualChangeLog}
      />
    </div>
  );
};

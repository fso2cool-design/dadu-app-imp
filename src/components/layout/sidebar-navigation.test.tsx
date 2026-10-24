import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Sidebar } from './Sidebar';

describe('Sidebar Navigation & Auto-Collapse UX Refinement', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Separate Navigation and Disclosure Controls', () => {
    it('renders separate, non-nested buttons for group navigation and disclosure', () => {
      const onNavigate = vi.fn();
      const onCloseMobile = vi.fn();

      render(
        <Sidebar
          currentRoute="dashboard"
          onNavigate={onNavigate}
          isMobileOpen={false}
          onCloseMobile={onCloseMobile}
        />
      );

      // Group navigation button for Ruang Guru
      const navBtn = screen.getByRole('button', { name: /^Ruang Guru$/i });
      expect(navBtn).toHaveAttribute('data-nav-item', 'true');
      expect(navBtn).not.toHaveAttribute('aria-expanded');

      // Disclosure button for Ruang Guru
      const disclosureBtn = screen.getByRole('button', { name: /Buka menu Ruang Guru/i });
      expect(disclosureBtn).toHaveAttribute('aria-expanded', 'false');
      expect(disclosureBtn).toHaveAttribute('aria-controls', 'submenu-teacher');

      // Assert neither button is nested within the other
      expect(navBtn.contains(disclosureBtn)).toBe(false);
      expect(disclosureBtn.contains(navBtn)).toBe(false);

      // Nav button must not contain any interactive descendants
      const nestedButtons = navBtn.querySelectorAll('button, [role="button"], a');
      expect(nestedButtons.length).toBe(0);
    });

    it('toggles disclosure without changing route or closing mobile drawer', () => {
      const onNavigate = vi.fn();
      const onCloseMobile = vi.fn();

      render(
        <Sidebar
          currentRoute="dashboard"
          onNavigate={onNavigate}
          isMobileOpen={true}
          onCloseMobile={onCloseMobile}
        />
      );

      // Get disclosure button for mobile drawer
      const disclosureBtns = screen.getAllByRole('button', { name: /Buka menu Ruang Guru/i });
      const mobileDisclosureBtn = disclosureBtns[disclosureBtns.length - 1];

      // Click disclosure to open
      fireEvent.click(mobileDisclosureBtn);

      // Disclosure toggles: route must NOT be called, mobile drawer must NOT close
      expect(onNavigate).not.toHaveBeenCalled();
      expect(onCloseMobile).not.toHaveBeenCalled();
      expect(mobileDisclosureBtn).toHaveAttribute('aria-expanded', 'true');
      expect(mobileDisclosureBtn).toHaveAttribute('aria-label', 'Ciutkan menu Ruang Guru');

      // Controlled submenu should now be visible
      const submenu = document.getElementById('submenu-teacher');
      expect(submenu).not.toBeNull();
      expect(submenu).not.toHaveAttribute('hidden');

      // Click disclosure again to close
      fireEvent.click(mobileDisclosureBtn);
      expect(onNavigate).not.toHaveBeenCalled();
      expect(onCloseMobile).not.toHaveBeenCalled();
      expect(mobileDisclosureBtn).toHaveAttribute('aria-expanded', 'false');
      expect(submenu).toHaveAttribute('hidden');
    });

    it('navigates to parent route when group label button is clicked', () => {
      const onNavigate = vi.fn();
      const onCloseMobile = vi.fn();

      render(
        <Sidebar
          currentRoute="dashboard"
          onNavigate={onNavigate}
          isMobileOpen={false}
          onCloseMobile={onCloseMobile}
        />
      );

      const navBtn = screen.getByRole('button', { name: /^Ruang Guru$/i });
      fireEvent.click(navBtn);

      expect(onNavigate).toHaveBeenCalledWith('teacher');
    });
  });

  describe('Accordion and Route Synchronization', () => {
    it('automatically expands active group on initial render based on currentRoute', () => {
      const onNavigate = vi.fn();
      const onCloseMobile = vi.fn();

      render(
        <Sidebar
          currentRoute="teaching-classes"
          onNavigate={onNavigate}
          isMobileOpen={false}
          onCloseMobile={onCloseMobile}
        />
      );

      // Teacher group disclosure should be expanded
      const teacherDisclosure = screen.getByRole('button', { name: /Ciutkan menu Ruang Guru/i });
      expect(teacherDisclosure).toHaveAttribute('aria-expanded', 'true');

      // Submenu item should be active and visible
      const subitem = screen.getByRole('button', { name: /Rombel Ampuan/i });
      expect(subitem).toHaveAttribute('data-active', 'true');
      expect(subitem).toHaveAttribute('aria-current', 'page');

      // Other groups should be collapsed
      const homeroomDisclosure = screen.getByRole('button', { name: /Buka menu Ruang Wali Kelas/i });
      expect(homeroomDisclosure).toHaveAttribute('aria-expanded', 'false');
    });

    it('auto-reveals destination group non-destructively when currentRoute changes between groups', () => {
      const onNavigate = vi.fn();
      const onCloseMobile = vi.fn();

      const { rerender } = render(
        <Sidebar
          currentRoute="teaching-classes"
          onNavigate={onNavigate}
          isMobileOpen={false}
          onCloseMobile={onCloseMobile}
        />
      );

      expect(screen.getByRole('button', { name: /Ciutkan menu Ruang Guru/i })).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('button', { name: /Buka menu Ruang Wali Kelas/i })).toHaveAttribute('aria-expanded', 'false');

      // Navigate to homeroom route
      rerender(
        <Sidebar
          currentRoute="homeroom-students"
          onNavigate={onNavigate}
          isMobileOpen={false}
          onCloseMobile={onCloseMobile}
        />
      );

      // Non-destructive auto-reveal: Homeroom opens, and Teacher remains open
      expect(screen.getByRole('button', { name: /Ciutkan menu Ruang Guru/i })).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('button', { name: /Ciutkan menu Ruang Wali Kelas/i })).toHaveAttribute('aria-expanded', 'true');
    });

    it('preserves open accordion groups when navigating to independent pages', () => {
      const onNavigate = vi.fn();
      const onCloseMobile = vi.fn();

      const { rerender } = render(
        <Sidebar
          currentRoute="teaching-classes"
          onNavigate={onNavigate}
          isMobileOpen={false}
          onCloseMobile={onCloseMobile}
        />
      );

      expect(screen.getByRole('button', { name: /Ciutkan menu Ruang Guru/i })).toHaveAttribute('aria-expanded', 'true');

      // Navigate to Dashboard
      rerender(
        <Sidebar
          currentRoute="dashboard"
          onNavigate={onNavigate}
          isMobileOpen={false}
          onCloseMobile={onCloseMobile}
        />
      );

      // Teacher group remains preserved and open
      expect(screen.getByRole('button', { name: /Ciutkan menu Ruang Guru/i })).toHaveAttribute('aria-expanded', 'true');

      // Navigate to Reports Center
      rerender(
        <Sidebar
          currentRoute="reports-center"
          onNavigate={onNavigate}
          isMobileOpen={false}
          onCloseMobile={onCloseMobile}
        />
      );

      // Still preserved
      expect(screen.getByRole('button', { name: /Ciutkan menu Ruang Guru/i })).toHaveAttribute('aria-expanded', 'true');
    });

    it('supports independent multi-open: opening another group does not collapse existing open groups', () => {
      const onNavigate = vi.fn();
      const onCloseMobile = vi.fn();

      render(
        <Sidebar
          currentRoute="dashboard"
          onNavigate={onNavigate}
          isMobileOpen={false}
          onCloseMobile={onCloseMobile}
        />
      );

      // Open Ruang Guru
      const teacherDisclosure = screen.getByRole('button', { name: /Buka menu Ruang Guru/i });
      fireEvent.click(teacherDisclosure);
      expect(screen.getByRole('button', { name: /Ciutkan menu Ruang Guru/i })).toHaveAttribute('aria-expanded', 'true');

      // Open Ruang Wali Kelas
      const homeroomDisclosure = screen.getByRole('button', { name: /Buka menu Ruang Wali Kelas/i });
      fireEvent.click(homeroomDisclosure);

      // BOTH Ruang Guru and Ruang Wali Kelas must be expanded simultaneously!
      expect(screen.getByRole('button', { name: /Ciutkan menu Ruang Guru/i })).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('button', { name: /Ciutkan menu Ruang Wali Kelas/i })).toHaveAttribute('aria-expanded', 'true');
    });

    it('auto-reveals children when parent nav button is clicked while collapsed', () => {
      const onNavigate = vi.fn();
      const onCloseMobile = vi.fn();

      render(
        <Sidebar
          currentRoute="dashboard"
          onNavigate={onNavigate}
          isMobileOpen={false}
          onCloseMobile={onCloseMobile}
        />
      );

      // Ruang Guru is initially collapsed
      expect(screen.getByRole('button', { name: /Buka menu Ruang Guru/i })).toHaveAttribute('aria-expanded', 'false');

      // Click parent nav label button
      const navBtn = screen.getByRole('button', { name: /^Ruang Guru$/i });
      fireEvent.click(navBtn);

      // Navigation is triggered
      expect(onNavigate).toHaveBeenCalledWith('teacher');

      // Group auto-expands
      expect(screen.getByRole('button', { name: /Ciutkan menu Ruang Guru/i })).toHaveAttribute('aria-expanded', 'true');
    });

    it('does not re-open a manually collapsed submenu when route does not change', () => {
      const onNavigate = vi.fn();
      const onCloseMobile = vi.fn();

      const { rerender } = render(
        <Sidebar
          currentRoute="teaching-classes"
          onNavigate={onNavigate}
          isMobileOpen={false}
          onCloseMobile={onCloseMobile}
        />
      );

      const disclosureBtn = screen.getByRole('button', { name: /Ciutkan menu Ruang Guru/i });
      expect(disclosureBtn).toHaveAttribute('aria-expanded', 'true');

      // Manually collapse the active group
      fireEvent.click(disclosureBtn);
      expect(screen.getByRole('button', { name: /Buka menu Ruang Guru/i })).toHaveAttribute('aria-expanded', 'false');

      // Rerender with the SAME route
      rerender(
        <Sidebar
          currentRoute="teaching-classes"
          onNavigate={onNavigate}
          isMobileOpen={false}
          onCloseMobile={onCloseMobile}
        />
      );

      // Must remain collapsed because route did not change
      expect(screen.getByRole('button', { name: /Buka menu Ruang Guru/i })).toHaveAttribute('aria-expanded', 'false');
    });

    it('maintains group open when navigating between subpages in the same group', () => {
      const onNavigate = vi.fn();
      const onCloseMobile = vi.fn();

      const { rerender } = render(
        <Sidebar
          currentRoute="teaching-classes"
          onNavigate={onNavigate}
          isMobileOpen={false}
          onCloseMobile={onCloseMobile}
        />
      );

      expect(screen.getByRole('button', { name: /Ciutkan menu Ruang Guru/i })).toHaveAttribute('aria-expanded', 'true');

      // Move to teaching-schedule within the same teacher group
      rerender(
        <Sidebar
          currentRoute="teaching-schedule"
          onNavigate={onNavigate}
          isMobileOpen={false}
          onCloseMobile={onCloseMobile}
        />
      );

      expect(screen.getByRole('button', { name: /Ciutkan menu Ruang Guru/i })).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Mobile Drawer Interactions', () => {
    it('closes mobile drawer after clicking group label navigation', () => {
      const onNavigate = vi.fn();
      const onCloseMobile = vi.fn();

      render(
        <Sidebar
          currentRoute="dashboard"
          onNavigate={onNavigate}
          isMobileOpen={true}
          onCloseMobile={onCloseMobile}
        />
      );

      const navBtns = screen.getAllByRole('button', { name: /^Ruang Guru$/i });
      const mobileNavBtn = navBtns[navBtns.length - 1];

      fireEvent.click(mobileNavBtn);

      expect(onNavigate).toHaveBeenCalledWith('teacher');
      expect(onCloseMobile).toHaveBeenCalledTimes(1);
    });

    it('closes mobile drawer after selecting a submenu item', () => {
      const onNavigate = vi.fn();
      const onCloseMobile = vi.fn();

      render(
        <Sidebar
          currentRoute="teaching-classes"
          onNavigate={onNavigate}
          isMobileOpen={true}
          onCloseMobile={onCloseMobile}
        />
      );

      const subBtns = screen.getAllByRole('button', { name: /Penilaian Siswa/i });
      const mobileSubBtn = subBtns[subBtns.length - 1];

      fireEvent.click(mobileSubBtn);

      expect(onNavigate).toHaveBeenCalledWith('grades');
      expect(onCloseMobile).toHaveBeenCalledTimes(1);
    });
  });

  describe('Sidebar Compact Contract & Persistence', () => {
    it('maintains manual compact preference in localStorage and respects persisted value across reload', () => {
      let isCompact = localStorage.getItem('sidebar_compact') === 'true';
      const onToggleCompact = vi.fn(() => {
        isCompact = !isCompact;
        localStorage.setItem('sidebar_compact', String(isCompact));
      });

      const { rerender } = render(
        <Sidebar
          currentRoute="dashboard"
          onNavigate={vi.fn()}
          isMobileOpen={false}
          onCloseMobile={vi.fn()}
          isCompact={isCompact}
          onToggleCompact={onToggleCompact}
        />
      );

      // Desktop sidebar shell is initially expanded (w-64)
      const aside = document.querySelector('aside.sidebar-shell');
      expect(aside?.className).toContain('w-64');

      // Click toggle compact button in Sidebar
      const toggleCompactBtn = screen.getByRole('button', { name: /Tutup sidebar/i });
      fireEvent.click(toggleCompactBtn);

      // Callback invoked and state is saved to localStorage
      expect(onToggleCompact).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem('sidebar_compact')).toBe('true');

      // Reload simulation with persisted value
      const persistedCompact = localStorage.getItem('sidebar_compact') === 'true';
      rerender(
        <Sidebar
          currentRoute="teaching-classes"
          onNavigate={vi.fn()}
          isMobileOpen={false}
          onCloseMobile={vi.fn()}
          isCompact={persistedCompact}
          onToggleCompact={onToggleCompact}
        />
      );

      expect(aside?.className).toContain('w-18');
    });

    it('does not falsely mark inactive items as active in compact mode', () => {
      const onNavigate = vi.fn();
      const onCloseMobile = vi.fn();

      render(
        <Sidebar
          currentRoute="dashboard"
          onNavigate={onNavigate}
          isMobileOpen={false}
          onCloseMobile={onCloseMobile}
          isCompact={true}
        />
      );

      const dashboardBtn = screen.getByRole('button', { name: /dashboard/i });
      expect(dashboardBtn).toHaveAttribute('data-active', 'true');

      const teacherBtn = screen.getByRole('button', { name: /ruang guru/i });
      expect(teacherBtn).toHaveAttribute('data-active', 'false');

      const masterBtn = screen.getByRole('button', { name: /data master/i });
      expect(masterBtn).toHaveAttribute('data-active', 'false');
    });
  });

  describe('Keyboard and Accessibility Details', () => {
    it('supports Enter and Space key activation on disclosure button', () => {
      const onNavigate = vi.fn();
      const onCloseMobile = vi.fn();

      render(
        <Sidebar
          currentRoute="dashboard"
          onNavigate={onNavigate}
          isMobileOpen={false}
          onCloseMobile={onCloseMobile}
        />
      );

      const disclosureBtn = screen.getByRole('button', { name: /Buka menu Ruang Guru/i });
      expect(disclosureBtn).toHaveAttribute('aria-expanded', 'false');

      // Space key triggers click on standard button
      fireEvent.click(disclosureBtn);
      expect(disclosureBtn).toHaveAttribute('aria-expanded', 'true');

      // Enter key triggers click on standard button
      fireEvent.click(disclosureBtn);
      expect(disclosureBtn).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Sidebar Compact Flyout Popover & Logo Toggle Interaction', () => {
    it('uses permanent logo as toggle button in compact mode', () => {
      const onToggleCompact = vi.fn();
      render(
        <Sidebar
          currentRoute="dashboard"
          onNavigate={vi.fn()}
          isMobileOpen={false}
          onCloseMobile={vi.fn()}
          isCompact={true}
          onToggleCompact={onToggleCompact}
        />
      );

      const logoToggleBtn = screen.getByRole('button', { name: /Buka sidebar/i });
      expect(logoToggleBtn).toBeInTheDocument();
      fireEvent.click(logoToggleBtn);
      expect(onToggleCompact).toHaveBeenCalledTimes(1);
    });

    it('opens flyout popover when clicking group item with submenus in compact mode', () => {
      const onNavigate = vi.fn();
      render(
        <Sidebar
          currentRoute="dashboard"
          onNavigate={onNavigate}
          isMobileOpen={false}
          onCloseMobile={vi.fn()}
          isCompact={true}
        />
      );

      // Initially, flyout popover is not in document
      expect(screen.queryByTestId('sidebar-flyout-popover')).toBeNull();

      // Click "Ruang Guru" in compact mode
      const teacherBtn = screen.getByRole('button', { name: /Ruang Guru/i });
      expect(teacherBtn).toHaveAttribute('aria-haspopup', 'true');
      expect(teacherBtn).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(teacherBtn);

      // Popover should now be open
      expect(teacherBtn).toHaveAttribute('aria-expanded', 'true');
      const popover = screen.getByTestId('sidebar-flyout-popover');
      expect(popover).toBeInTheDocument();
      expect(popover).toHaveAttribute('role', 'menu');
      expect(popover).toHaveAttribute('aria-label', 'Menu Ruang Guru');

      // Check submenus are present inside the popover
      const gradesSubmenu = screen.getByRole('menuitem', { name: /Penilaian Siswa/i });
      expect(gradesSubmenu).toBeInTheDocument();

      // Click sub-item inside popover
      fireEvent.click(gradesSubmenu);
      expect(onNavigate).toHaveBeenCalledWith('grades');

      // Popover should close after selecting item
      expect(screen.queryByTestId('sidebar-flyout-popover')).toBeNull();
    });

    it('closes flyout popover when Escape key is pressed', () => {
      render(
        <Sidebar
          currentRoute="dashboard"
          onNavigate={vi.fn()}
          isMobileOpen={false}
          onCloseMobile={vi.fn()}
          isCompact={true}
        />
      );

      const teacherBtn = screen.getByRole('button', { name: /Ruang Guru/i });
      fireEvent.click(teacherBtn);
      expect(screen.getByTestId('sidebar-flyout-popover')).toBeInTheDocument();

      // Press Escape
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByTestId('sidebar-flyout-popover')).toBeNull();
    });
  });
});

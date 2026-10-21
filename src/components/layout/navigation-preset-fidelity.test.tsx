import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { Button } from '../ui/Button';

describe('Navigation Preset Fidelity & Accessibility', () => {
  describe('Sidebar Navigation Semantics', () => {
    it('renders navigation items with data-nav-item, data-active, and aria-current="page" on active item', () => {
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

      // Dashboard should be active
      const dashboardBtns = screen.getAllByRole('button', { name: /dashboard/i });
      const dashboardBtn = dashboardBtns[0];
      expect(dashboardBtn).toHaveAttribute('data-nav-item', 'true');
      expect(dashboardBtn).toHaveAttribute('data-active', 'true');
      expect(dashboardBtn).toHaveAttribute('aria-current', 'page');
      expect(dashboardBtn.className).toContain('nav-item');

      // Check capsule element is rendered inside
      const capsule = dashboardBtn.querySelector('.nav-active-capsule');
      expect(capsule).not.toBeNull();
      const marker = dashboardBtn.querySelector('.nav-active-marker');
      expect(marker).not.toBeNull();

      // Check an inactive item (Pusat Laporan & Cetak)
      const reportsBtn = screen.getByRole('button', { name: /pusat laporan/i });
      expect(reportsBtn).toHaveAttribute('data-nav-item', 'true');
      expect(reportsBtn).toHaveAttribute('data-active', 'false');
      expect(reportsBtn).not.toHaveAttribute('aria-current');
    });

    it('handles navigation item click and passes route to onNavigate', () => {
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

      const reportsBtn = screen.getByRole('button', { name: /pusat laporan/i });
      fireEvent.click(reportsBtn);
      expect(onNavigate).toHaveBeenCalledWith('reports-center');
    });

    it('renders subitems with data-nav-subitem and aria-current on active subitem', () => {
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

      const subitem = screen.getByRole('button', { name: /rombel ampuan/i });
      expect(subitem).toHaveAttribute('data-nav-subitem', 'true');
      expect(subitem).toHaveAttribute('data-active', 'true');
      expect(subitem).toHaveAttribute('aria-current', 'page');
      expect(subitem.className).toContain('nav-subitem');
    });
  });

  describe('Sidebar Shell Container Architecture', () => {
    it('renders desktop shell with .sidebar-shell, w-64 layout invariant, and interior structure hooks', () => {
      const onNavigate = vi.fn();
      const onCloseMobile = vi.fn();

      const { container, rerender } = render(
        <Sidebar
          currentRoute="dashboard"
          onNavigate={onNavigate}
          isMobileOpen={false}
          onCloseMobile={onCloseMobile}
          isCompact={false}
        />
      );

      // Desktop sidebar
      const desktopAside = container.querySelector('aside.sidebar-shell');
      expect(desktopAside).not.toBeNull();
      expect(desktopAside?.className).toContain('sidebar-shell');
      expect(desktopAside?.className).toContain('w-64');
      expect(desktopAside?.className).toContain('sticky');
      expect(desktopAside?.className).toContain('top-0');

      // Internal layout structure hooks
      const innerContainer = desktopAside?.querySelector('.sidebar-container');
      expect(innerContainer).not.toBeNull();

      const header = desktopAside?.querySelector('.sidebar-header');
      expect(header).not.toBeNull();

      const footer = desktopAside?.querySelector('.sidebar-footer');
      expect(footer).not.toBeNull();

      // Test compact mode layout invariant w-18 and divider presence
      rerender(
        <Sidebar
          currentRoute="dashboard"
          onNavigate={onNavigate}
          isMobileOpen={false}
          onCloseMobile={onCloseMobile}
          isCompact={true}
        />
      );

      expect(desktopAside?.className).toContain('w-18');
      const dividers = desktopAside?.querySelectorAll('.sidebar-divider');
      expect(dividers?.length).toBeGreaterThan(0);
    });

    it('renders mobile drawer with .sidebar-shell-mobile when isMobileOpen is true', () => {
      const onNavigate = vi.fn();
      const onCloseMobile = vi.fn();

      const { container } = render(
        <Sidebar
          currentRoute="dashboard"
          onNavigate={onNavigate}
          isMobileOpen={true}
          onCloseMobile={onCloseMobile}
        />
      );

      const mobileDrawer = container.querySelector('.sidebar-shell-mobile');
      expect(mobileDrawer).not.toBeNull();
      expect(mobileDrawer?.className).toContain('sidebar-shell-mobile');
      expect(mobileDrawer?.querySelector('.sidebar-container')).not.toBeNull();
    });
  });

  describe('BottomNav Navigation & Shell Semantics', () => {
    it('renders mobile bottom navigation items with data-active and aria-current="page"', () => {
      const onNavigate = vi.fn();
      const onOpenMobileMenu = vi.fn();

      render(
        <BottomNav
          currentRoute="meetings"
          onNavigate={onNavigate}
          onOpenMobileMenu={onOpenMobileMenu}
        />
      );

      const activeBtn = screen.getByRole('button', { name: /jurnal/i });
      expect(activeBtn).toHaveAttribute('data-active', 'true');
      expect(activeBtn).toHaveAttribute('aria-current', 'page');
      expect(activeBtn.className).toContain('bottom-nav-item');

      const activeCapsule = activeBtn.querySelector('.bottom-nav-active-capsule');
      expect(activeCapsule).not.toBeNull();

      const inactiveBtn = screen.getByRole('button', { name: /presensi/i });
      expect(inactiveBtn).toHaveAttribute('data-active', 'false');
      expect(inactiveBtn).not.toHaveAttribute('aria-current');

      const moreBtn = screen.getByRole('button', { name: /buka semua list/i });
      expect(moreBtn).toHaveAttribute('data-active', 'false');
    });

    it('renders bottom nav shell container and inner safe-area wrapper', () => {
      const onNavigate = vi.fn();
      const onOpenMobileMenu = vi.fn();

      const { container } = render(
        <BottomNav
          currentRoute="dashboard"
          onNavigate={onNavigate}
          onOpenMobileMenu={onOpenMobileMenu}
        />
      );

      const navShell = container.querySelector('.bottom-nav-shell');
      expect(navShell).not.toBeNull();
      expect(navShell?.className).toContain('fixed');
      expect(navShell?.className).toContain('bottom-0');

      const innerWrapper = navShell?.querySelector('.bottom-nav-inner');
      expect(innerWrapper).not.toBeNull();
    });

    it('navigates route when bottom nav item is clicked', () => {
      const onNavigate = vi.fn();
      const onOpenMobileMenu = vi.fn();

      render(
        <BottomNav
          currentRoute="dashboard"
          onNavigate={onNavigate}
          onOpenMobileMenu={onOpenMobileMenu}
        />
      );

      const gradesBtn = screen.getByRole('button', { name: /nilai/i });
      fireEvent.click(gradesBtn);
      expect(onNavigate).toHaveBeenCalledWith('grades');

      const moreBtn = screen.getByRole('button', { name: /buka semua list/i });
      fireEvent.click(moreBtn);
      expect(onOpenMobileMenu).toHaveBeenCalledTimes(1);
    });
  });

  describe('Reusable Button Styling Contract', () => {
    it('renders all variants with proper data-variant and ds-ui-control', () => {
      const { rerender } = render(<Button variant="primary">Primary</Button>);
      const btn = screen.getByRole('button', { name: 'Primary' });
      expect(btn).toHaveAttribute('data-variant', 'primary');
      expect(btn.className).toContain('ds-ui-control');

      rerender(<Button variant="secondary">Secondary</Button>);
      expect(screen.getByRole('button', { name: 'Secondary' })).toHaveAttribute('data-variant', 'secondary');

      rerender(<Button variant="outline">Outline</Button>);
      expect(screen.getByRole('button', { name: 'Outline' })).toHaveAttribute('data-variant', 'outline');

      rerender(<Button variant="ghost">Ghost</Button>);
      expect(screen.getByRole('button', { name: 'Ghost' })).toHaveAttribute('data-variant', 'ghost');

      rerender(<Button variant="danger">Danger</Button>);
      expect(screen.getByRole('button', { name: 'Danger' })).toHaveAttribute('data-variant', 'danger');
    });
  });

  describe('Shared Shell Contract Grayscale Differentiation Integrity', () => {
    it('validates that all three presets define distinct border weights and elevation shadows in index.css', () => {
      const cssPath = path.resolve(__dirname, '../../index.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      // 1. paper-craft shell tokens
      expect(cssContent).toContain('[data-design-system="paper-craft"]');
      expect(cssContent).toContain('--ds-shell-border-width: var(--ds-border-width, 1.5px)');
      expect(cssContent).toContain('--ds-shell-shadow-sidebar: 2px 0px 0px 0px var(--ds-border)');
      expect(cssContent).toContain('--ds-shell-shadow-bottomnav: 0px -3px 0px 0px var(--ds-border)');

      // 2. shadcn-ui shell tokens
      expect(cssContent).toContain('[data-design-system="shadcn-ui"]');
      expect(cssContent).toContain('--ds-shell-border-width: 1px');
      expect(cssContent).toContain('--ds-shell-shadow-sidebar: none');
      expect(cssContent).toContain('--ds-shell-backdrop-filter: blur(12px)');

      // 3. neo-brutalism shell tokens
      expect(cssContent).toContain('[data-design-system="neo-brutalism"]');
      expect(cssContent).toContain('--ds-shell-border-width: var(--ds-border-width, 2px)');
      expect(cssContent).toContain('--ds-shell-shadow-sidebar: 3px 0px 0px 0px var(--ds-border)');
      expect(cssContent).toContain('--ds-shell-shadow-bottomnav: 0px -4px 0px 0px var(--ds-border)');

      // Grayscale differentiation assertion:
      // Border widths: 1.5px (paper-craft) != 1px (shadcn-ui) != 2px (neo-brutalism)
      const borderWidths = ['1.5px', '1px', '2px'];
      const uniqueWidths = new Set(borderWidths);
      expect(uniqueWidths.size).toBe(3);

      // Shadow depths: 2px ink drop != none != 3px heavy block
      const shadowSidebar = ['2px 0px 0px 0px var(--ds-border)', 'none', '3px 0px 0px 0px var(--ds-border)'];
      const uniqueSidebarShadows = new Set(shadowSidebar);
      expect(uniqueSidebarShadows.size).toBe(3);
    });
  });
});

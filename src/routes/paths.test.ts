import { describe, expect, it } from 'vitest';
import { ROUTE_PATH_MAP, resolvePathToRouteKey, resolveRoutePath } from './paths';

describe('Route Paths & Mapping Utilities', () => {
  describe('ROUTE_PATH_MAP', () => {
    it('contains expected primary route destinations', () => {
      expect(ROUTE_PATH_MAP.dashboard).toBe('/dashboard');
      expect(ROUTE_PATH_MAP.teacher).toBe('/teacher/classes');
      expect(ROUTE_PATH_MAP.homeroom).toBe('/homeroom/students');
      expect(ROUTE_PATH_MAP.reports).toBe('/reports');
      expect(ROUTE_PATH_MAP.master).toBe('/master/classes');
      expect(ROUTE_PATH_MAP.settings).toBe('/settings/profile');
      expect(ROUTE_PATH_MAP.admin).toBe('/admin');
      expect(ROUTE_PATH_MAP.login).toBe('/login');
    });
  });

  describe('resolvePathToRouteKey', () => {
    it('resolves root and dashboard paths', () => {
      expect(resolvePathToRouteKey('/')).toBe('dashboard');
      expect(resolvePathToRouteKey('/dashboard')).toBe('dashboard');
      expect(resolvePathToRouteKey('/dashboard/')).toBe('dashboard');
    });

    it('resolves teacher workspace paths', () => {
      expect(resolvePathToRouteKey('/teacher')).toBe('teaching-classes');
      expect(resolvePathToRouteKey('/teacher/classes')).toBe('teaching-classes');
      expect(resolvePathToRouteKey('/teacher/schedule')).toBe('teaching-schedule');
      expect(resolvePathToRouteKey('/teacher/meetings')).toBe('meetings');
      expect(resolvePathToRouteKey('/teacher/attendance')).toBe('attendance-subject');
      expect(resolvePathToRouteKey('/teacher/grades')).toBe('grades');
    });

    it('resolves homeroom workspace paths', () => {
      expect(resolvePathToRouteKey('/homeroom')).toBe('homeroom-students');
      expect(resolvePathToRouteKey('/homeroom/dashboard')).toBe('homeroom-dashboard');
      expect(resolvePathToRouteKey('/homeroom/schedule')).toBe('homeroom-class-schedule');
      expect(resolvePathToRouteKey('/homeroom/teacher-attendance')).toBe('homeroom-teacher-attendance');
      expect(resolvePathToRouteKey('/homeroom/attendance-monthly')).toBe('homeroom-monthly-attendance');
      expect(resolvePathToRouteKey('/homeroom/attendance-daily')).toBe('homeroom-daily-attendance');
      expect(resolvePathToRouteKey('/homeroom/notes')).toBe('homeroom-notes');
    });

    it('resolves reports workspace paths', () => {
      expect(resolvePathToRouteKey('/reports')).toBe('reports-center');
      expect(resolvePathToRouteKey('/reports/rapor')).toBe('reports-rapor');
      expect(resolvePathToRouteKey('/reports/legger')).toBe('reports-legger');
      expect(resolvePathToRouteKey('/reports/grades')).toBe('reports-grades');
      expect(resolvePathToRouteKey('/reports/attendance')).toBe('reports-attendance');
      expect(resolvePathToRouteKey('/reports/journal')).toBe('reports-journal');
    });

    it('resolves master data paths', () => {
      expect(resolvePathToRouteKey('/master')).toBe('master-classes');
      expect(resolvePathToRouteKey('/master/classes')).toBe('master-classes');
      expect(resolvePathToRouteKey('/master/students')).toBe('master-students');
      expect(resolvePathToRouteKey('/master/subjects')).toBe('master-subjects');
      expect(resolvePathToRouteKey('/master/teaching')).toBe('master-teaching');
      expect(resolvePathToRouteKey('/master/years')).toBe('master-academic-years');
    });

    it('resolves settings paths', () => {
      expect(resolvePathToRouteKey('/settings')).toBe('settings-profile');
      expect(resolvePathToRouteKey('/settings/profile')).toBe('settings-profile');
      expect(resolvePathToRouteKey('/settings/school')).toBe('settings-school');
      expect(resolvePathToRouteKey('/settings/document')).toBe('settings-document');
      expect(resolvePathToRouteKey('/settings/backup')).toBe('settings-backup');
      expect(resolvePathToRouteKey('/settings/stats')).toBe('settings-stats');
      expect(resolvePathToRouteKey('/settings/preferences')).toBe('settings-preferences');
      expect(resolvePathToRouteKey('/settings/maintenance')).toBe('settings-maintenance');
    });

    it('resolves standalone paths and fallback route keys', () => {
      expect(resolvePathToRouteKey('/admin')).toBe('admin');
      expect(resolvePathToRouteKey('/login')).toBe('login');
      expect(resolvePathToRouteKey('/onboarding')).toBe('onboarding');
      expect(resolvePathToRouteKey('/custom-feature')).toBe('custom-feature');
    });
  });

  describe('resolveRoutePath', () => {
    it('returns path as-is if it already starts with a slash', () => {
      expect(resolveRoutePath('/dashboard')).toBe('/dashboard');
      expect(resolveRoutePath('/reports/legger')).toBe('/reports/legger');
    });

    it('resolves mapped legacy route keys to standardized URL paths', () => {
      expect(resolveRoutePath('dashboard')).toBe('/dashboard');
      expect(resolveRoutePath('teaching-classes')).toBe('/teacher/classes');
      expect(resolveRoutePath('grades')).toBe('/teacher/grades');
      expect(resolveRoutePath('reports-legger')).toBe('/reports/legger');
      expect(resolveRoutePath('settings-backup')).toBe('/settings/backup');
    });

    it('falls back to prefixing slash if key is not explicitly mapped', () => {
      expect(resolveRoutePath('unknown-view')).toBe('/unknown-view');
    });
  });
});

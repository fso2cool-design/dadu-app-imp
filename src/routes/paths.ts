/**
 * Route Dictionary and Path Resolution Utilities for DADU
 * Provides 100% backward compatibility between legacy route keys and modern URL paths.
 */

export const ROUTE_PATH_MAP: Record<string, string> = {
  // Dashboard
  dashboard: '/dashboard',
  
  // Teacher Workspace
  teacher: '/teacher/classes',
  teaching: '/teacher/classes',
  'teaching-classes': '/teacher/classes',
  'teaching-schedule': '/teacher/schedule',
  schedule: '/teacher/schedule',
  meetings: '/teacher/meetings',
  'attendance-subject': '/teacher/attendance',
  grades: '/teacher/grades',

  // Homeroom Workspace
  homeroom: '/homeroom/students',
  'homeroom-dashboard': '/homeroom/dashboard',
  'homeroom-students': '/homeroom/students',
  'homeroom-class-schedule': '/homeroom/schedule',
  'homeroom-schedule': '/homeroom/schedule',
  'homeroom-teacher-attendance': '/homeroom/teacher-attendance',
  'homeroom-attendance-teacher': '/homeroom/teacher-attendance',
  'homeroom-monthly-attendance': '/homeroom/attendance-monthly',
  'homeroom-attendance-monthly': '/homeroom/attendance-monthly',
  'homeroom-daily-attendance': '/homeroom/attendance-daily',
  'homeroom-attendance-daily': '/homeroom/attendance-daily',
  'homeroom-notes': '/homeroom/notes',

  // Reports Workspace
  reports: '/reports',
  'reports-center': '/reports',
  'reports-rapor': '/reports/rapor',
  'reports-legger': '/reports/legger',
  'reports-grades': '/reports/grades',
  'reports-attendance': '/reports/attendance',
  'reports-journal': '/reports/journal',

  // Master Data
  master: '/master/classes',
  'master-classes': '/master/classes',
  'master-students': '/master/students',
  'master-subjects': '/master/subjects',
  'master-teaching': '/master/teaching',
  'master-academic-years': '/master/years',

  // Settings
  settings: '/settings/profile',
  'settings-profile': '/settings/profile',
  'settings-school': '/settings/school',
  'settings-document': '/settings/document',
  'settings-backup': '/settings/backup',
  'settings-stats': '/settings/stats',
  'settings-preferences': '/settings/preferences',
  'settings-maintenance': '/settings/maintenance',

  // System & Administration
  admin: '/admin',
  login: '/login',
  onboarding: '/onboarding',
};

/**
 * Maps a URL pathname back to its internal legacy route key.
 * Used for active menu highlighting in Sidebar, AppLayout, and Hub tabs.
 */
export function resolvePathToRouteKey(pathname: string): string {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';

  if (cleanPath === '/' || cleanPath === '/dashboard') return 'dashboard';

  // Teacher Hub
  if (cleanPath === '/teacher' || cleanPath === '/teacher/classes') return 'teaching-classes';
  if (cleanPath === '/teacher/schedule') return 'teaching-schedule';
  if (cleanPath === '/teacher/meetings') return 'meetings';
  if (cleanPath === '/teacher/attendance') return 'attendance-subject';
  if (cleanPath === '/teacher/grades') return 'grades';

  // Homeroom Hub
  if (cleanPath === '/homeroom' || cleanPath === '/homeroom/students') return 'homeroom-students';
  if (cleanPath === '/homeroom/dashboard') return 'homeroom-dashboard';
  if (cleanPath === '/homeroom/schedule') return 'homeroom-class-schedule';
  if (cleanPath === '/homeroom/teacher-attendance') return 'homeroom-teacher-attendance';
  if (cleanPath === '/homeroom/attendance-monthly' || cleanPath === '/homeroom/attendance') return 'homeroom-monthly-attendance';
  if (cleanPath === '/homeroom/attendance-daily') return 'homeroom-daily-attendance';
  if (cleanPath === '/homeroom/notes') return 'homeroom-notes';

  // Reports Hub
  if (cleanPath === '/reports') return 'reports-center';
  if (cleanPath === '/reports/rapor') return 'reports-rapor';
  if (cleanPath === '/reports/legger') return 'reports-legger';
  if (cleanPath === '/reports/grades') return 'reports-grades';
  if (cleanPath === '/reports/attendance') return 'reports-attendance';
  if (cleanPath === '/reports/journal') return 'reports-journal';

  // Master Data
  if (cleanPath === '/master' || cleanPath === '/master/classes') return 'master-classes';
  if (cleanPath === '/master/students') return 'master-students';
  if (cleanPath === '/master/subjects') return 'master-subjects';
  if (cleanPath === '/master/teaching') return 'master-teaching';
  if (cleanPath === '/master/years') return 'master-academic-years';

  // Settings
  if (cleanPath === '/settings' || cleanPath === '/settings/profile') return 'settings-profile';
  if (cleanPath === '/settings/school') return 'settings-school';
  if (cleanPath === '/settings/document') return 'settings-document';
  if (cleanPath === '/settings/backup') return 'settings-backup';
  if (cleanPath === '/settings/stats') return 'settings-stats';
  if (cleanPath === '/settings/preferences') return 'settings-preferences';
  if (cleanPath === '/settings/maintenance') return 'settings-maintenance';

  // Standalone
  if (cleanPath === '/admin') return 'admin';
  if (cleanPath === '/login') return 'login';
  if (cleanPath === '/onboarding') return 'onboarding';

  // Fallback for custom or direct keys
  return cleanPath.replace(/^\//, '');
}

/**
 * Resolves a route key or direct path to a standardized URL path.
 */
export function resolveRoutePath(routeKeyOrPath: string): string {
  if (routeKeyOrPath.startsWith('/')) {
    return routeKeyOrPath;
  }
  return ROUTE_PATH_MAP[routeKeyOrPath] || `/${routeKeyOrPath}`;
}

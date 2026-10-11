import { test, expect } from '@playwright/test';
import { installNetworkGuard } from './helpers/networkGuard';

test.describe('Admin Route Authorization Guard E2E Verification', () => {
  let guard: Awaited<ReturnType<typeof installNetworkGuard>>;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(180000);

    // Suppress changelog popup in browser localStorage
    await page.addInitScript(() => {
      try {
        localStorage.setItem('dadu_seen_changelog_2.4.0-JRA', 'true');
      } catch {}
    });

    // Install fail-closed local-only network guard
    guard = await installNetworkGuard(page);
  });

  test.afterEach(async () => {
    // Assert no forbidden non-localhost network requests occurred
    guard.assertNoViolations();
  });

  test('denies authenticated standard teacher direct access to /admin and redirects cleanly to /dashboard', async ({ page }) => {
    // 1. Monitor Firestore data requests to verify that protected admin-only data queries are not triggered
    const protectedAdminDataRequests: string[] = [];
    const permissionErrors: string[] = [];

    page.on('request', (req) => {
      const url = req.url();
      const postData = req.postData() || '';
      // Target Firestore emulator (:8080) data operations, distinguishing them from Vite static asset loading (:5174)
      const isFirestoreDataCall = url.includes(':8080');
      if (isFirestoreDataCall && (url.includes('feedbacks') || postData.includes('feedbacks'))) {
        protectedAdminDataRequests.push(`${req.method()} ${url}`);
      }
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error' && (msg.text().includes('PERMISSION_DENIED') || msg.text().includes('permission-denied'))) {
        permissionErrors.push(msg.text());
      }
    });

    // 2. Direct navigation to protected admin route without touching intermediate menus
    await page.goto('/admin');

    // 3. Assert application's actual documented denial behavior:
    // When a standard teacher (adminStatus === 'not-admin', isAdmin === false) navigates to /admin,
    // App.tsx evaluates the route guard and executes <Navigate to="/dashboard" replace />.
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // 4. Assert the teacher workspace loads properly (confirming identity as authenticated standard teacher)
    await expect(page.locator('text=Ruang Guru').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Test Teacher, S.Pd.').first()).toBeVisible({ timeout: 15000 });

    // 5. Assert that the protected admin interface and its privileged controls are NOT accessible
    await expect(page.locator('h1:has-text("Panel Administrator")')).toHaveCount(0);
    await expect(page.locator('text=Kelola Akun Guru')).toHaveCount(0);
    await expect(page.locator('button:has-text("Pindai Data Yatim Piatu")')).toHaveCount(0);
    await expect(page.locator('text=Audit Sisa Data')).toHaveCount(0);
    await expect(page.locator('button:has-text("Sweep Sisa Residu")')).toHaveCount(0);
    await expect(page.locator('text=Audit Residu Akun Yatim')).toHaveCount(0);

    // 6. Verify that the header profile dropdown does not offer the "Panel Administrator" affordance
    // (In Header.tsx, {isAdmin && onOpenAdminPanel && ...} is guarded by isAdmin)
    const profileTrigger = page.locator('button[title="Menu Akun"]').or(page.locator('button:has-text("Test Teacher")')).first();
    if (await profileTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      await profileTrigger.click();
      await expect(page.locator('button:has-text("Panel Administrator")')).toHaveCount(0);
      // Close dropdown by clicking elsewhere or pressing Escape
      await page.keyboard.press('Escape');
    }

    // 7. Reload the route and verify the authorization barrier remains strictly effective
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.locator('text=Ruang Guru').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('h1:has-text("Panel Administrator")')).toHaveCount(0);

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.locator('text=Ruang Guru').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('h1:has-text("Panel Administrator")')).toHaveCount(0);

    // 8. Verify protected admin data queries were never triggered
    expect(protectedAdminDataRequests).toEqual([]);
    expect(permissionErrors).toEqual([]);
  });
});

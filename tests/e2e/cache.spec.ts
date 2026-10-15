import { test, expect } from '@playwright/test';
import { installNetworkGuard } from './helpers/networkGuard';

test.describe('App and Cache Validation', () => {
  let guard: Awaited<ReturnType<typeof installNetworkGuard>>;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(180000);
    // Suppress changelog popup in browser localStorage
    await page.addInitScript(() => {
      try {
        localStorage.setItem('dadu_seen_changelog_2.4.0-JRA', 'true');
      } catch {}
    });
    // Install fail-closed local network guard
    guard = await installNetworkGuard(page);
  });

  test.afterEach(async () => {
    // Assert no forbidden external requests occurred
    guard.assertNoViolations();
  });

  test('Aplikasi dapat dibuka dan autentikasi dummy berhasil', async ({ page }) => {
    // 1. Visit Dashboard directly via restored session
    await page.goto('/dashboard');

    // We expect the app to load dashboard correctly since storageState is restored
    await expect(page.locator('h1:has-text("Selamat")')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Test Teacher, S.Pd.').first()).toBeVisible({ timeout: 15000 });

    // 2. Navigate to Teacher Hub
    await page.goto('/teacher');

    // Check if Teacher Hub loads correctly
    await expect(page.locator('text=Ruang Guru')).toBeVisible();

    // 3. Verify Firestore data is loaded by checking if the class names exist
    await expect(page.locator('p:has-text("Kelas X-A")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('p:has-text("Kelas X-B")')).toBeVisible();
  });
});

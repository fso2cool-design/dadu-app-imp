import { test, expect } from '@playwright/test';

test.describe('App and Cache Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Playwright storageState does not preserve IndexedDB (used by Firebase Auth).
    // So we need to log in explicitly using the account created by auth.setup.ts.
    await page.goto('/login');
    await page.fill('input[id="auth-email"]', 'teacher@example.com');
    await page.fill('input[id="auth-password"]', 'password123');
    await page.click('button:has-text("Masuk ke Akun")');

    // Wait for Dashboard to load to confirm login success
    await expect(page.locator('h1:has-text("Selamat")')).toBeVisible({ timeout: 15000 });

    // Dismiss Changelog modal if it appears
    const changelogButton = page.locator('button:has-text("Mengerti & Lanjutkan")');
    if (await changelogButton.isVisible()) {
      await changelogButton.click();
    }
  });

  test('Aplikasi dapat dibuka dan autentikasi dummy berhasil', async ({ page }) => {
    // 1. Visit Dashboard (already there from beforeEach, but we can verify)
    await page.goto('/dashboard');

    // We expect the app to load dashboard correctly since storageState is loaded.
    await expect(page.locator('h1:has-text("Selamat")')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Test Teacher, S.Pd.').first()).toBeVisible({ timeout: 15000 });

    // 2. Navigate to Teacher Hub (which contains SubjectAttendancePage eventually)
    await page.goto('/teacher');

    // Check if Teacher Hub loads correctly
    await expect(page.locator('text=Ruang Guru')).toBeVisible();

    // 3. Verify Firestore data is loaded by checking if the class names exist
    // The onboarding creates X-A, X-B, XI-1, XII-1.
    await expect(page.locator('p:has-text("Kelas X-A")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('p:has-text("Kelas X-B")')).toBeVisible();
  });
});

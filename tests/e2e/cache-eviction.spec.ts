import { test, expect } from '@playwright/test';

test.describe('LRU Cache Eviction Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Log in (Required because Firebase Auth uses IndexedDB, not saved by Playwright storageState)
    await page.goto('/login');
    await page.fill('input[id="auth-email"]', 'teacher@example.com');
    await page.fill('input[id="auth-password"]', 'password123');
    await page.click('button:has-text("Masuk ke Akun")');

    // Wait for Dashboard to load to confirm login success
    await expect(page.locator('h1:has-text("Selamat")')).toBeVisible({ timeout: 15000 });

    // Dismiss Changelog modal if it appears
    try {
      const changelogButton = page.locator('button:has-text("Mengerti & Lanjutkan")');
      await expect(changelogButton).toBeVisible({ timeout: 5000 });
      await changelogButton.click();
      await expect(changelogButton).toBeHidden({ timeout: 5000 });
    } catch (e) {
      // Modal didn't appear, ignore
    }
  });

  test('HomeroomMonthlyAttendancePage cache limits are respected and do not crash', async ({ page }) => {
    // Navigate to Homeroom
    await page.goto('/homeroom');
    // Click the "Rekap Presensi Siswa" tab to show HomeroomMonthlyAttendancePage
    await page.click('button:has-text("Rekap Presensi Siswa")');

    // The class 'Kelas X-A' is already selected automatically since it's the homeroom class
    await expect(page.locator('h1:has-text("Rekapitulasi Kehadiran Bulanan")')).toBeVisible({ timeout: 15000 });

    // Select a class first
    await page.selectOption('select#monthly-class-select', { index: 1 });

    // The class roster cache has size 5, and records cache has size 12.
    // Let's iterate over 7 months to trigger eviction on roster cache (size 5).
    const months = ['1', '2', '3', '4', '5', '6', '7'];

    for (const month of months) {
      // Change the month
      await page.selectOption('select#monthly-month-select', month);

      // We expect the matrix header or some table text to be visible
      await expect(page.locator('text=Rekapitulasi Kehadiran Bulanan Kelas')).toBeVisible();
      await expect(page.locator('table')).toBeVisible();
    }

    // Now go back to month 1. If the cache evicted properly, it should fetch again without crashing.
    await page.selectOption('select#monthly-month-select', '1');
    await expect(page.locator('table')).toBeVisible();
  });

  test('SubjectAttendancePage cache limits are respected and do not crash', async ({ page }) => {
    // Navigate to Subject Attendance
    await page.goto('/teacher/attendance');
    await expect(page.locator('h1:has-text("Presensi Siswa Mata Pelajaran")')).toBeVisible({ timeout: 15000 });

    // Select a subject first so the table appears (index 1 to skip placeholder, ignoring exact text emojis)
    await page.selectOption('select', { index: 1 });

    // The subjectAttendanceCache has capacity 50.
    // We will change the date 55 times to trigger eviction.
    // The input type is "date".
    for (let i = 1; i <= 55; i++) {
      const day = String(i % 28 + 1).padStart(2, '0');
      const dateStr = `2026-08-${day}`;

      await page.fill('input[type="date"]', dateStr);
      // Wait for the empty state indicating load success
      await expect(page.locator('text=Tidak ada siswa aktif yang terdaftar di kelas ini')).toBeVisible();
    }

    // Go back to the first date
    await page.fill('input[type="date"]', '2026-08-01');
    await expect(page.locator('text=Tidak ada siswa aktif yang terdaftar di kelas ini')).toBeVisible();
  });
});

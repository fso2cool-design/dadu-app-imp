import { test as setup, expect, type Page } from '@playwright/test';
import path from 'path';
import { installNetworkGuard } from './helpers/networkGuard';

const authFile = path.resolve('tests/e2e/.auth/user.json');

async function completeOnboarding(page: Page) {
  await expect(page.locator('h2:has-text("1. Data Profil Guru")')).toBeVisible({ timeout: 15000 });
  await page.fill('input[placeholder*="Contoh: Ahmad Dahlan"]', 'Test Teacher, S.Pd.');
  await page.click('button:has-text("Lanjut")');

  // Step 2: School Identity
  await expect(page.locator('h2:has-text("2. Identitas Madrasah")')).toBeVisible({ timeout: 10000 });
  await page.fill('input[placeholder*="Contoh: MAN 1 Model"]', 'MAN 1 Test');
  await page.fill('input[placeholder*="Drs. H. Syukri"]', 'Test Headmaster');
  await page.click('button:has-text("Lanjut")');

  // Step 3: Academic Year
  await expect(page.locator('h2:has-text("3. Tahun Ajaran")')).toBeVisible({ timeout: 10000 });
  await page.fill('input[placeholder="2026/2027"]', '2026/2027');
  await page.click('button:has-text("Lanjut")');

  // Step 4: Classes
  await expect(page.locator('h2:has-text("4. Daftar Rombongan Belajar")')).toBeVisible({ timeout: 10000 });
  await page.click('button:has-text("Lanjut")');

  // Step 5: Subjects
  await expect(page.locator('h2:has-text("5. Mata Pelajaran")')).toBeVisible({ timeout: 10000 });
  await page.fill('input[placeholder*="Kode (misal: ENG"]', 'TST');
  await page.fill('input[placeholder*="Nama Mapel"]', 'Testing Subject');
  await page.click('button:has-text("Lanjut")');

  // Step 6: Link Classes and Subjects
  await expect(page.locator('h2:has-text("6. Hubungkan Kelas")')).toBeVisible({ timeout: 10000 });
  await page.click('button:has-text("Selesaikan & Mulai Bekerja")');

  // Wait for Dashboard
  await expect(page.locator('text=Ruang Guru').first()).toBeVisible({ timeout: 15000 });
}

setup('authenticate and onboard', async ({ page }) => {
  // Suppress changelog popup in browser localStorage
  await page.addInitScript(() => {
    try {
      localStorage.setItem('dadu_seen_changelog_2.4.0-JRA', 'true');
    } catch {}
  });

  const guard = await installNetworkGuard(page);
  const email = 'teacher@example.com';

  // Navigate to login page
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Try to login first
  await page.fill('input[id="auth-email"]', email);
  await page.fill('input[id="auth-password"]', 'password123');
  await page.click('button:has-text("Masuk ke Akun")');

  // Check if we reached dashboard, onboarding, or login failed
  try {
    await expect(page.locator('text=Ruang Guru').first()).toBeVisible({ timeout: 5000 });
    console.log("User already exists, onboarded, and logged in.");
  } catch (e) {
    const onboardingStep1 = page.locator('h2:has-text("1. Data Profil Guru")');
    if (await onboardingStep1.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log("User logged in but needs onboarding. Completing onboarding wizard...");
      await completeOnboarding(page);
    } else {
      console.log("Login failed. Attempting signup...");
      await page.click('button:has-text("Daftar Sekarang")');

      await page.fill('input[id="signup-first-name"]', 'Test');
      await page.fill('input[id="auth-email"]', email);
      await page.fill('input[id="auth-password"]', 'password123');
      await page.fill('input[id="signup-confirm-password"]', 'password123');
      await page.click('button:has-text("Daftarkan Akun Baru")');

      await completeOnboarding(page);
    }
  }

  // Dismiss Changelog modal if it appears
  const changelogButton = page.locator('button:has-text("Mengerti & Lanjutkan")');
  if (await changelogButton.isVisible()) {
    await changelogButton.click();
  }

  // Save storage state for all tests to use
  await page.context().storageState({ path: authFile });
  guard.assertNoViolations();
});

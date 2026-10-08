import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.resolve('tests/e2e/.auth/user.json');

setup('authenticate and onboard', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login');

  // Choose Sign Up mode
  await page.click('button:has-text("Daftar Sekarang")');

  // Fill Sign up form with a constant email (emulator is fresh every time)
  const email = 'teacher@example.com';
  await page.fill('input[id="signup-first-name"]', 'Test');
  await page.fill('input[id="auth-email"]', email);
  await page.fill('input[id="auth-password"]', 'password123');
  await page.fill('input[id="signup-confirm-password"]', 'password123');

  await page.click('button:has-text("Daftarkan Akun Baru")');

  // Wait for Onboarding Wizard Step 1 to appear
  await expect(page.locator('h2:has-text("1. Data Profil Guru")')).toBeVisible({ timeout: 15000 });

  await page.fill('input[placeholder*="Contoh: Ahmad Dahlan"]', 'Test Teacher, S.Pd.');
  await page.click('button:has-text("Lanjut")');

  // Step 2: School Identity
  await expect(page.locator('h2:has-text("2. Identitas Madrasah")')).toBeVisible();
  await page.fill('input[placeholder*="Contoh: MAN 1 Model"]', 'MAN 1 Test');
  await page.fill('input[placeholder*="Drs. H. Syukri"]', 'Test Headmaster');
  await page.click('button:has-text("Lanjut")');

  // Step 3: Academic Year
  await expect(page.locator('h2:has-text("3. Tahun Ajaran")')).toBeVisible();
  await page.fill('input[placeholder="2026/2027"]', '2026/2027');
  await page.click('button:has-text("Lanjut")');

  // Step 4: Classes (Preset MA/SMA is used by default)
  await expect(page.locator('h2:has-text("4. Daftar Rombongan Belajar")')).toBeVisible();
  await page.click('button:has-text("Lanjut")');

  // Step 5: Subjects
  await expect(page.locator('h2:has-text("5. Mata Pelajaran")')).toBeVisible();
  await page.fill('input[placeholder*="Kode (misal: ENG"]', 'TST');
  await page.fill('input[placeholder*="Nama Mapel"]', 'Testing Subject');
  await page.click('button:has-text("Lanjut")');

  // Step 6: Link Classes and Subjects
  await expect(page.locator('h2:has-text("6. Hubungkan Kelas")')).toBeVisible();
  await page.click('button:has-text("Selesaikan & Mulai Bekerja")');

  // Wait for Dashboard to load successfully by checking heading
  await expect(page.locator('h1:has-text("Selamat")')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('text=Test Teacher, S.Pd.').first()).toBeVisible();

  // Dismiss Changelog modal if it appears
  const changelogButton = page.locator('button:has-text("Mengerti & Lanjutkan")');
  if (await changelogButton.isVisible()) {
    await changelogButton.click();
  }

  // Save storage state for all tests to use
  await page.context().storageState({ path: authFile });
});

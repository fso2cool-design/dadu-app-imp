import { test, expect } from "@playwright/test";
import { installNetworkGuard } from "./helpers/networkGuard";

test.describe("Attendance Browser History Guard (Back/Forward Protection)", () => {
  let guard: Awaited<ReturnType<typeof installNetworkGuard>>;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(180000);
    // Suppress changelog popup in browser localStorage
    await page.addInitScript(() => {
      try {
        localStorage.setItem("dadu_seen_changelog_2.4.0-JRA", "true");
      } catch {}
    });
    // Install fail-closed local network guard
    guard = await installNetworkGuard(page);
  });

  test.afterEach(async () => {
    // Assert no forbidden external requests occurred
    guard.assertNoViolations();
  });

  test("0. Persiapan data: Tambahkan siswa contoh jika kelas masih kosong", async ({
    page,
  }) => {
    await page.goto("/master");
    await expect(
      page.locator('h1:has-text("Data Master Madrasah")'),
    ).toBeVisible({ timeout: 15000 });

    await page.click('button:has-text("Data Siswa Terpadu")');
    await expect(page.locator("text=Master Data Siswa & Rombel")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.locator("table tbody tr").first().or(page.locator("text=Belum Ada Data Siswa")),
    ).toBeVisible({ timeout: 15000 });

    const currentCount = await page.locator("table tbody tr").count();
    if (currentCount === 0) {
      await page.click('button:has-text("Tambah Siswa")');
      const modal = page.locator('h3:has-text("Tambah Siswa Baru")');
      await expect(modal).toBeVisible({ timeout: 10000 });

      const nameInput = page.locator(
        'input[placeholder="Contoh: Muhammad Farhan"]',
      );
      const nisInput = page.locator('input[placeholder="20261001"]');
      await nameInput.fill("Siswa Sintetis 01");
      await nisInput.fill("20261001");

      await page
        .locator('button[type="submit"]:has-text("Tambah Siswa")')
        .click();
      await expect(modal).toBeHidden({ timeout: 10000 });
      await expect(page.locator("table tbody tr").first()).toBeVisible({
        timeout: 10000,
      });
    }
  });

  test("1. Form presensi bersih: Back berjalan normal tanpa modal", async ({
    page,
  }) => {
    // 1. Start from Dashboard
    await page.goto("/dashboard");
    await expect(page.locator("text=Ruang Guru").first()).toBeVisible({
      timeout: 10000,
    });

    // 2. Client-side navigate to Subject Attendance via Dashboard shortcut
    await page.click('button:has-text("+ Presensi Sesi")');
    await expect(
      page.locator('h1:has-text("Presensi Siswa Mata Pelajaran")'),
    ).toBeVisible({ timeout: 15000 });

    // Form is clean (no changes made)
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).not.toBeVisible();

    // 3. Perform browser Back
    await page.goBack();

    // 4. Verification: Back proceeds to Dashboard without confirmation modal
    await expect(modal).not.toBeVisible();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("2. Form presensi dirty: Back memunculkan dialog konfirmasi", async ({
    page,
  }) => {
    // 1. Start from Dashboard then client-side navigate to Subject Attendance
    await page.goto("/dashboard");
    await expect(page.locator("text=Ruang Guru").first()).toBeVisible({
      timeout: 10000,
    });

    await page.click('button:has-text("+ Presensi Sesi")');
    await expect(
      page.locator('h1:has-text("Presensi Siswa Mata Pelajaran")'),
    ).toBeVisible({ timeout: 15000 });

    // 2. Modify an attendance record to make form dirty
    const studentRows = page.locator("table tbody tr");
    await expect(studentRows.first()).toBeVisible({ timeout: 10000 });

    // Change first student's status to 'A' (Absent)
    await studentRows.first().locator('button:has-text("A")').click();
    await expect(page.locator("text=Perubahan belum disimpan")).toBeVisible();

    // 3. Trigger browser Back
    await page.goBack();

    // 4. Verification: Confirmation modal appears and URL remains on /teacher/attendance
    const modal = page.locator('div[role="dialog"]');
    await expect(
      modal.locator('h3:has-text("Presensi Siswa Belum Disimpan")'),
    ).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/teacher\/attendance/);
  });

  test("3. Batal pada dialog konfirmasi: tetap pada URL dan mempertahankan input", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page.locator("text=Ruang Guru").first()).toBeVisible({
      timeout: 10000,
    });

    await page.click('button:has-text("+ Presensi Sesi")');
    await expect(
      page.locator('h1:has-text("Presensi Siswa Mata Pelajaran")'),
    ).toBeVisible({ timeout: 15000 });

    // Make form dirty
    const studentRows = page.locator("table tbody tr");
    await expect(studentRows.first()).toBeVisible({ timeout: 10000 });
    await studentRows.first().locator('button:has-text("A")').click();
    await expect(page.locator("text=Perubahan belum disimpan")).toBeVisible();

    // Trigger browser Back
    await page.goBack();

    // Modal appears
    const modal = page.locator('div[role="dialog"]');
    await expect(
      modal.locator('h3:has-text("Presensi Siswa Belum Disimpan")'),
    ).toBeVisible({ timeout: 5000 });

    // Click "Batal"
    await modal.locator('button:has-text("Batal")').click();

    // Verification: Modal closed, user remains on attendance page with dirty input intact
    await expect(modal).not.toBeVisible();
    await expect(page).toHaveURL(/\/teacher\/attendance/);
    await expect(page.locator("text=Perubahan belum disimpan")).toBeVisible();
  });

  test("4. Buang perubahan: Back dilanjutkan tepat satu kali", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page.locator("text=Ruang Guru").first()).toBeVisible({
      timeout: 10000,
    });

    await page.click('button:has-text("+ Presensi Sesi")');
    await expect(
      page.locator('h1:has-text("Presensi Siswa Mata Pelajaran")'),
    ).toBeVisible({ timeout: 15000 });

    // Make form dirty
    const studentRows = page.locator("table tbody tr");
    await expect(studentRows.first()).toBeVisible({ timeout: 10000 });
    await studentRows.first().locator('button:has-text("A")').click();
    await expect(page.locator("text=Perubahan belum disimpan")).toBeVisible();

    // Trigger browser Back
    await page.goBack();

    // Modal appears
    const modal = page.locator('div[role="dialog"]');
    await expect(
      modal.locator('h3:has-text("Presensi Siswa Belum Disimpan")'),
    ).toBeVisible({ timeout: 5000 });

    // Click "Buang Perubahan"
    await modal.locator('button:has-text("Buang Perubahan")').click();

    // Verification: Modal closes and navigation proceeds back to /dashboard
    await expect(modal).not.toBeVisible();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("5. Simpan gagal: navigasi tertahan dan input tidak hilang", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page.locator("text=Ruang Guru").first()).toBeVisible({
      timeout: 10000,
    });

    await page.click('button:has-text("+ Presensi Sesi")');
    await expect(
      page.locator('h1:has-text("Presensi Siswa Mata Pelajaran")'),
    ).toBeVisible({ timeout: 15000 });

    // Make form dirty
    const studentRows = page.locator("table tbody tr");
    await expect(studentRows.first()).toBeVisible({ timeout: 10000 });
    await studentRows.first().locator('button:has-text("A")').click();
    await expect(page.locator("text=Perubahan belum disimpan")).toBeVisible();

    // Trigger browser Back
    await page.goBack();

    // Modal appears
    const modal = page.locator('div[role="dialog"]');
    await expect(
      modal.locator('h3:has-text("Presensi Siswa Belum Disimpan")'),
    ).toBeVisible({ timeout: 5000 });

    // Intercept/abort local Firestore emulator save requests to simulate network failure
    await page.route(/.*:8080\/.*/, (route) => route.abort('failed'));

    // Click "Simpan Presensi" inside modal
    await modal.locator('button:has-text("Simpan Presensi")').click();

    // Verification: Navigation is blocked, stays on /teacher/attendance, input is preserved
    await expect(page).toHaveURL(/\/teacher\/attendance/);
    await expect(page.locator("text=Perubahan belum disimpan")).toBeVisible();
  });

  test("6. Navigasi halaman non-presensi tetap berfungsi", async ({ page }) => {
    // 1. Visit /dashboard
    await page.goto("/dashboard");
    await expect(page.locator("text=Ruang Guru").first()).toBeVisible({
      timeout: 10000,
    });

    // 2. Navigate to /master
    await page.goto("/master");
    await expect(
      page.locator('h1:has-text("Data Master Madrasah")'),
    ).toBeVisible({ timeout: 10000 });

    // 3. Browser Back to /dashboard
    await page.goBack();
    await expect(page).toHaveURL(/\/dashboard/);

    // 4. Browser Forward to /master
    await page.goForward();
    await expect(page).toHaveURL(/\/master/);
  });
});

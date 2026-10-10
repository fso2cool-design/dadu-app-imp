import { test, expect } from '@playwright/test';
import { installNetworkGuard } from './helpers/networkGuard';

test.describe('Subject Attendance Consolidation & Meeting Linking (AC-1 to AC-13)', () => {
  let guard: Awaited<ReturnType<typeof installNetworkGuard>>;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(180000);

    // Suppress changelog popup in browser localStorage
    await page.addInitScript(() => {
      try {
        localStorage.setItem('dadu_seen_changelog_2.4.0-JRA', 'true');
      } catch {}
    });

    // G3: Install fail-closed network guard before first navigation
    guard = await installNetworkGuard(page);

    // Login with seeded test teacher
    await page.goto('/login');
    await page.fill('input[id="auth-email"]', 'teacher@example.com');
    await page.fill('input[id="auth-password"]', 'password123');
    await page.click('button:has-text("Masuk ke Akun")');

    // Wait for Dashboard
    await expect(page.locator('text=Ruang Guru').first()).toBeVisible({ timeout: 15000 });

    try {
      const changelogButton = page.locator('button:has-text("Mengerti & Lanjutkan")');
      if (await changelogButton.isVisible({ timeout: 2000 })) {
        await changelogButton.click();
      }
    } catch {
      // Ignored if changelog modal not present
    }
  });

  test.afterEach(async () => {
    // Assert no forbidden external requests occurred
    guard.assertNoViolations();
  });

  test('G2: Baseline seeding of exactly 19 synthetic students in test class', async ({ page }) => {
    test.setTimeout(180000);

    await page.goto('/master');
    await expect(page.locator('h1:has-text("Data Master Madrasah")')).toBeVisible({ timeout: 15000 });

    await page.click('button:has-text("Data Siswa Terpadu")');
    await expect(page.locator('text=Master Data Siswa & Rombel')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    const currentCount = await page.locator('table tbody tr').count();

    if (currentCount < 19) {
      for (let i = currentCount + 1; i <= 19; i++) {
        await page.click('button:has-text("Tambah Siswa")');
        const modal = page.locator('h3:has-text("Tambah Siswa Baru")');
        await expect(modal).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(400);

        const padIndex = String(i).padStart(2, '0');
        const nameInput = page.locator('input[placeholder="Contoh: Muhammad Farhan"]');
        const nisInput = page.locator('input[placeholder="20261001"]');

        await nameInput.click();
        await nameInput.fill(`Siswa Sintetis ${padIndex}`);
        await expect(nameInput).toHaveValue(`Siswa Sintetis ${padIndex}`, { timeout: 3000 });

        await nisInput.click();
        await nisInput.fill(`202610${padIndex}`);
        await expect(nisInput).toHaveValue(`202610${padIndex}`, { timeout: 3000 });

        await page.locator('button[type="submit"]:has-text("Tambah Siswa")').click();
        await expect(modal).toBeHidden({ timeout: 10000 });
        await page.waitForTimeout(300);
      }
    }

    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });
    const finalCount = await page.locator('table tbody tr').count();
    expect(finalCount).toBeGreaterThanOrEqual(19);
  });

  test('AC-1 to AC-6 & AC-12: Complete lifecycle — 19-student distribution, link, move, same-link save, unlink, and discard', async ({ page }) => {
    test.setTimeout(180000);

    const dayNumber = String((Date.now() % 25) + 1).padStart(2, '0');
    const testDate = `2026-10-${dayNumber}`;
    const topicA = `KBM A ${Date.now()}`;
    const topicB = `KBM B ${Date.now()}`;

    // 1. Create Meeting A in Journal
    await page.goto('/teacher/meetings');
    await expect(page.locator('h1:has-text("Agenda & Jurnal Mengajar")')).toBeVisible({ timeout: 15000 });
    await page.locator('select').first().selectOption({ index: 0 });

    const createBtn = page.locator('button:has-text("Catat Pertemuan Baru"), button:has-text("Catat Pertemuan Pertama")').first();
    await createBtn.click();
    await expect(page.locator('h3:has-text("Catat Jurnal Agenda Baru")')).toBeVisible({ timeout: 10000 });
    await page.fill('input[type="date"]', testDate);
    await page.fill('input[placeholder^="Contoh"]', topicA);
    await page.click('button:has-text("Simpan Jurnal Agenda")');
    await expect(page.locator('h3:has-text("Catat Jurnal Agenda Baru")')).toBeHidden({ timeout: 10000 });

    // 2. Create Meeting B in Journal on same date
    const createBtn2 = page.locator('button:has-text("Catat Pertemuan Baru"), button:has-text("Catat Pertemuan Pertama")').first();
    await createBtn2.click();
    await expect(page.locator('h3:has-text("Catat Jurnal Agenda Baru")')).toBeVisible({ timeout: 10000 });
    await page.fill('input[type="date"]', testDate);
    await page.fill('input[placeholder^="Contoh"]', topicB);
    await page.click('button:has-text("Simpan Jurnal Agenda")');
    await expect(page.locator('h3:has-text("Catat Jurnal Agenda Baru")')).toBeHidden({ timeout: 10000 });

    // 3. Record attendance for 19 students independently (unlinked):
    // Distribution: 15 Hadir (H), 1 Sakit (S), 2 Izin (I), 1 Alpa (A)
    await page.goto('/teacher/attendance');
    await expect(page.locator('h1:has-text("Presensi Siswa Mata Pelajaran")')).toBeVisible({ timeout: 15000 });

    await page.locator('select').first().selectOption({ index: 0 });
    await page.fill('input[type="date"]', testDate);
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('table tbody tr')).toHaveCount(19, { timeout: 15000 });

    // Explicitly set unlinked
    const meetingSelect = page.locator('select').nth(1);
    await meetingSelect.selectOption({ value: '' });

    // First click "Set Semua Hadir (H)" so baseline is present
    await page.click('button:has-text("Set Semua Hadir (H)")');

    // Customize the 19 students:
    // Rows 0 to 14: Hadir (H) [15 students]
    // Row 15: Sakit (S) [1 student]
    // Row 16, 17: Izin (I) [2 students]
    // Row 18: Alpa (A) [1 student]
    const rows = page.locator('table tbody tr');
    await rows.nth(15).locator('button:has-text("S")').click();
    await rows.nth(16).locator('button:has-text("I")').click();
    await rows.nth(17).locator('button:has-text("I")').click();
    await rows.nth(18).locator('button:has-text("A")').click();

    // Verify live counters
    await expect(page.locator('text=15/19 Hadir')).toBeVisible();
    await expect(page.locator('text=Hadir (H)').locator('..').locator('text=15')).toBeVisible();
    await expect(page.locator('text=Sakit (S)').locator('..').locator('text=1')).toBeVisible();
    await expect(page.locator('text=Izin (I)').locator('..').locator('text=2')).toBeVisible();
    await expect(page.locator('text=Alpa (A)').locator('..').locator('text=1')).toBeVisible();

    // Save initial attendance (unlinked)
    const saveButton = page.locator('button:has-text("Simpan Presensi")');
    await saveButton.click();
    await expect(page.locator('text=Presensi siswa berhasil disimpan ke database!')).toBeVisible({ timeout: 10000 });

    // 4. AC-1: Buka dari Jurnal -> Data lama tetap utuh persis (15 H, 1 S, 2 I, 1 A)
    await page.goto('/teacher/meetings');
    await expect(page.locator('h1:has-text("Agenda & Jurnal Mengajar")')).toBeVisible({ timeout: 15000 });

    const cardA = page.locator('h3', { hasText: topicA }).locator('xpath=ancestor::div[contains(@class, "group")]');
    await expect(cardA).toBeVisible({ timeout: 10000 });
    await cardA.locator('button:has-text("Presensi")').click();

    // Canonical navigation opens SubjectAttendancePage with context
    await expect(page.locator('h1:has-text("Presensi Siswa Mata Pelajaran")')).toBeVisible({ timeout: 10000 });
    // AC-12: "Ke Jurnal" button is visible
    await expect(page.locator('button:has-text("Ke Jurnal")')).toBeVisible();

    // AC-1 Check exact distribution
    await expect(page.locator('text=15/19 Hadir')).toBeVisible();
    await expect(page.locator('text=Hadir (H)').locator('..').locator('text=15')).toBeVisible();
    await expect(page.locator('text=Sakit (S)').locator('..').locator('text=1')).toBeVisible();
    await expect(page.locator('text=Izin (I)').locator('..').locator('text=2')).toBeVisible();
    await expect(page.locator('text=Alpa (A)').locator('..').locator('text=1')).toBeVisible();

    // 5. AC-2: Batal tanpa penulisan
    // Change a student status to test dirty modal
    await rows.nth(0).locator('button:has-text("A")').click();
    await expect(page.locator('text=Perubahan belum disimpan')).toBeVisible();
    await page.click('button:has-text("Ke Jurnal")');

    // Unsaved changes modal appears
    await expect(page.locator('h3:has-text("Presensi Siswa Belum Disimpan")')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Buang Perubahan")');

    // Back in journal, verify cardA still says "Presensi Belum Diisi" (no mutation written)
    await expect(page.locator('h1:has-text("Agenda & Jurnal Mengajar")')).toBeVisible({ timeout: 15000 });
    const cardA_after = page.locator('h3', { hasText: topicA }).locator('xpath=ancestor::div[contains(@class, "group")]');
    await expect(cardA_after.locator('text=Presensi Belum Diisi')).toBeVisible({ timeout: 10000 });

    // 6. AC-3: Penautan pertama (Link to Meeting A)
    await cardA_after.locator('button:has-text("Presensi")').click();
    await expect(page.locator('h1:has-text("Presensi Siswa Mata Pelajaran")')).toBeVisible({ timeout: 10000 });

    // Link to Meeting A (index 1 in dropdown)
    await page.locator('select').nth(1).selectOption({ index: 1 });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await expect(page.locator('text=Presensi siswa berhasil disimpan ke database!')).toBeVisible({ timeout: 10000 });

    // Back to journal to verify Meeting A has summary
    await page.click('button:has-text("Ke Jurnal")');
    await expect(page.locator('h1:has-text("Agenda & Jurnal Mengajar")')).toBeVisible({ timeout: 15000 });
    await expect(cardA_after.locator('text=15 Hadir')).toBeVisible({ timeout: 10000 });
    await expect(cardA_after.locator('text=• 1 S')).toBeVisible();
    await expect(cardA_after.locator('text=• 2 I')).toBeVisible();
    await expect(cardA_after.locator('text=• 1 A')).toBeVisible();

    // 7. AC-4: Simpan ulang pada meeting yang sama mempertahankan ringkasan
    await cardA_after.locator('button:has-text("Presensi")').click();
    await expect(page.locator('h1:has-text("Presensi Siswa Mata Pelajaran")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Tertaut ke Jurnal Mengajar')).toBeVisible({ timeout: 10000 });
    // Add a note to trigger dirty state
    await rows.nth(0).locator('input[placeholder="Keterangan..."]').fill('Catatan Kehadiran Siswa 1');
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await expect(page.locator('text=Presensi siswa berhasil disimpan ke database!')).toBeVisible({ timeout: 10000 });

    await page.click('button:has-text("Ke Jurnal")');
    await expect(page.locator('h1:has-text("Agenda & Jurnal Mengajar")')).toBeVisible({ timeout: 15000 });
    await expect(cardA_after.locator('text=15 Hadir')).toBeVisible({ timeout: 10000 });

    // 8. AC-5: Pemindahan tautan (Move from Meeting A to Meeting B)
    await cardA_after.locator('button:has-text("Presensi")').click();
    await expect(page.locator('h1:has-text("Presensi Siswa Mata Pelajaran")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Tertaut ke Jurnal Mengajar')).toBeVisible({ timeout: 10000 });

    // Select Meeting B in dropdown (index 2)
    const selectEl = page.locator('select').nth(1);
    await selectEl.selectOption({ index: 2 });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await expect(page.locator('text=Presensi siswa berhasil disimpan ke database!')).toBeVisible({ timeout: 10000 });

    // Verify in Journal:
    // Meeting A's summary is cleared ("Presensi Belum Diisi")
    // Meeting B's summary has "15 Hadir"
    await page.click('button:has-text("Ke Jurnal")');
    await expect(page.locator('h1:has-text("Agenda & Jurnal Mengajar")')).toBeVisible({ timeout: 15000 });
    const cardB_after = page.locator('h3', { hasText: topicB }).locator('xpath=ancestor::div[contains(@class, "group")]');
    await expect(cardA_after.locator('text=Presensi Belum Diisi')).toBeVisible({ timeout: 10000 });
    await expect(cardB_after.locator('text=15 Hadir')).toBeVisible({ timeout: 10000 });

    // 9. AC-6: Pelepasan tautan (Unlink from Meeting B)
    await cardB_after.locator('button:has-text("Presensi")').click();
    await expect(page.locator('h1:has-text("Presensi Siswa Mata Pelajaran")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Tertaut ke Jurnal Mengajar')).toBeVisible({ timeout: 10000 });

    await selectEl.selectOption({ value: '' });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await expect(page.locator('text=Presensi siswa berhasil disimpan ke database!')).toBeVisible({ timeout: 10000 });

    // Verify in Journal: Meeting B is unlinked
    await page.click('button:has-text("Ke Jurnal")');
    await expect(page.locator('h1:has-text("Agenda & Jurnal Mengajar")')).toBeVisible({ timeout: 15000 });
    await expect(cardB_after.locator('text=Presensi Belum Diisi')).toBeVisible({ timeout: 10000 });
  });
});

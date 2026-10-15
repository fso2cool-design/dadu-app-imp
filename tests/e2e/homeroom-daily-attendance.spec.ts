import { test, expect, type Page } from '@playwright/test';
import { installNetworkGuard } from './helpers/networkGuard';

/**
 * Ensures at least two synthetic students are enrolled in the active class.
 * If fewer than two students exist, creates them via the Master Data UI.
 */
async function ensureStudentsPresent(page: Page) {
  await page.goto('/master/students');
  await expect(page.locator('h1:has-text("Data Master Madrasah")')).toBeVisible({ timeout: 15000 });

  await page.waitForLoadState('networkidle').catch(() => {});

  const existingRows = page.locator('table tbody tr').filter({ hasNotText: 'Belum ada siswa' });
  const count = await existingRows.count();

  if (count < 2) {
    for (let i = 1; i <= 2 - count; i++) {
      await page.click('button:has-text("Tambah Siswa")');
      const modal = page.locator('h3:has-text("Tambah Siswa Baru")');
      await expect(modal).toBeVisible({ timeout: 10000 });

      const uniqueStamp = Date.now() + i;
      const sName = `Siswa Sintetis ${uniqueStamp}`;
      const sNis = `88${(uniqueStamp % 1000000).toString().padStart(6, '0')}`;

      const nameInput = page.locator('input[placeholder="Contoh: Muhammad Farhan"]');
      const nisInput = page.locator('input[placeholder="20261001"]');

      await nameInput.click();
      await nameInput.fill(sName);
      await expect(nameInput).toHaveValue(sName, { timeout: 3000 });

      await nisInput.click();
      await nisInput.fill(sNis);
      await expect(nisInput).toHaveValue(sNis, { timeout: 3000 });

      await page.locator('button[type="submit"]:has-text("Tambah Siswa")').click();
      await expect(modal).toBeHidden({ timeout: 10000 });

      await expect(page.locator('table tbody tr', { hasText: sName })).toBeVisible({ timeout: 10000 });
    }
  }
}

test.describe('Homeroom Daily Attendance Persistence E2E Verification', () => {
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

  test('records daily homeroom attendance with Sakit and Izin, saves to Firebase, and recovers exact statuses on reload', async ({ page }) => {
    // 1. Ensure suitable student roster exists through real application UI workflows
    await ensureStudentsPresent(page);

    // 2. Navigate directly to daily homeroom attendance interface
    await page.goto('/homeroom/attendance-daily');
    await expect(page.locator('text=Presensi Harian').first()).toBeVisible({ timeout: 15000 });

    // 3. Select or verify the homeroom class
    const classSelect = page.locator('select#daily-att-class');
    await expect(classSelect).toBeVisible({ timeout: 10000 });
    const currentClassVal = await classSelect.inputValue();
    if (currentClassVal === 'NONE' || !currentClassVal) {
      const options = await classSelect.locator('option').all();
      for (const opt of options) {
        const val = await opt.getAttribute('value');
        if (val && val !== 'NONE') {
          await classSelect.selectOption(val);
          break;
        }
      }
    }

    // 4. Verify explicit attendance date from UI
    const dateInput = page.locator('input[type="date"]');
    await expect(dateInput).toBeVisible({ timeout: 10000 });
    const attendanceDate = await dateInput.inputValue();
    expect(attendanceDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // 5. Wait for roster table to finish loading
    await expect(page.locator('text=Memuat presensi siswa...')).toBeHidden({ timeout: 15000 });
    const studentRows = page.locator('table tbody tr').filter({ hasNotText: 'Memuat presensi' }).filter({ hasNotText: 'Tidak ada siswa' });
    await expect(studentRows.nth(1)).toBeVisible({ timeout: 15000 });
    const studentCount = await studentRows.count();
    expect(studentCount).toBeGreaterThanOrEqual(2);

    // 6. Identify two distinct students in the displayed roster
    const studentRow1 = studentRows.nth(0);
    const studentRow2 = studentRows.nth(1);

    const student1Name = (await studentRow1.locator('td').nth(1).locator('span').first().innerText()).trim();
    const student1Roll = (await studentRow1.locator('td').nth(0).innerText()).trim();

    const student2Name = (await studentRow2.locator('td').nth(1).locator('span').first().innerText()).trim();
    const student2Roll = (await studentRow2.locator('td').nth(0).innerText()).trim();

    expect(student1Name).toBeTruthy();
    expect(student2Name).toBeTruthy();
    expect(student1Roll).not.toEqual(student2Roll);

    // 7. Set all students to Hadir (H) as baseline so every student in the roster has an explicit status
    await page.click('button:has-text("Set Semua Hadir (H)")');

    // 8. Explicitly customize the first student as Sakit (S) and the second as Izin (I)
    const sickBtn1 = studentRow1.locator('td').nth(4).locator('button').filter({ hasText: 'Sakit' });
    await sickBtn1.click();
    await expect(sickBtn1).toHaveClass(/scale-105|bg-amber-500/);

    const permittedBtn2 = studentRow2.locator('td').nth(4).locator('button').filter({ hasText: 'Izin' });
    await permittedBtn2.click();
    await expect(permittedBtn2).toHaveClass(/scale-105|bg-sky-600/);

    // 9. Save attendance through the real application action
    const saveBtn = page.locator('button:has-text("Simpan Presensi")');
    await expect(saveBtn).toBeEnabled({ timeout: 5000 });
    await saveBtn.click();

    // 10. Verify the actual success indication and ensure the application has completed saving
    await expect(page.locator('text=Presensi harian berhasil disimpan').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('button:has-text("Simpan Presensi")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Menyimpan...')).toHaveCount(0);
    await expect(page.locator('text=Perubahan belum disimpan')).toHaveCount(0);

    // 11. Assert the two selected statuses before leaving the page
    await expect(sickBtn1).toHaveClass(/scale-105|bg-amber-500/);
    await expect(permittedBtn2).toHaveClass(/scale-105|bg-sky-600/);
    await expect(page.locator('p:text-is("Sakit (S)") + p')).toHaveText('1');
    await expect(page.locator('p:text-is("Izin (I)") + p')).toHaveText('1');

    // 12. Perform a real browser reload
    await page.reload();

    // 13. Re-establish selected class and date if the application does not preserve those selections
    await expect(page.locator('text=Presensi Harian').first()).toBeVisible({ timeout: 15000 });
    const reloadedClassSelect = page.locator('select#daily-att-class');
    if (await reloadedClassSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      const val = await reloadedClassSelect.inputValue();
      if (val === 'NONE' || !val) {
        const options = await reloadedClassSelect.locator('option').all();
        for (const opt of options) {
          const optVal = await opt.getAttribute('value');
          if (optVal && optVal !== 'NONE') {
            await reloadedClassSelect.selectOption(optVal);
            break;
          }
        }
      }
    }

    const reloadedDateInput = page.locator('input[type="date"]');
    if (await reloadedDateInput.inputValue() !== attendanceDate) {
      await reloadedDateInput.fill(attendanceDate);
    }

    // 14. Wait for attendance data to finish loading
    await expect(page.locator('text=Memuat presensi siswa...')).toBeHidden({ timeout: 15000 });
    const reloadedRows = page.locator('table tbody tr').filter({ hasNotText: 'Memuat presensi' }).filter({ hasNotText: 'Tidak ada siswa' });
    await expect(reloadedRows.nth(1)).toBeVisible({ timeout: 15000 });

    // 15. Assert that the first student still has Sakit and the second still has Izin
    const reloadedRow1 = reloadedRows.nth(0);
    await expect(reloadedRow1.locator('td').nth(0)).toHaveText(student1Roll);
    await expect(reloadedRow1.locator('td').nth(1)).toContainText(student1Name);
    const reloadedSickBtn = reloadedRow1.locator('td').nth(4).locator('button').filter({ hasText: 'Sakit' });
    await expect(reloadedSickBtn).toHaveClass(/scale-105|bg-amber-500/);

    const reloadedRow2 = reloadedRows.nth(1);
    await expect(reloadedRow2.locator('td').nth(0)).toHaveText(student2Roll);
    await expect(reloadedRow2.locator('td').nth(1)).toContainText(student2Name);
    const reloadedPermittedBtn = reloadedRow2.locator('td').nth(4).locator('button').filter({ hasText: 'Izin' });
    await expect(reloadedPermittedBtn).toHaveClass(/scale-105|bg-sky-600/);

    // 16. Verify summary KPI stats after reload
    await expect(page.locator('p:text-is("Sakit (S)") + p')).toHaveText('1');
    await expect(page.locator('p:text-is("Izin (I)") + p')).toHaveText('1');
  });
});

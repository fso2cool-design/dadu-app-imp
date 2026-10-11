import { test, expect } from '@playwright/test';
import { installNetworkGuard } from './helpers/networkGuard';

test.describe('Student Historical Deletion Guard E2E Verification', () => {
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

  test('blocks deletion of student with historical attendance and permits deletion of unencumbered student', async ({ page }) => {
    const permissionErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('PERMISSION_DENIED')) {
        permissionErrors.push(msg.text());
      }
    });

    const uniqueStamp = Date.now();
    const protectedStudentName = `Siswa Terlindungi ${uniqueStamp}`;
    const protectedStudentNis = `99${(uniqueStamp % 1000000).toString().padStart(6, '0')}`;
    const unencumberedStudentName = `Siswa Bebas ${uniqueStamp}`;
    const unencumberedStudentNis = `88${(uniqueStamp % 1000000).toString().padStart(6, '0')}`;

    // 1. Open real student management UI
    await page.goto('/master/students');
    await expect(page.locator('h1:has-text("Data Master Madrasah")')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Master Data Siswa & Rombel')).toBeVisible({ timeout: 10000 });

    // 2. Create synthetic protected student through actual application UI
    await page.click('button:has-text("Tambah Siswa")');
    const modal1 = page.locator('h3:has-text("Tambah Siswa Baru")');
    await expect(modal1).toBeVisible({ timeout: 10000 });

    const nameInput = page.locator('input[placeholder="Contoh: Muhammad Farhan"]');
    const nisInput = page.locator('input[placeholder="20261001"]');

    await nameInput.click();
    await nameInput.fill(protectedStudentName);
    await expect(nameInput).toHaveValue(protectedStudentName, { timeout: 3000 });

    await nisInput.click();
    await nisInput.fill(protectedStudentNis);
    await expect(nisInput).toHaveValue(protectedStudentNis, { timeout: 3000 });

    await page.locator('button[type="submit"]:has-text("Tambah Siswa")').click();
    await expect(modal1).toBeHidden({ timeout: 10000 });

    // Verify protected student is visible in the class enrollment table
    const protectedRow = page.locator('table tbody tr').filter({ hasText: protectedStudentName });
    await expect(protectedRow).toBeVisible({ timeout: 15000 });

    // 3. Establish a real historical relationship: record attendance in /teacher/attendance
    await page.goto('/teacher/attendance');
    await expect(page.locator('h1:has-text("Presensi Siswa Mata Pelajaran")')).toBeVisible({ timeout: 15000 });

    const attendanceAssignmentSelect = page.locator('select').first();
    if (await attendanceAssignmentSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await attendanceAssignmentSelect.selectOption({ index: 0 });
    }

    // Wait for the attendance table to populate with enrolled students
    await expect(page.locator('table tbody tr').filter({ hasText: protectedStudentName })).toBeVisible({ timeout: 15000 });

    // Set all present and save attendance to create real historical attendance records
    await page.click('button:has-text("Set Semua Hadir (H)")');
    await page.click('button:has-text("Simpan Presensi")');
    await expect(page.locator('text=Presensi siswa berhasil disimpan ke database!')).toBeVisible({ timeout: 10000 });

    // 4. Return to student management and create a second synthetic student (unencumbered)
    await page.goto('/master/students');
    await expect(page.locator('h1:has-text("Data Master Madrasah")')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Master Data Siswa & Rombel')).toBeVisible({ timeout: 10000 });

    await page.click('button:has-text("Tambah Siswa")');
    const modal2 = page.locator('h3:has-text("Tambah Siswa Baru")');
    await expect(modal2).toBeVisible({ timeout: 10000 });

    await nameInput.click();
    await nameInput.fill(unencumberedStudentName);
    await expect(nameInput).toHaveValue(unencumberedStudentName, { timeout: 3000 });

    await nisInput.click();
    await nisInput.fill(unencumberedStudentNis);
    await expect(nisInput).toHaveValue(unencumberedStudentNis, { timeout: 3000 });

    await page.locator('button[type="submit"]:has-text("Tambah Siswa")').click();
    await expect(modal2).toBeHidden({ timeout: 10000 });

    const unencumberedRow = page.locator('table tbody tr').filter({ hasText: unencumberedStudentName });
    await expect(unencumberedRow).toBeVisible({ timeout: 15000 });

    // 5. Attempt to delete protected student in Class View (Hapus dari Kelas)
    // Deletion must be blocked because the student has historical attendance records
    const protectedRowInClass = page.locator('table tbody tr').filter({ hasText: protectedStudentName });
    await protectedRowInClass.locator('button[title="Hapus dari Kelas"]').click();

    // Verify deletion blocked dialog appears with correct explanation
    const blockedModalClass = page.locator('h3:has-text("Penempatan Kelas Tidak Dapat Dihapus")');
    await expect(blockedModalClass).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Tidak Dapat Dihapus')).toBeVisible();
    await expect(page.locator('text=Siswa memiliki rekam presensi pertemuan KBM')).toBeVisible();

    // Dismiss blocked dialog
    await page.locator('div[role="dialog"] button:has-text("Mengerti")').click();
    await expect(blockedModalClass).toBeHidden({ timeout: 10000 });
    await expect(protectedRowInClass).toBeVisible();

    // 6. Attempt to delete protected student in Master Data View (Hapus Permanen)
    await page.click('button:has-text("Semua Siswa Master")');
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });

    const protectedRowInMaster = page.locator('table tbody tr').filter({ hasText: protectedStudentName });
    await expect(protectedRowInMaster).toBeVisible({ timeout: 15000 });

    await protectedRowInMaster.locator('button[title="Hapus Permanen"]').click();

    const blockedModalMaster = page.locator('h3:has-text("Data Siswa Dilindungi Tata Kelola")');
    await expect(blockedModalMaster).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Siswa tidak dapat dihapus karena memiliki riwayat akademik')).toBeVisible();

    // Dismiss blocked dialog
    await page.locator('div[role="dialog"] button:has-text("Mengerti")').click();
    await expect(blockedModalMaster).toBeHidden({ timeout: 10000 });
    await expect(protectedRowInMaster).toBeVisible();

    // 7. Reload page and verify protected student remains completely intact in both views
    await page.reload();
    await expect(page.locator('h1:has-text("Data Master Madrasah")')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Master Data Siswa & Rombel')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('table tbody tr').filter({ hasText: protectedStudentName })).toBeVisible({ timeout: 15000 });

    // 8. Verify permitted deletion of unencumbered student in Class View
    const unencumberedRowInClass = page.locator('table tbody tr').filter({ hasText: unencumberedStudentName });
    await expect(unencumberedRowInClass).toBeVisible({ timeout: 15000 });

    await unencumberedRowInClass.locator('button[title="Hapus dari Kelas"]').click();

    // Verify ConfirmDialog opens for permitted deletion
    const confirmDialogClass = page.locator('h3:has-text("Hapus Siswa dari Kelas")');
    await expect(confirmDialogClass).toBeVisible({ timeout: 10000 });

    // Execute permitted class deletion
    await page.locator('div[role="dialog"] button:has-text("Hapus dari Kelas")').click();
    await expect(confirmDialogClass).toBeHidden({ timeout: 10000 });

    // Verify unencumbered student is removed from Class View
    await expect(page.locator('table tbody tr').filter({ hasText: unencumberedStudentName })).toBeHidden({ timeout: 10000 });

    // 9. Verify permitted permanent deletion of unencumbered student in Master Data View
    await page.click('button:has-text("Semua Siswa Master")');
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });

    const unencumberedRowInMaster = page.locator('table tbody tr').filter({ hasText: unencumberedStudentName });
    await expect(unencumberedRowInMaster).toBeVisible({ timeout: 15000 });

    await unencumberedRowInMaster.locator('button[title="Hapus Permanen"]').click();

    const confirmDialogMaster = page.locator('h3:has-text("Hapus Siswa Permanen")');
    await expect(confirmDialogMaster).toBeVisible({ timeout: 10000 });

    // Execute permitted permanent deletion
    const deletePermanentBtn = page.getByRole('dialog').getByRole('button', { name: 'Hapus Siswa', exact: true });
    await expect(deletePermanentBtn).toBeVisible({ timeout: 5000 });
    await deletePermanentBtn.click();
    await expect(confirmDialogMaster).toBeHidden({ timeout: 10000 });

    // Verify unencumbered student is removed from Master Data View
    await expect(page.locator('table tbody tr').filter({ hasText: unencumberedStudentName })).toBeHidden({ timeout: 10000 });

    // Assert that no PERMISSION_DENIED console errors were fired during deletion
    expect(permissionErrors).toHaveLength(0);

    // 10. Final reload verification: protected student remains intact, unencumbered student is permanently gone
    await page.reload();
    await expect(page.locator('h1:has-text("Data Master Madrasah")')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Master Data Siswa & Rombel')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Semua Siswa Master")');
    await expect(page.locator('table tbody tr').filter({ hasText: protectedStudentName })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('table tbody tr').filter({ hasText: unencumberedStudentName })).toBeHidden({ timeout: 10000 });
  });
});

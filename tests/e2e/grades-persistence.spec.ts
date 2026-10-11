import { test, expect, type Page } from '@playwright/test';
import { installNetworkGuard } from './helpers/networkGuard';

/**
 * Ensures at least two synthetic students are enrolled in the active class.
 * If fewer than two students exist, creates them via the Master Data UI.
 */
async function ensureStudentsPresent(page: Page) {
  await page.goto('/teacher/grades');
  await expect(page.locator('h1:has-text("Nilai Akademik & Penilaian")')).toBeVisible({ timeout: 15000 });

  const emptyState = page.locator('text=Belum Ada Siswa di Kelas Ini');
  const studentRows = page.locator('table tbody tr');

  const hasEmpty = await emptyState.isVisible({ timeout: 2000 }).catch(() => false);
  const currentCount = hasEmpty ? 0 : await studentRows.count();

  if (currentCount < 2) {
    // Navigate to Master Siswa to create missing students
    await page.goto('/master/students');
    await expect(page.locator('h1:has-text("Data Master Madrasah")')).toBeVisible({ timeout: 15000 });

    const masterRows = page.locator('table tbody tr');
    const existingMasterCount = await masterRows.count();

    for (let i = 1; i <= 2 - currentCount; i++) {
      await page.click('button:has-text("Tambah Siswa")');
      const modal = page.locator('h3:has-text("Tambah Siswa Baru")');
      await expect(modal).toBeVisible({ timeout: 10000 });

      const studentNum = existingMasterCount + i;
      const padIndex = String(studentNum).padStart(2, '0');
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
    }

    // Return to Grades Page
    await page.goto('/teacher/grades');
    await expect(page.locator('h1:has-text("Nilai Akademik & Penilaian")')).toBeVisible({ timeout: 15000 });
  }

  await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });
  const finalCount = await page.locator('table tbody tr').count();
  expect(finalCount).toBeGreaterThanOrEqual(2);
}

test.describe('Grade Persistence & Calculation E2E Verification', () => {
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

  test('creates assessment item, enters scores, verifies calculations, saves, reloads, and verifies persisted recovery', async ({ page }) => {
    // 1. Ensure at least two test students are enrolled in the active class
    await ensureStudentsPresent(page);

    // 2. Open grades route and verify context & assignment controls
    await page.goto('/teacher/grades');
    await expect(page.locator('h1:has-text("Nilai Akademik & Penilaian")')).toBeVisible({ timeout: 15000 });

    const assignmentSelect = page.locator('select').filter({ hasText: /Kelas/ }).first();
    await expect(assignmentSelect).toBeVisible({ timeout: 10000 });
    const selectedAssignmentId = await assignmentSelect.inputValue();
    expect(selectedAssignmentId).toBeTruthy();

    // 3. Create a new assessment item through the UI with distinctive name
    const uniqueStamp = Date.now();
    const assessmentName = `UH-Persist-${uniqueStamp}`;

    const addColButton = page.locator('button:has-text("Tambah Kolom Nilai")');
    await expect(addColButton).toBeEnabled({ timeout: 10000 });
    await addColButton.click();

    const itemModal = page.locator('h3:has-text("Tambah Kolom Penilaian Baru")');
    await expect(itemModal).toBeVisible({ timeout: 10000 });

    const nameInput = page.locator('input[placeholder*="Contoh: Sumatif Bab 1"]');
    await nameInput.fill(assessmentName);
    await expect(nameInput).toHaveValue(assessmentName);

    // Submit modal (Category defaults to QUIZ / 35% weight / max 100)
    await page.locator('button[type="submit"]:has-text("Buat Kolom Penilaian")').click();
    await expect(itemModal).toBeHidden({ timeout: 10000 });

    // 4. Locate the dynamic column in the table header
    const colHeader = page.locator(`th:has-text("${assessmentName}")`);
    await expect(colHeader).toBeVisible({ timeout: 10000 });

    // Derive column indices from the actual table header
    const findColumnIndices = async () => {
      const headers = page.locator('table thead tr th');
      const count = await headers.count();
      let assessmentIdx = -1;
      let finalScoreIdx = -1;
      let predicateIdx = -1;
      let statusIdx = -1;

      for (let i = 0; i < count; i++) {
        const text = (await headers.nth(i).innerText()).trim();
        if (text.includes(assessmentName)) assessmentIdx = i;
        if (text.includes('Nilai Akhir')) finalScoreIdx = i;
        if (text.includes('Predikat')) predicateIdx = i;
        if (text.includes('Status')) statusIdx = i;
      }
      return { assessmentIdx, finalScoreIdx, predicateIdx, statusIdx };
    };

    let colIndices = await findColumnIndices();
    expect(colIndices.assessmentIdx).toBeGreaterThan(-1);
    expect(colIndices.finalScoreIdx).toBeGreaterThan(-1);
    expect(colIndices.predicateIdx).toBeGreaterThan(-1);
    expect(colIndices.statusIdx).toBeGreaterThan(-1);

    // 5. Enter two distinct valid scores: 80 for student 1, 65 for student 2
    const row0 = page.locator('table tbody tr').nth(0);
    const row1 = page.locator('table tbody tr').nth(1);

    const scoreInput0 = row0.locator('td').nth(colIndices.assessmentIdx).locator('input[type="number"]');
    const scoreInput1 = row1.locator('td').nth(colIndices.assessmentIdx).locator('input[type="number"]');

    await scoreInput0.click();
    await scoreInput0.fill('80');
    await expect(scoreInput0).toHaveValue('80');

    await scoreInput1.click();
    await scoreInput1.fill('65');
    await expect(scoreInput1).toHaveValue('65');

    // 6. Verify calculations before save:
    // With KKM = 75:
    // Student 1 (score 80): >= 75 -> Predicate 'C' (thresholdB is 83), Status 'Tuntas', Final score 80
    // Student 2 (score 65): < 75 -> Predicate 'D', Status 'Remedial', Final score 65
    const finalScoreCell0 = row0.locator('td').nth(colIndices.finalScoreIdx);
    const predicateCell0 = row0.locator('td').nth(colIndices.predicateIdx);
    const statusCell0 = row0.locator('td').nth(colIndices.statusIdx);

    const finalScoreCell1 = row1.locator('td').nth(colIndices.finalScoreIdx);
    const predicateCell1 = row1.locator('td').nth(colIndices.predicateIdx);
    const statusCell1 = row1.locator('td').nth(colIndices.statusIdx);

    await expect(finalScoreCell0).toHaveText(/80/);
    await expect(predicateCell0).toHaveText(/C/);
    await expect(statusCell0).toContainText('Tuntas');

    await expect(finalScoreCell1).toHaveText(/65/);
    await expect(predicateCell1).toHaveText(/D/);
    await expect(statusCell1).toContainText('Remedial');

    // 7. Save changes through the actual save action button
    const saveButton = page.locator('button:has-text("Simpan Perubahan*")');
    await expect(saveButton).toBeVisible({ timeout: 5000 });
    await saveButton.click();

    // Verify successful save: button transitions back to 'Tersimpan'
    await expect(page.locator('button:has-text("Tersimpan")')).toBeVisible({ timeout: 15000 });

    // Verify no error toast is displayed
    await expect(page.locator('text=Terjadi Kesalahan')).toBeHidden();
    await expect(page.locator('text=Gagal menyimpan nilai')).toBeHidden();

    // 8. Perform full browser reload
    await page.reload();
    await expect(page.locator('h1:has-text("Nilai Akademik & Penilaian")')).toBeVisible({ timeout: 15000 });

    // 9. Re-verify selected assignment context
    const reloadedSelect = page.locator('select').filter({ hasText: /Kelas/ }).first();
    await expect(reloadedSelect).toBeVisible({ timeout: 10000 });
    const currentSelectValue = await reloadedSelect.inputValue();
    if (currentSelectValue !== selectedAssignmentId) {
      await reloadedSelect.selectOption(selectedAssignmentId);
    }

    // Wait for student table to load
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });

    // 10. Verify persisted assessment column and both exact scores
    const reloadedColHeader = page.locator(`th:has-text("${assessmentName}")`);
    await expect(reloadedColHeader).toBeVisible({ timeout: 10000 });

    // Re-derive column indices after reload
    colIndices = await findColumnIndices();
    expect(colIndices.assessmentIdx).toBeGreaterThan(-1);

    const reloadedRow0 = page.locator('table tbody tr').nth(0);
    const reloadedRow1 = page.locator('table tbody tr').nth(1);

    const reloadedInput0 = reloadedRow0.locator('td').nth(colIndices.assessmentIdx).locator('input[type="number"]');
    const reloadedInput1 = reloadedRow1.locator('td').nth(colIndices.assessmentIdx).locator('input[type="number"]');

    await expect(reloadedInput0).toHaveValue('80');
    await expect(reloadedInput1).toHaveValue('65');

    // 11. Verify calculated final score, predicate, and KKM completion status after reload
    const reloadedFinalScore0 = reloadedRow0.locator('td').nth(colIndices.finalScoreIdx);
    const reloadedPredicate0 = reloadedRow0.locator('td').nth(colIndices.predicateIdx);
    const reloadedStatus0 = reloadedRow0.locator('td').nth(colIndices.statusIdx);

    const reloadedFinalScore1 = reloadedRow1.locator('td').nth(colIndices.finalScoreIdx);
    const reloadedPredicate1 = reloadedRow1.locator('td').nth(colIndices.predicateIdx);
    const reloadedStatus1 = reloadedRow1.locator('td').nth(colIndices.statusIdx);

    await expect(reloadedFinalScore0).toHaveText(/80/);
    await expect(reloadedPredicate0).toHaveText(/C/);
    await expect(reloadedStatus0).toContainText('Tuntas');

    await expect(reloadedFinalScore1).toHaveText(/65/);
    await expect(reloadedPredicate1).toHaveText(/D/);
    await expect(reloadedStatus1).toContainText('Remedial');
  });
});

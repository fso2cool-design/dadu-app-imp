import { test, expect, Page } from '@playwright/test';

async function getCDPMemory(page: Page) {
  const client = await page.context().newCDPSession(page);
  await client.send('HeapProfiler.enable');
  await client.send('HeapProfiler.collectGarbage');
  const metrics = await client.send('Runtime.getHeapUsage');
  await client.send('HeapProfiler.disable');
  await client.detach();
  return metrics.usedSize;
}

function toMB(bytes: number) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

test.describe('Memory Profiling for LRUCache (CDP)', () => {
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

  test('SubjectAttendancePage - LRU Eviction by 55 unique dates', async ({ page }) => {
    test.setTimeout(240000); // Wait up to 4 minutes
    console.log('--- Profiling SubjectAttendancePage with CDP ---');
    await page.goto('/teacher/attendance');

    // Wait for network to settle
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('select');
    // Give it a moment to load SWR data
    await page.waitForTimeout(2000);

    const startMem = await getCDPMemory(page);
    console.log(`Start memory: ${toMB(startMem)}`);

    const assignmentSelects = await page.evaluateHandle(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      return selects.find(s => {
        const opts = Array.from(s.options);
        return opts.length > 1 && opts[1].text.includes('—'); // "Mata Pelajaran" select
      });
    });

    const isAssignmentSelectFound = await assignmentSelects.evaluate(node => node !== undefined);
    if (!isAssignmentSelectFound) {
      console.log('Assignment select not found or not enough options');
      return;
    }

    const options = await assignmentSelects.evaluate(node => {
      return Array.from((node as HTMLSelectElement).options).map(o => o.value).filter(v => v !== '');
    });

    if (options.length < 1) {
      console.log('Not enough assignments');
      return;
    }

    const valA = options[0];
    await assignmentSelects.evaluate((node, val) => {
      const select = node as HTMLSelectElement;
      select.value = val;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }, valA);

    await page.waitForTimeout(1000); // wait for subject load

    const dateInput = page.locator('input[type="date"]');
    await dateInput.waitFor({ state: 'visible', timeout: 5000 });

    // LRU Capacity is 50. Generate 55 unique requests.
    for (let i = 1; i <= 55; i++) {
      let month = '01';
      let d = i;
      if (i > 31) {
         month = '02';
         d = i - 31;
      }
      const dayStr = d.toString().padStart(2, '0');
      const targetDate = `2024-${month}-${dayStr}`;

      await dateInput.fill(targetDate);

      // wait for rendering
      await page.waitForTimeout(300);

      if (i === 10 || i === 30 || i === 50 || i === 55) {
        let mem = await getCDPMemory(page);
        console.log(`Iteration ${i} (Date: ${targetDate}) memory: ${toMB(mem)}`);
      }
    }

    // Navigate away to check cleanup
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    let endMem = await getCDPMemory(page);
    console.log(`End memory (after navigation): ${toMB(endMem)}`);
  });
});

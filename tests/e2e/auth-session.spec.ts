import { test, expect } from '@playwright/test';
import { installNetworkGuard } from './helpers/networkGuard';
import fs from 'fs';
import path from 'path';

test.describe('Authenticated Session Restoration via IndexedDB', () => {
  test('verifies storageState contains indexedDB and restores session without UI login', async ({ page, browser }) => {
    // 1. Verify that user.json storage state exists and includes indexedDB entries
    const authFile = path.resolve('tests/e2e/.auth/user.json');
    expect(fs.existsSync(authFile)).toBe(true);

    const authData = JSON.parse(fs.readFileSync(authFile, 'utf8'));
    const originEntry = authData.origins?.find((o: any) => o.origin.includes('5174'));
    expect(originEntry).toBeDefined();
    expect(originEntry.indexedDB).toBeDefined();
    expect(Array.isArray(originEntry.indexedDB)).toBe(true);
    expect(originEntry.indexedDB.length).toBeGreaterThan(0);

    // 2. Install fail-closed network guard on default page (created with storageState)
    const guard = await installNetworkGuard(page);

    // 3. Navigate directly to /dashboard without performing UI login
    await page.goto('/dashboard');

    // 4. Verify authenticated route loads, greeting the teacher
    await expect(page.locator('text=Ruang Guru').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Test Teacher, S.Pd.').first()).toBeVisible({ timeout: 15000 });

    // 5. Verify Firestore classes data loads in dashboard
    await expect(page.locator('text=Kelas X-A').first()).toBeVisible({ timeout: 15000 });

    // 6. Verify an explicit fresh browser context created with storageState also works without UI login
    const freshContext = await browser.newContext({
      storageState: authFile,
    });
    const freshPage = await freshContext.newPage();
    const freshGuard = await installNetworkGuard(freshPage);

    await freshPage.goto('/dashboard');
    await expect(freshPage.locator('text=Ruang Guru').first()).toBeVisible({ timeout: 15000 });
    await expect(freshPage.locator('text=Test Teacher, S.Pd.').first()).toBeVisible({ timeout: 15000 });
    await expect(freshPage.locator('text=Kelas X-A').first()).toBeVisible({ timeout: 15000 });

    // 7. Verify no forbidden external requests occurred across both contexts
    guard.assertNoViolations();
    freshGuard.assertNoViolations();

    await freshContext.close();
  });
});

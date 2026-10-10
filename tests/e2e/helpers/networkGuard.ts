import type { Page, BrowserContext } from '@playwright/test';

export interface NetworkGuard {
  getViolations: () => string[];
  assertNoViolations: () => void;
}

export async function installNetworkGuard(contextOrPage: BrowserContext | Page): Promise<NetworkGuard> {
  const violations: string[] = [];

  const allowedOrigins = [
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:9099',
    'http://127.0.0.1:9099',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:4400',
    'http://127.0.0.1:4400',
  ];

  await contextOrPage.route('**/*', async (route) => {
    const url = route.request().url();

    // Allow data: and blob:
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return route.continue();
    }

    // Mock static font CDN locally so no network packets leave localhost
    if (url.startsWith('https://fonts.googleapis.com') || url.startsWith('https://fonts.gstatic.com')) {
      return route.fulfill({
        status: 200,
        contentType: 'text/css',
        body: '/* mocked local font for offline e2e */',
      });
    }

    // Mock Google cleardot ping locally so no network packets leave localhost
    if (url.startsWith('https://www.google.com/images/cleardot.gif')) {
      return route.fulfill({
        status: 200,
        contentType: 'image/gif',
        body: Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'),
      });
    }

    try {
      const parsed = new URL(url);
      const origin = parsed.origin;

      const isAllowed = allowedOrigins.some((allowed) => origin === allowed);

      if (isAllowed) {
        return route.continue();
      }

      // Any external host (production Firebase, external APIs, etc.) is blocked!
      violations.push(`Blocked forbidden external request: ${route.request().method()} ${url}`);
      return route.abort('blockedbyclient');
    } catch {
      violations.push(`Blocked unparseable URL request: ${url}`);
      return route.abort('blockedbyclient');
    }
  });

  return {
    getViolations: () => [...violations],
    assertNoViolations: () => {
      if (violations.length > 0) {
        throw new Error(
          `[FAIL-CLOSED SECURITY GUARD] Detected ${violations.length} forbidden external request(s):\n${violations.join(
            '\n'
          )}`
        );
      }
    },
  };
}

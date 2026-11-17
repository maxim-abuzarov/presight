import { test as base, expect, type Page } from '@playwright/test';

export const test = base.extend<{ allowFailures: boolean; failures: string[] }>({
  allowFailures: [false, { option: true }],
  failures: [
    async ({ page, allowFailures, baseURL }, use) => {
      const failures: string[] = [];
      const ours = (url: string) => url.startsWith(baseURL ?? '');

      page.on('console', (message) => {
        if (message.type() === 'error') failures.push(`console: ${message.text()}`);
      });
      page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
      page.on('requestfailed', (request) => {
        const error = request.failure()?.errorText;
        if (request.resourceType() === 'image' && error === 'net::ERR_ABORTED') return;
        failures.push(`failed: ${request.url()} (${error})`);
      });
      page.on('response', (response) => {
        if (ours(response.url()) && response.status() >= 400) {
          failures.push(`HTTP ${response.status()}: ${response.url()}`);
        }
      });

      await use(failures);
      if (!allowFailures) expect(failures, 'no failed requests or console errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export const peopleCount = (page: Page) => page.getByText(/\d[\d,]* (people|person) match/);

export async function countOf(page: Page): Promise<number> {
  const text = (await peopleCount(page).textContent()) ?? '';
  return Number(text.replace(/[^\d]/g, ''));
}

export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1280) < 1024;

export async function openFilters(page: Page) {
  if (isMobile(page)) await page.getByRole('button', { name: /^Filters/ }).click();
  return isMobile(page) ? page.getByRole('dialog', { name: 'Filters' }) : page.locator('aside');
}

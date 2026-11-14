import type { Page } from '@playwright/test';
export async function openFilters(page: Page): Promise<void> {
  await page.locator('main').waitFor();
  const toggle = page.locator('app-filter-panel .filter-toggle');
  if ((await toggle.count()) && (await toggle.getAttribute('aria-expanded')) === 'false')
    await toggle.click();
}

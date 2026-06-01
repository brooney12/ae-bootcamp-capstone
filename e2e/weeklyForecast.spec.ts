```typescript
// Covers: WeatherApp — critical user flows
// Implements: UI/E2E Tests — weekly forecast display and responsive design
// Install required (if not present): @playwright/test
// Run: npx playwright test

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Stub the Open-Meteo API so tests are hermetic
  await page.route('**/api.open-meteo.com/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      current: {},
      daily: {
        time: ["2023-10-01", "2023-10-02", "2023-10-03", "2023-10-04", "2023-10-05", "2023-10-06", "2023-10-07"],
        weather_code: [1, 2, 1, 1, 2, 1, 1],
        temperature_2m_max: [70, 75, 80, 82, 78, 76, 74],
        temperature_2m_min: [50, 55, 60, 62, 58, 56, 54],
        precipitation_sum: [0, 0.1, 0, 0, 0, 0, 0],
      }
    })})
  );
  await page.goto('/');
});

test('displays weekly forecast section', async ({ page }) => {
  await expect(page.getByText('This Week')).toBeVisible();
  const dayCards = await page.locator('.day-card');
  expect(await dayCards.count()).toBe(7); // Check for 7 day cards
});

test('responsive design adjusts columns based on screen size', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await expect(page.locator('.weekly-days')).toHaveCSS('grid-template-columns', 'repeat(7, 1fr)');

  await page.setViewportSize({ width: 800, height: 800 });
  await expect(page.locator('.weekly-days')).toHaveCSS('grid-template-columns', 'repeat(4, 1fr)');

  await page.setViewportSize({ width: 500, height: 800 });
  await expect(page.locator('.weekly-days')).toHaveCSS('grid-template-columns', 'repeat(3, 1fr)');
});

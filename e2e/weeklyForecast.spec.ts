```typescript
// Covers: WeatherApp — critical user flows
// Implements: UI/E2E Tests — "This Week" section visibility, responsiveness of weekly forecast grid
// Install required (if not present): @playwright/test
// Run: npx playwright test

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Stub the Open-Meteo API so tests are hermetic
  await page.route('**/api.open-meteo.com/**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        current: {},
        daily: {
          time: ['2023-06-01', '2023-06-02', '2023-06-03', '2023-06-04', '2023-06-05', '2023-06-06', '2023-06-07'],
          weather_code: [0, 1, 2, 3, 4, 5, 6],
          temperature_2m_max: [75, 76, 77, 78, 79, 80, 81],
          temperature_2m_min: [55, 56, 57, 58, 59, 60, 61],
          precipitation_sum: [0, 0.1, 0, 0.2, 0, 0, 0.3],
        },
      }),
    })
  );
  await page.goto('/');
});

test('displays "This Week" section when daily data is available', async ({ page }) => {
  await expect(page.getByText('This Week')).toBeVisible();
});

test('responds correctly to screen size changes', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await expect(page.locator('.weekly-days')).toHaveCSS('grid-template-columns', 'repeat(7, 1fr)');

  await page.setViewportSize({ width: 500, height: 600 });
  await expect(page.locator('.weekly-days')).toHaveCSS('grid-template-columns', 'repeat(4, 1fr)');

  await page.setViewportSize({ width: 300, height: 600 });
  await expect(page.locator('.weekly-days')).toHaveCSS('grid-template-columns', 'repeat(3, 1fr)');
});

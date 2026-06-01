```typescript
// Covers: WeatherApp — critical user flows
// Implements: UI/E2E Tests — verify weekly forecast visibility, test responsive layout for forecast
// Install required (if not present): @playwright/test
// Run: npx playwright test

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Stub the Open-Meteo API so tests are hermetic
  await page.route('**/api.open-meteo.com/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      current: { temperature: 70 },
      daily: {
        time: ['2023-06-01', '2023-06-02', '2023-06-03', '2023-06-04', '2023-06-05', '2023-06-06', '2023-06-07'],
        weather_code: [0, 1, 0, 1, 0, 1, 0],
        temperature_2m_max: [75, 76, 77, 78, 79, 80, 81],
        temperature_2m_min: [55, 56, 57, 58, 59, 60, 61],
        precipitation_sum: [0, 0, 0, 0, 0, 0, 0],
      },
    })})
  );
  await page.goto('/');
});

test('verify weekly forecast visibility', async ({ page }) => {
  await expect(page.getByText('This Week')).toBeVisible();
  const dayCards = await page.locator('.day-card');
  expect(await dayCards.count()).toBe(7);
});

test('test responsive layout for forecast', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.locator('.weekly-forecast')).toBeVisible();

  await page.setViewportSize({ width: 375, height: 667 });
  await expect(page.locator('.weekly-forecast')).toBeVisible();
});

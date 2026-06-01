```typescript
// Covers: WeatherApp — critical user flows
// Implements: UI/E2E Tests — user views forecast for Minneapolis
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
        current: { temperature: 75 },
        daily: {
          time: ['2023-06-01', '2023-06-02', '2023-06-03', '2023-06-04', '2023-06-05', '2023-06-06', '2023-06-07'],
          weather_code: [0, 1, 0, 1, 0, 1, 0],
          temperature_2m_max: [80, 82, 78, 75, 79, 81, 83],
          temperature_2m_min: [60, 62, 58, 55, 59, 61, 63],
          precipitation_sum: [0, 0.1, 0, 0.2, 0, 0.1, 0],
        },
      }),
    })
  );
  await page.goto('/');
});

test('user views forecast for Minneapolis', async ({ page }) => {
  await expect(page.getByText(/This Week/i)).toBeVisible();
  const dayCards = await page.locator('.day-card');
  expect(await dayCards.count()).toBe(7); // Ensure there are 7 days displayed
});

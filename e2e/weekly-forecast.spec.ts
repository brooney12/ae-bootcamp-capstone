```typescript
// Covers: WeatherApp — critical user flows
// Implements: UI/E2E Tests — View weekly forecast
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
        daily: {
          time: ['2023-06-01', '2023-06-02', '2023-06-03'],
          weather_code: [0, 1, 2],
          temperature_2m_max: [75, 80, 78],
          temperature_2m_min: [55, 60, 58],
          precipitation_sum: [0, 0.1, 0.2],
        },
      }),
    })
  );
  await page.goto('/');
});

test('displays weekly forecast correctly', async ({ page }) => {
  await expect(page.getByText('This Week')).toBeVisible();
  const dayCards = await page.locator('.day-card');
  expect(await dayCards.count()).toBe(3); // Check for 3 day cards
});

```typescript
// Covers: WeatherApp — critical user flows
// Implements: UI/E2E Tests — view weekly forecast
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
          time: ['2023-10-15', '2023-10-16', '2023-10-17', '2023-10-18', '2023-10-19', '2023-10-20', '2023-10-21'],
          weather_code: [1, 2, 3, 1, 2, 3, 1],
          temperature_2m_max: [70, 68, 65, 72, 75, 73, 71],
          temperature_2m_min: [50, 48, 45, 52, 54, 53, 51],
          precipitation_sum: [0, 0.1, 0, 0, 0.2, 0, 0]
        }
      })
    })
  );
  await page.goto('/');
});

test('user can view the weekly forecast grid', async ({ page }) => {
  await expect(page.locator('.weekly-forecast')).toBeVisible();
  const dayCards = await page.locator('.day-card');
  expect(await dayCards.count()).toBe(7);
  // Additional assertions can be made here to check the content of each card
});

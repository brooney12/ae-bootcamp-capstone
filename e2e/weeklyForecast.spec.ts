```typescript
// Covers: Weekly forecast feature
// Implements: UI/E2E Tests — viewing the weekly forecast for Minneapolis, MN
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
          time: ['2023-05-30', '2023-05-31', '2023-06-01', '2023-06-02', '2023-06-03', '2023-06-04', '2023-06-05'],
          weather_code: [0, 1, 2, 3, 4, 5, 6],
          temperature_2m_max: [75, 76, 77, 78, 79, 80, 81],
          temperature_2m_min: [55, 56, 57, 58, 59, 60, 61],
          precipitation_sum: [0, 0.1, 0, 0, 0.2, 0, 0],
        },
      }),
    })
  );
  await page.goto('/');
});

test('can view the weekly forecast for Minneapolis, MN', async ({ page }) => {
  await expect(page.getByText('This Week')).toBeVisible();
  const dayCards = await page.locator('.day-card');
  expect(await dayCards.count()).toBe(7); // Expect 7 day cards to be displayed
});

```typescript
// Covers: Weekly Forecast feature — critical user flows
// Implements: UI/E2E Tests — view weekly weather forecast
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
        daily: [
          { temperature_2m_max: 75, temperature_2m_min: 55, weathercode: 0, precipitation_sum: 0 },
          { temperature_2m_max: 70, temperature_2m_min: 50, weathercode: 1, precipitation_sum: 0 },
          // Add more mock data as needed
        ],
      }),
    })
  );
  await page.goto('/');
});

test('view weekly weather forecast', async ({ page }) => {
  await expect(page.getByText(/weekly forecast/i)).toBeVisible();
  await expect(page.getByText(/75/i)).toBeVisible(); // Check for max temperature
  await expect(page.getByText(/55/i)).toBeVisible(); // Check for min temperature
});

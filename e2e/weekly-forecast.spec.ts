```typescript
// Covers: Weekly forecast feature
// Implements: UI/E2E Tests — weekly forecast display, error handling
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
        current: { temperature: 70 },
        daily: {
          time: ['2023-10-10', '2023-10-11', '2023-10-12', '2023-10-13', '2023-10-14', '2023-10-15', '2023-10-16'],
          weather_code: [1, 2, 1, 3, 1, 2, 1],
          temperature_2m_max: [75, 76, 77, 78, 79, 80, 81],
          temperature_2m_min: [55, 56, 57, 58, 59, 60, 61],
          precipitation_sum: [0, 0.1, 0, 0, 0.2, 0, 0],
        },
      }),
    })
  );
  await page.goto('/');
});

test('displays weekly forecast for Minneapolis, MN', async ({ page }) => {
  await expect(page.getByText(/This Week/i)).toBeVisible();
  for (let i = 0; i < 7; i++) {
    await expect(page.getByText(/Tue/i)).toBeVisible(); // Adjust based on the expected day
    await expect(page.getByText(/75°/i)).toBeVisible(); // Adjust based on the expected max temperature
    await expect(page.getByText(/55°/i)).toBeVisible(); // Adjust based on the expected min temperature
  }
});

test('displays error message on API failure', async ({ page }) => {
  await page.route('**/api.open-meteo.com/**', route =>
    route.fulfill({ status: 500 })
  );
  await page.goto('/');
  await expect(page.getByText(/Error fetching weather data/i)).toBeVisible(); // Assuming an error message is displayed
});

test('handles missing daily data gracefully', async ({ page }) => {
  await page.route('**/api.open-meteo.com/**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        current: { temperature: 70 },
        daily: {
          time: [],
          weather_code: [],
          temperature_2m_max: [],
          temperature_2m_min: [],
          precipitation_sum: [],
        },
      }),
    })
  );
  await page.goto('/');
  await expect(page.getByText(/No forecast data available/i)).toBeVisible(); // Assuming a message for no data
});
```

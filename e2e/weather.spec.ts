```typescript
// Covers: WeatherApp — critical user flows
// Implements: UI/E2E Tests — view weekly weather forecast
// Install required (if not present): @playwright/test
// Run: npx playwright test

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Stub the Open-Meteo API so tests are hermetic
  await page.route('**/api.open-meteo.com/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      daily: {
        time: ['2023-10-10', '2023-10-11', '2023-10-12', '2023-10-13', '2023-10-14', '2023-10-15', '2023-10-16'],
        weather_code: [0, 1, 2, 3, 4, 5, 6],
        temperature_2m_max: [70, 65, 68, 72, 75, 74, 73],
        temperature_2m_min: [50, 45, 48, 52, 55, 54, 53],
        precipitation_sum: [0.0, 0.1, 0.0, 0.2, 0.0, 0.0, 0.1],
      },
    }) })
  );
  await page.goto('/');
});

test('user can view the weekly forecast for Minneapolis, MN', async ({ page }) => {
  await expect(page.getByText('This Week')).toBeVisible();
  const dayCards = await page.locator('.day-card');
  expect(await dayCards.count()).toBe(7);
  
  for (let i = 0; i < 7; i++) {
    const dayName = await dayCards.nth(i).locator('.day-name').innerText();
    expect(dayName).toBeTruthy(); // Check that day name is rendered
    const highTemp = await dayCards.nth(i).locator('.day-high').innerText();
    expect(highTemp).toMatch(/°/); // Check that high temperature is rendered
    const lowTemp = await dayCards.nth(i).locator('.day-low').innerText();
    expect(lowTemp).toMatch(/°/); // Check that low temperature is rendered
    const precip = await dayCards.nth(i).locator('.day-precip').innerText();
    expect(precip).toMatch(/💧/); // Check that precipitation is rendered
  }
});
```

import { test, expect } from '@playwright/test';

const mockDailyData = {
  current: {
    temperature_2m: 72,
    relative_humidity_2m: 60,
    apparent_temperature: 70,
    precipitation: 0.1,
    weather_code: 1,
    wind_speed_10m: 10,
    is_day: 1,
    time: '2023-10-01T12:00',
  },
  daily: {
    time: ['2023-10-01', '2023-10-02', '2023-10-03', '2023-10-04', '2023-10-05', '2023-10-06', '2023-10-07'],
    temperature_2m_max: [75, 73, 70, 68, 72, 74, 71],
    temperature_2m_min: [55, 54, 52, 50, 53, 56, 54],
    weather_code: [1, 2, 3, 1, 0, 2, 1],
    precipitation_sum: [0.0, 0.1, 0.2, 0.0, 0.0, 0.1, 0.0],
  },
};

test.beforeEach(async ({ page }) => {
  await page.route('**/api.open-meteo.com/**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockDailyData),
    })
  );
  await page.goto('/');
});

test('displays weekly weather forecast for Minneapolis, MN', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /This Week in Minneapolis, MN/i })).toBeVisible();
});

test('renders temperature values for each day', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /This Week in Minneapolis, MN/i })).toBeVisible();
  await expect(page.getByText('75°')).toBeVisible();
  await expect(page.getByText('55°')).toBeVisible();
});

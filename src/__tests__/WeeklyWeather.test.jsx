// Covers: weekly weather forecast section of App.jsx
// Implements: Integration Tests - weekly state initialization and rendering

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

const mockData = {
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

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(mockData) })
  ));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('WeeklyWeather', () => {
  it('initializes weekly state and renders heading', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /This Week in Minneapolis, MN/i })).toBeInTheDocument();
    });
  });

  it('renders weekly forecast card with correct temperatures', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /This Week in Minneapolis, MN/i })).toBeVisible();
    });
    expect(screen.getByText('75°')).toBeInTheDocument();
    expect(screen.getByText('55°')).toBeInTheDocument();
  });

  it('renders a row for each day returned by the API', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /This Week in Minneapolis, MN/i })).toBeInTheDocument();
    });
    const highTemps = screen.getAllByText(/°$/);
    expect(highTemps.length).toBeGreaterThanOrEqual(7);
  });
});

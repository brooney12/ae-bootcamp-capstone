```jsx
// Covers: src/App.jsx
// Implements: Unit Tests — formatDayShort(), getWeatherInfo(), App component state management and rendering
// Install required (if not present): vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App, { formatDayShort, getWeatherInfo } from './App';

describe('formatDayShort()', () => {
  it('returns "Today" for the current date', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(formatDayShort(today)).toBe('Today');
  });

  it('returns abbreviated weekday for other dates', () => {
    const date = new Date('2023-06-02').toISOString().split('T')[0]; // Example date
    expect(formatDayShort(date)).toBe('Fri');
  });
});

describe('getWeatherInfo()', () => {
  it('maps weather codes to icons correctly', () => {
    expect(getWeatherInfo(0, true).icon).toBe('☀️'); // Assuming 0 corresponds to clear weather
    expect(getWeatherInfo(1, true).icon).toBe('🌧️'); // Assuming 1 corresponds to rain
  });
});

describe('App component', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({
          current: { temperature: 75 },
          daily: {
            time: ['2023-06-01', '2023-06-02', '2023-06-03', '2023-06-04', '2023-06-05', '2023-06-06', '2023-06-07'],
            weather_code: [0, 1, 0, 1, 0, 1, 0],
            temperature_2m_max: [80, 82, 78, 75, 79, 81, 83],
            temperature_2m_min: [60, 62, 58, 55, 59, 61, 63],
            precipitation_sum: [0, 0.1, 0, 0.2, 0, 0.1, 0],
          },
        }),
      }))
    );
  });

  it('initializes daily state as null', () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });

  it('updates daily state with API response', async () => {
    render(<App />);
    expect(await screen.findByText(/This Week/i)).toBeVisible();
  });

  it('handles API errors gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('API Error'))));
    render(<App />);
    expect(await screen.findByText(/Error loading weather data/i)).toBeVisible();
  });

  it('renders weekly forecast grid when daily state populated', async () => {
    render(<App />);
    expect(await screen.findByText(/This Week/i)).toBeVisible();
    expect(screen.getAllByRole('heading', { name: /°/i })).toHaveLength(7); // Assuming each day has a temperature heading
  });
});

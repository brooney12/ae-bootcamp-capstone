```jsx
// Covers: src/App.jsx
// Implements: Unit Tests — formatDayShort(), getWeatherInfo(), state initialization, weekly forecast rendering
// Install required (if not present): vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

describe('formatDayShort()', () => {
  it('correctly identifies today\'s date', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(formatDayShort(today)).toBe('Today');
  });

  it('correctly formats other dates', () => {
    expect(formatDayShort('2023-10-10')).toBe('Tue');
  });

  it('handles edge cases with invalid or empty input', () => {
    expect(formatDayShort(null)).toBeUndefined();
    expect(formatDayShort(undefined)).toBeUndefined();
    expect(formatDayShort('')).toBeUndefined();
    expect(formatDayShort('invalid-date')).toBeUndefined();
  });
});

describe('getWeatherInfo()', () => {
  it('returns correct weather icon for valid weather codes', () => {
    expect(getWeatherInfo(1, true)).toEqual({ icon: '☀️' }); // Assuming 1 is sunny
  });

  it('handles invalid weather codes gracefully', () => {
    expect(getWeatherInfo(999, false)).toEqual({ icon: '❓' }); // Assuming fallback icon
  });
});

describe('App component', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({
          current: { temperature: 70 },
          daily: {
            time: ['2023-10-10', '2023-10-11', '2023-10-12', '2023-10-13', '2023-10-14', '2023-10-15', '2023-10-16'],
            weather_code: [1, 2, 1, 3, 1, 2, 1],
            temperature_2m_max: [75, 76, 77, 78, 79, 80, 81],
            temperature_2m_min: [55, 56, 57, 58, 59, 60, 61],
            precipitation_sum: [0, 0.1, 0, 0, 0.2, 0, 0],
          },
        }),
      }))
    );
  });

  it('initializes daily state correctly', async () => {
    render(<App />);
    expect(await screen.findByText(/This Week/i)).toBeVisible();
  });

  it('renders weekly forecast correctly based on daily state', async () => {
    render(<App />);
    expect(await screen.findByText(/This Week/i)).toBeVisible();
    expect(screen.getByText(/Tue/i)).toBeVisible();
    expect(screen.getByText(/75°/i)).toBeVisible();
    expect(screen.getByText(/55°/i)).toBeVisible();
  });
});
```

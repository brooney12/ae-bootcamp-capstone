```jsx
// Covers: src/App.jsx
// Implements: Unit Tests — setDaily, getWeatherInfo(), weekly forecast rendering
// Install required (if not present): vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import '@testing-library/jest-dom';

describe('setDaily', () => {
  beforeEach(() => {
    // Mock the fetch API
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ daily: { time: [], weather_code: [], temperature_2m_max: [], temperature_2m_min: [], precipitation_sum: [] } }),
      })
    );
  });

  it('updates state with daily data', async () => {
    render(<App />);
    expect(await screen.findByText(/This Week/i)).toBeVisible(); // Check if the weekly forecast is rendered
  });
});

describe('getWeatherInfo()', () => {
  it('returns correct icon for weather code', () => {
    const icon = getWeatherInfo(0, true).icon; // Assuming 0 is a valid weather code for day
    expect(icon).toBe('☀️'); // Replace with the expected icon for weather code 0
  });
});

describe('Weekly forecast rendering', () => {
  it('renders the weekly forecast grid when daily state populated', async () => {
    const mockData = {
      daily: {
        time: ['2023-05-30', '2023-05-31', '2023-06-01', '2023-06-02', '2023-06-03', '2023-06-04', '2023-06-05'],
        weather_code: [0, 1, 2, 3, 4, 5, 6],
        temperature_2m_max: [75, 76, 77, 78, 79, 80, 81],
        temperature_2m_min: [55, 56, 57, 58, 59, 60, 61],
        precipitation_sum: [0, 0.1, 0, 0, 0.2, 0, 0],
      },
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(mockData),
      })
    );

    render(<App />);
    expect(await screen.findAllByRole('heading', { name: /°/i })).toHaveLength(7); // Expect 7 day cards to be rendered
  });
});

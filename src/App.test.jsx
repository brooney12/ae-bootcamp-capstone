```jsx
// Covers: src/App.jsx
// Implements: Unit Tests — formatDayShort(), API response parsing, rendering logic for day cards, error handling
// Install required (if not present): vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

describe('formatDayShort()', () => {
  it('returns "Today" for the current date', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(formatDayShort(today)).toBe('Today');
  });

  it('formats other days correctly', () => {
    expect(formatDayShort('2023-10-11')).toBe('Wed');
  });
});

describe('API response parsing for daily data', () => {
  it('correctly extracts daily data from API response', () => {
    const apiResponse = {
      daily: {
        time: ['2023-10-10', '2023-10-11'],
        weather_code: [0, 1],
        temperature_2m_max: [70, 65],
        temperature_2m_min: [50, 45],
        precipitation_sum: [0.0, 0.1],
      },
    };
    const parsedData = parseDailyData(apiResponse);
    expect(parsedData).toEqual({
      time: ['2023-10-10', '2023-10-11'],
      weather_code: [0, 1],
      temperature_2m_max: [70, 65],
      temperature_2m_min: [50, 45],
      precipitation_sum: [0.0, 0.1],
    });
  });
});

describe('Rendering logic for day-card', () => {
  it('renders day card with correct elements', () => {
    const mockDailyData = {
      time: ['2023-10-10'],
      weather_code: [0],
      temperature_2m_max: [70],
      temperature_2m_min: [50],
      precipitation_sum: [0.0],
    };

    render(<App daily={mockDailyData} />);

    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('70°')).toBeInTheDocument();
    expect(screen.getByText('50°')).toBeInTheDocument();
    expect(screen.getByText('💧 0.00"')).toBeInTheDocument();
  });
});

describe('Error handling for API failure', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('API failure'))));
  });

  it('updates error state on API failure', async () => {
    render(<App />);
    expect(await screen.findByText(/API failure/i)).toBeInTheDocument();
  });
});
```

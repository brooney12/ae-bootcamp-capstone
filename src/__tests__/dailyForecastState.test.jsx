```jsx
// Covers: src/App.jsx
// Implements: Unit Tests — Daily forecast state initialization
// Install required (if not present): vitest @testing-library/react @testing-library/jest-dom

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App'; // Adjust the import based on your actual App component
import '@testing-library/jest-dom';

describe('Daily forecast state initialization', () => {
  it('correctly populates daily state with valid API response', async () => {
    const mockResponse = {
      daily: {
        time: ['2023-06-01', '2023-06-02', '2023-06-03'],
        weather_code: [0, 1, 2],
        temperature_2m_max: [75, 80, 85],
        temperature_2m_min: [55, 60, 65],
        precipitation_sum: [0, 0.1, 0],
      },
    };

    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      json: () => Promise.resolve(mockResponse),
    })));

    render(<App />);

    // Wait for the daily forecast to be rendered
    expect(await screen.findByText(/This Week/i)).toBeVisible();
    expect(screen.getAllByRole('heading', { name: /°/i })).toHaveLength(3); // Adjust based on expected number of cards
  });

  it('handles missing or malformed daily data gracefully', async () => {
    const mockResponse = {
      daily: {
        time: [],
        weather_code: [],
        temperature_2m_max: [],
        temperature_2m_min: [],
        precipitation_sum: [],
      },
    };

    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      json: () => Promise.resolve(mockResponse),
    })));

    render(<App />);

    // Wait for the daily forecast to be rendered
    expect(await screen.findByText(/This Week/i)).toBeVisible();
    expect(screen.queryByRole('heading', { name: /°/i })).toBeNull(); // No cards should be rendered
  });
});

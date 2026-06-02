```jsx
// Covers: src/App.jsx
// Implements: Integration Tests — Open-Meteo API call for daily forecast, state update after API
// Install required (if not present): vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App'; // Adjust the import path as necessary

vi.stubGlobal('fetch', vi.fn());

describe('Integration Tests', () => {
  it('fetches daily forecast data from Open-Meteo API', async () => {
    fetch.mockResolvedValueOnce({
      json: async () => ({
        daily: {
          time: ['2023-06-01', '2023-06-02', '2023-06-03'],
          weather_code: [0, 1, 2],
          temperature_2m_max: [75, 80, 78],
          temperature_2m_min: [55, 60, 58],
          precipitation_sum: [0, 0.1, 0.2],
        },
      }),
    });

    render(<App />);

    expect(await screen.findByText(/This Week/i)).toBeVisible();
    expect(screen.getAllByRole('heading', { name: /°/i })).toHaveLength(3); // Check for 3 day cards
  });

  it('updates daily state after API call', async () => {
    fetch.mockResolvedValueOnce({
      json: async () => ({
        daily: {
          time: ['2023-06-01', '2023-06-02', '2023-06-03'],
          weather_code: [0, 1, 2],
          temperature_2m_max: [75, 80, 78],
          temperature_2m_min: [55, 60, 58],
          precipitation_sum: [0, 0.1, 0.2],
        },
      }),
    });

    render(<App />);

    expect(await screen.findByText(/This Week/i)).toBeVisible();
    expect(screen.getAllByRole('heading', { name: /°/i })).toHaveLength(3); // Check for 3 day cards
  });
});

```jsx
// Covers: src/App.jsx
// Implements: Integration Tests — API request for daily weather data and rendering of weekly forecast grid
// Install required (if not present): vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App'; // Adjust the import based on actual component export

vi.stubGlobal('fetch', vi.fn());

describe('App Integration Tests', () => {
  beforeEach(() => {
    fetch.mockResolvedValueOnce({
      json: async () => ({
        current: {},
        daily: {
          time: ["2023-10-01", "2023-10-02", "2023-10-03"],
          weather_code: [1, 2, 1],
          temperature_2m_max: [70, 75, 80],
          temperature_2m_min: [50, 55, 60],
          precipitation_sum: [0, 0.1, 0],
        },
      }),
    });
  });

  it('fetches daily weather data and populates state', async () => {
    render(<App />);
    expect(await screen.findByText(/This Week/i)).toBeVisible();
    expect(screen.getAllByRole('heading', { name: /°/i })).toHaveLength(3); // Check for 3 day cards
  });

  it('renders the weekly forecast grid with correct data', async () => {
    render(<App />);
    expect(await screen.findByText(/This Week/i)).toBeVisible();
    expect(screen.getByText(/70°/i)).toBeVisible();
    expect(screen.getByText(/75°/i)).toBeVisible();
    expect(screen.getByText(/80°/i)).toBeVisible();
  });

  it('displays an error message on API failure', async () => {
    fetch.mockRejectedValueOnce(new Error('API failure'));
    render(<App />);
    expect(await screen.findByText(/Error fetching data/i)).toBeVisible();
  });
});

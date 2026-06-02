```jsx
// Covers: src/App.jsx
// Implements: Unit Tests — rendering of day-card elements, App component state, error handling for API fetch
// Install required (if not present): vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App'; // Adjust the import path as necessary

vi.stubGlobal('fetch', vi.fn());

describe('App component', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('renders day-card elements with correct data', async () => {
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

    // Wait for the component to update with fetched data
    expect(await screen.findByText(/This Week/i)).toBeVisible();
    expect(screen.getAllByRole('heading', { name: /°/i })).toHaveLength(3); // Check for 3 day cards
  });

  it('sets error state on API fetch failure', async () => {
    fetch.mockRejectedValueOnce(new Error('API failure'));

    render(<App />);

    // Wait for the component to update with error state
    expect(await screen.findByText(/Error loading data/i)).toBeVisible();
  });
});

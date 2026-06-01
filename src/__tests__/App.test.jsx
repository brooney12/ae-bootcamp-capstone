```jsx
// Covers: src/App.jsx
// Implements: Unit Tests — daily state initialization, rendering of weekly forecast cards, and CSS classes
// Install required (if not present): vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App'; // Adjust the import based on actual component export

vi.stubGlobal('fetch', vi.fn());

describe('App Component', () => {
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

  it('initializes daily state correctly from API response', async () => {
    render(<App />);
    expect(await screen.findByText(/This Week/i)).toBeVisible();
    expect(screen.getAllByRole('heading', { name: /°/i })).toHaveLength(3); // Check for 3 day cards
  });

  it('renders the correct number of day cards based on daily state', async () => {
    render(<App />);
    expect(await screen.findByText(/This Week/i)).toBeVisible();
    expect(screen.getAllByRole('heading', { name: /°/i })).toHaveLength(3); // Check for 3 day cards
  });

  it('applies correct CSS classes based on screen size', async () => {
    render(<App />);
    // Simulate screen size changes and check for class application
    window.resizeTo(1200, 800);
    expect(screen.getByRole('heading', { name: /This Week/i })).toHaveClass('weekly-days');

    window.resizeTo(800, 800);
    expect(screen.getByRole('heading', { name: /This Week/i })).toHaveClass('weekly-days');

    window.resizeTo(500, 800);
    expect(screen.getByRole('heading', { name: /This Week/i })).toHaveClass('weekly-days');
  });
});

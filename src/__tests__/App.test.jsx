```jsx
// Covers: src/App.jsx
// Implements: Unit Tests — state initialization for daily
// Install required (if not present): vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App'; // Adjust the import path as necessary

vi.stubGlobal('fetch', vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({
      current: {},
      daily: {
        time: ['2023-06-01', '2023-06-02'],
        weather_code: [0, 1],
        temperature_2m_max: [75, 76],
        temperature_2m_min: [55, 56],
        precipitation_sum: [0, 0.1],
      },
    }),
  }))
);

describe('App', () => {
  it('initializes daily state correctly when API data is fetched', async () => {
    render(<App />);
    expect(await screen.findByText(/This Week/i)).toBeInTheDocument();
    expect(screen.getByText(/75°/i)).toBeInTheDocument();
  });
});

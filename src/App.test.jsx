```jsx
// Covers: src/App.jsx
// Implements: Unit Tests — App component state management and rendering
// Install required (if not present): vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  beforeEach(() => {
    // Mock the fetch call to the Open-Meteo API
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ daily: [{ temperature_2m_max: 75, temperature_2m_min: 55, weathercode: 0, precipitation_sum: 0 }] }),
      })
    );
  });

  it('initializes weekly state correctly', () => {
    render(<App />);
    // Assuming the initial state is null
    expect(screen.getByText(/loading/i)).toBeInTheDocument(); // Adjust based on actual loading state
  });

  it('updates weekly state after API call', async () => {
    render(<App />);
    // Wait for the API call to complete and the state to update
    expect(await screen.findByText(/75/i)).toBeInTheDocument(); // Check for the max temperature
  });

  it('renders weekly forecast card when weekly state is populated', async () => {
    render(<App />);
    expect(await screen.findByText(/weekly forecast/i)).toBeInTheDocument(); // Adjust based on actual content
  });
});

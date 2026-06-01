```jsx
// Covers: src/App.jsx
// Implements: Unit Tests — API data parsing, rendering of daily forecast cards, CSS class application
// Install required (if not present): vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App'; // Adjust the import based on actual file structure

describe('API data parsing', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({
          daily: {
            time: ['2023-06-01', '2023-06-02'],
            weather_code: [0, 1],
            temperature_2m_max: [75, 80],
            temperature_2m_min: [55, 60],
            precipitation_sum: [0, 0],
          },
        }),
      }))
    ));
  });

  it('populates daily state correctly with valid data', async () => {
    render(<App />);
    expect(await screen.findByText(/This Week/i)).toBeVisible();
    expect(screen.getByText(/75°/i)).toBeVisible();
    expect(screen.getByText(/55°/i)).toBeVisible();
  });

  it('handles missing fields gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({
          daily: {
            time: ['2023-06-01'],
            weather_code: [],
            temperature_2m_max: [],
            temperature_2m_min: [],
            precipitation_sum: [],
          },
        }),
      }))
    ));
    render(<App />);
    expect(await screen.findByText(/This Week/i)).toBeVisible();
    expect(screen.queryByText(/75°/i)).toBeNull();
  });
});

describe('Rendering of daily forecast cards', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({
          daily: {
            time: ['2023-06-01', '2023-06-02'],
            weather_code: [0, 1],
            temperature_2m_max: [75, 80],
            temperature_2m_min: [55, 60],
            precipitation_sum: [0, 0],
          },
        }),
      }))
    ));
  });

  it('renders daily forecast cards correctly', async () => {
    render(<App />);
    expect(await screen.findByText(/This Week/i)).toBeVisible();
    expect(screen.getByText(/Today/i)).toBeVisible();
    expect(screen.getByText(/75°/i)).toBeVisible();
    expect(screen.getByText(/55°/i)).toBeVisible();
  });

  it('does not render cards when daily state is empty', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({
          daily: {
            time: [],
            weather_code: [],
            temperature_2m_max: [],
            temperature_2m_min: [],
            precipitation_sum: [],
          },
        }),
      }))
    ));
    render(<App />);
    expect(await screen.findByText(/This Week/i)).toBeVisible();
    expect(screen.queryByText(/75°/i)).toBeNull();
  });
});

describe('CSS class application', () => {
  it('applies correct CSS classes to weekly forecast section', async () => {
    render(<App />);
    expect(await screen.findByText(/This Week/i)).toHaveClass('weekly-forecast');
    expect(screen.getByText(/This Week/i).parentElement).toHaveClass('weekly-days');
  });
});
```

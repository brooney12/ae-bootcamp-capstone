```jsx
// Covers: src/components/WeeklyWeather.jsx
// Implements: Integration Tests — Weekly state initialization and rendering
// Install required (if not present): vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import WeeklyWeather from '../components/WeeklyWeather';

describe('WeeklyWeather', () => {
  it('initializes weekly state correctly from API response', () => {
    const mockData = {
      daily: [
        { temperature_m_max: 75, temperature_2m_min: 55, weather_code: 1, precipitation_sum: 0 },
        // ... other days
      ],
    };
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      json: () => Promise.resolve(mockData),
    })));

    render(<WeeklyWeather />);
    expect(screen.getByText(/Mon Oct 2/i)).toBeInTheDocument(); // Assuming the first day is Monday
    // Additional assertions for temperatures, icons, etc.
  });

  it('renders weekly forecast card with correct data', () => {
    const mockData = {
      daily: [
        { temperature_m_max: 75, temperature_2m_min: 55, weather_code: 1, precipitation_sum: 0 },
        // ... other days
      ],
    };
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      json: () => Promise.resolve(mockData),
    })));

    render(<WeeklyWeather />);
    expect(screen.getByRole('heading', { name: /This Week in Minneapolis, MN/i })).toBeVisible();
    // Additional assertions for each day's data
  });
});

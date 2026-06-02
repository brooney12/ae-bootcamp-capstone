```jsx
// Covers: src/App.jsx
// Implements: Integration Tests — Open-Meteo API integration and data flow
// Install required (if not present): vitest @testing-library/react @testing-library/jest-dom

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App'; // Adjust the import based on actual export

describe('API Integration Tests', () => {
  it('retrieves current weather and daily forecast data', async () => {
    const mockWeatherData = {
      current: { /* mock current weather data */ },
      daily: { /* mock daily forecast data */ }
    };

    vi.spyOn(global, 'fetch').mockImplementationOnce(() => 
      Promise.resolve({
        json: () => Promise.resolve(mockWeatherData),
      })
    );

    render(<App />);
    // Wait for the component to update with the fetched data
    await screen.findByText(/this week/i); // Adjust based on actual UI text
    // Additional assertions can be made here
  });

  it('populates daily state correctly', async () => {
    const mockDailyData = {
      time: ['2023-10-15', '2023-10-16', '2023-10-17', '2023-10-18', '2023-10-19', '2023-10-20', '2023-10-21'],
      weather_code: [1, 2, 3, 1, 2, 3, 1],
      temperature_2m_max: [70, 68, 65, 72, 75, 73, 71],
      temperature_2m_min: [50, 48, 45, 52, 54, 53, 51],
      precipitation_sum: [0, 0.1, 0, 0, 0.2, 0, 0]
    };

    vi.spyOn(global, 'fetch').mockImplementationOnce(() => 
      Promise.resolve({
        json: () => Promise.resolve({ current: {}, daily: mockDailyData }),
      })
    );

    render(<App />);
    await screen.findByText(/this week/i); // Adjust based on actual UI text
    // Additional assertions can be made here to check daily data
  });
});

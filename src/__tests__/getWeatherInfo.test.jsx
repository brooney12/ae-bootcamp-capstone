```jsx
// Covers: src/App.jsx
// Implements: Unit Tests — getWeatherInfo() function
// Install required (if not present): vitest @testing-library/react @testing-library/jest-dom

import { describe, it, expect } from 'vitest';
import { getWeatherInfo } from '../App'; // Adjust the import based on your actual file structure

describe('getWeatherInfo()', () => {
  it('correctly maps weather codes to expected icons and descriptions', () => {
    expect(getWeatherInfo(0, true)).toEqual({ icon: '☀️', description: 'Clear Sky' });
    expect(getWeatherInfo(1, true)).toEqual({ icon: '🌤️', description: 'Partly Cloudy' });
  });

  it('handles unknown weather codes and ensures fallback behavior', () => {
    expect(getWeatherInfo(999, true)).toEqual({ icon: '❓', description: 'Unknown Weather' });
  });
});

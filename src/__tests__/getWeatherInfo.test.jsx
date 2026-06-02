```jsx
// Covers: src/App.jsx
// Implements: Unit Tests — getWeatherInfo() mapping
// Install required (if not present): vitest @testing-library/react @testing-library/jest-dom

import { describe, it, expect } from 'vitest';
import { getWeatherInfo } from '../App'; // Adjust the import based on actual export

describe('getWeatherInfo()', () => {
  it('returns correct icon and description for code 1 during the day', () => {
    const result = getWeatherInfo(1, true);
    expect(result).toEqual({ icon: '☀️', description: 'Clear' });
  });

  it('returns correct icon and description for code 3 during the night', () => {
    const result = getWeatherInfo(3, false);
    expect(result).toEqual({ icon: '🌙', description: 'Partly cloudy' });
  });
});

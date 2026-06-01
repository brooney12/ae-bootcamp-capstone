```jsx
// Covers: src/utils/getWeatherInfo.js
// Implements: Unit Tests — getWeatherInfo() for daily weather codes
// Install required (if not present): vitest @testing-library/react @testing-library/jest-dom

import { describe, it, expect } from 'vitest';
import { getWeatherInfo } from './utils'; // Adjust the import path as necessary

describe('getWeatherInfo()', () => {
  it('returns correct day icon and description for valid weather code and isDay=true', () => {
    const { icon, description } = getWeatherInfo(0, true);
    expect(icon).toBe('☀️'); // Assuming 0 corresponds to sunny
    expect(description).toBe('Clear Sky');
  });

  it('returns correct night icon and description for valid weather code and isDay=false', () => {
    const { icon, description } = getWeatherInfo(1, false);
    expect(icon).toBe('🌙'); // Assuming 1 corresponds to clear night
    expect(description).toBe('Clear Night');
  });

  it('returns default fallback icon for invalid weather code', () => {
    const { icon, description } = getWeatherInfo(-1, true);
    expect(icon).toBe('❓'); // Assuming fallback icon
    expect(description).toBe('Unknown Weather');
  });
});

```jsx
// Covers: src/utils/getWeatherInfo.js
// Implements: Unit Tests — getWeatherInfo function
// Install required (if not present): vitest @testing-library/react @testing-library/jest-dom

import { describe, it, expect } from 'vitest';
import { getWeatherInfo } from './getWeatherInfo';

describe('getWeatherInfo', () => {
  it('returns sun icon for daytime weather code', () => {
    expect(getWeatherInfo(1, true)).toBe('☀️');
  });

  it('returns moon icon for nighttime weather code', () => {
    expect(getWeatherInfo(1, false)).toBe('🌙');
  });
});

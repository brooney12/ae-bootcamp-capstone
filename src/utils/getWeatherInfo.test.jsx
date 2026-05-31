// Covers: src/utils/getWeatherInfo.js
// Implements: Unit Tests - getWeatherInfo function

import { describe, it, expect } from 'vitest';
import { getWeatherInfo } from './getWeatherInfo';

describe('getWeatherInfo', () => {
  it('returns clear sky icon for daytime weather code 0', () => {
    expect(getWeatherInfo(0, true).icon).toBe('☀️');
  });

  it('returns mainly clear icon for daytime weather code 1', () => {
    expect(getWeatherInfo(1, true).icon).toBe('🌤️');
  });

  it('returns moon icon for nighttime weather code 1', () => {
    expect(getWeatherInfo(1, false).icon).toBe('🌙');
  });

  it('returns label for a known code', () => {
    expect(getWeatherInfo(3, true).label).toBe('Overcast');
  });

  it('returns unknown fallback for unrecognised code', () => {
    expect(getWeatherInfo(999, true).label).toBe('Unknown');
  });
});

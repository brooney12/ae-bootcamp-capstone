// Covers: src/utils/formatDay.js
// Implements: Unit Tests - formatDayShort function

import { describe, it, expect } from 'vitest';
import { formatDayShort } from './formatDay';

describe('formatDayShort', () => {
  it('returns Today for the current date', () => {
    const today = new Date();
    const pad = n => String(n).padStart(2, '0');
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    expect(formatDayShort(todayStr)).toBe('Today');
  });

  it('returns short weekday format for non-today dates', () => {
    // Oct 2, 2023 was a Monday
    const result = formatDayShort('2023-10-02');
    expect(result).toMatch(/Mon/);
    expect(result).toMatch(/Oct/);
    expect(result).toMatch(/2/);
  });

  it('handles invalid date gracefully', () => {
    expect(formatDayShort('invalid-date')).toBe('Invalid Date');
  });
});

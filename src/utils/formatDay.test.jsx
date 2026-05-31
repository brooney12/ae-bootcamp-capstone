```jsx
// Covers: src/utils/formatDay.js
// Implements: Unit Tests — formatDayShort function
// Install required (if not present): vitest @testing-library/react @testing-library/jest-dom

import { describe, it, expect } from 'vitest';
import { formatDayShort } from './formatDay';

describe('formatDayShort', () => {
  it('returns "Today" for the current date', () => {
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
    expect(formatDayShort(today)).toBe('Today');
  });

  it('returns short weekday format for non-today dates', () => {
    expect(formatDayShort('2023-10-02')).toBe('Mon Oct 2');
  });

  it('handles invalid date gracefully', () => {
    expect(formatDayShort('invalid-date')).toBe('Invalid Date');
  });
});

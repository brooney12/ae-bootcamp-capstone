```jsx
// Covers: src/App.jsx
// Implements: Unit Tests — formatDayShort() helper
// Install required (if not present): vitest @testing-library/react @testing-library/jest-dom

import { describe, it, expect } from 'vitest';
import { formatDayShort } from '../App'; // Adjust the import based on your actual file structure

describe('formatDayShort()', () => {
  it('returns correct short weekday names for valid date strings', () => {
    expect(formatDayShort('2023-06-01')).toBe('Thu');
    expect(formatDayShort('2023-06-02')).toBe('Fri');
  });

  it('returns "Today" when the input matches the current date', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(formatDayShort(today)).toBe('Today');
  });

  it('handles invalid date strings gracefully', () => {
    expect(formatDayShort('invalid-date')).toBeNaN();
  });
});

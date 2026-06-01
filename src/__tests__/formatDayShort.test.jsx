```jsx
// Covers: src/App.jsx
// Implements: Unit Tests — formatDayShort function
// Install required (if not present): vitest @testing-library/react @testing-library/jest-dom

import { describe, it, expect } from 'vitest';
import { formatDayShort } from '../App'; // Adjust the import based on actual function export

describe('formatDayShort()', () => {
  it('returns "Today" for today\'s date', () => {
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
    expect(formatDayShort(today)).toBe('Today');
  });

  it('returns "Mon" for a Monday date', () => {
    expect(formatDayShort('2023-10-02')).toBe('Mon');
  });

  it('returns "Tue" for a Tuesday date', () => {
    expect(formatDayShort('2023-10-03')).toBe('Tue');
  });
});

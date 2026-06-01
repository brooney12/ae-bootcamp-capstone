```jsx
// Covers: src/utils/formatDayShort.js
// Implements: Unit Tests — formatDayShort() helper function
// Install required (if not present): vitest @testing-library/react @testing-library/jest-dom

import { describe, it, expect } from 'vitest';
import { formatDayShort } from './utils'; // Adjust the import path as necessary

describe('formatDayShort()', () => {
  it('returns "Today" for current date', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(formatDayShort(today)).toBe('Today');
  });

  it('returns correct abbreviated weekday name for a past date', () => {
    const pastDate = '2023-05-29'; // Monday
    expect(formatDayShort(pastDate)).toBe('Mon');
  });

  it('returns correct abbreviated weekday name for a future date', () => {
    const futureDate = '2023-06-05'; // Monday
    expect(formatDayShort(futureDate)).toBe('Mon');
  });
});

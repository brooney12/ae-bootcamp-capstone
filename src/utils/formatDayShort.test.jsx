```jsx
// Covers: src/utils/formatDayShort.js
// Implements: Unit Tests — formatDayShort helper function
// Install required (if not present): vitest @testing-library/react @testing-library/jest-dom

import { describe, it, expect } from 'vitest';
import { formatDayShort } from './utils'; // Adjust the import path as necessary

describe('formatDayShort', () => {
  it('returns "Today" for today\'s date', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(formatDayShort(today)).toBe('Today');
  });

  it('returns short weekday name for a past date', () => {
    const pastDate = new Date('2023-06-01').toISOString().split('T')[0]; // Example past date
    expect(formatDayShort(pastDate)).toBe('Thu');
  });

  it('returns short weekday name for a future date', () => {
    const futureDate = new Date('2023-06-05').toISOString().split('T')[0]; // Example future date
    expect(formatDayShort(futureDate)).toBe('Mon');
  });
});

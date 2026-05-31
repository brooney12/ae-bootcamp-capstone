```jsx
// Covers: src/utils/formatDayShort.js
// Implements: Unit Tests — formatDayShort function
// Install required (if not present): vitest @testing-library/react @testing-library/jest-dom

import { describe, it, expect } from 'vitest';
import { formatDayShort } from '../utils/formatDayShort';

describe('formatDayShort', () => {
  it('returns "Today" for the current date', () => {
    const currentDate = new Date('2023-10-01').toISOString().split('T')[0]; // Mock current date
    expect(formatDayShort(currentDate)).toBe('Today');
  });

  it('returns short format for other dates', () => {
    expect(formatDayShort('2023-10-02')).toBe('Mon Oct 2');
  });
});

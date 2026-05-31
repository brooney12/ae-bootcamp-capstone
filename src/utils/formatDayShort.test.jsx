```jsx
// Covers: src/utils/formatDayShort.js
// Implements: Unit Tests — formatDayShort() function
// Install required (if not present): vitest @testing-library/react @testing-library/jest-dom

import { describe, it, expect } from 'vitest';
import { formatDayShort } from '../utils/formatDayShort'; // Adjust the import path as necessary

describe('formatDayShort()', () => {
  it('returns "Today" for the current date', () => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // Format YYYY-MM-DD
    expect(formatDayShort(todayString)).toBe('Today');
  });

  it('returns abbreviated weekday for other dates', () => {
    const date = new Date('2023-05-30'); // Example date
    const dateString = date.toISOString().split('T')[0]; // Format YYYY-MM-DD
    expect(formatDayShort(dateString)).toBe('Tue'); // Assuming the date is a Tuesday
  });
});

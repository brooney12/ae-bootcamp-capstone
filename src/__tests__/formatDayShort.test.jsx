```jsx
// Covers: src/App.jsx
// Implements: Unit Tests — formatDayShort function
// Install required (if not present): vitest @testing-library/react @testing-library/jest-dom

import { describe, it, expect } from 'vitest';
import { formatDayShort } from '../App'; // Adjust the import based on your actual function export

describe('formatDayShort', () => {
  it('returns "Today" for the current date', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(formatDayShort(today)).toBe('Today');
  });

  it('returns the correct weekday abbreviation for a past date', () => {
    const pastDate = '2023-05-30'; // Example past date
    expect(formatDayShort(pastDate)).toBe('Tue');
  });

  it('returns the correct weekday abbreviation for a future date', () => {
    const futureDate = '2023-06-05'; // Example future date
    expect(formatDayShort(futureDate)).toBe('Mon');
  });
});

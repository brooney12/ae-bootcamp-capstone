```jsx
// Covers: src/App.jsx
// Implements: Unit Tests — formatDayShort() helper
// Install required (if not present): vitest @testing-library/react @testing-library/jest-dom

import { describe, it, expect } from 'vitest';
import { formatDayShort } from '../App'; // Adjust the import based on actual export

describe('formatDayShort()', () => {
  it('returns "Today" for the current date', () => {
    const currentDate = new Date().toISOString().split('T')[0];
    expect(formatDayShort(currentDate)).toBe('Today');
  });

  it('returns short weekday name for a non-current date', () => {
    expect(formatDayShort('2023-10-15')).toBe('Sun');
  });
});

```jsx
// Covers: src/utils.js
// Implements: Unit Tests — formatDayShort() helper
// Install required (if not present): vitest @testing-library/react @testing-library/jest-dom

import { describe, it, expect } from 'vitest';
import { formatDayShort } from './utils'; // Adjust the import based on actual file structure

describe('formatDayShort()', () => {
  it('returns "Today" for today\'s date', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(formatDayShort(today)).toBe('Today');
  });

  it('returns correct weekday abbreviation for a future date', () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString().split('T')[0]; // Tomorrow
    expect(formatDayShort(futureDate)).toBe('Tue'); // Adjust based on the actual day
  });
});
```

```jsx
// Covers: src/App.jsx
// Implements: Unit Tests — getWeatherInfo function
// Install required (if not present): vitest @testing-library/react @testing-library/jest-dom

import { describe, it, expect } from 'vitest';
import { getWeatherInfo } from '../App'; // Adjust the import based on your actual function export

describe('getWeatherInfo', () => {
  it('returns correct icon and description for valid weather code', () => {
    const { icon, description } = getWeatherInfo(0, true); // Example valid code
    expect(icon).toBe('☀️'); // Replace with actual expected icon
    expect(description).toBe('Clear Sky'); // Replace with actual expected description
  });

  it('returns default icon and description for invalid weather code', () => {
    const { icon, description } = getWeatherInfo(-1, true); // Example invalid code
    expect(icon).toBe('❓'); // Replace with actual default icon
    expect(description).toBe('Unknown Weather'); // Replace with actual default description
  });
});

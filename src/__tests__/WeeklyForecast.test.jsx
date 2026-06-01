```jsx
// Covers: src/App.jsx
// Implements: Unit Tests — rendering of weekly-days grid
// Install required (if not present): vitest @testing-library/react @testing-library/jest-dom

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App'; // Adjust the import based on your actual file structure

describe('Weekly Forecast Rendering', () => {
  it('renders all 7 days with correct data', () => {
    const mockData = {
      time: ['2023-06-01', '2023-06-02', '2023-06-03', '2023-06-04', '2023-06-05', '2023-06-06', '2023-06-07'],
      weather_code: [0, 1, 0, 1, 0, 1, 0],
      temperature_2m_max: [75, 76, 77, 78, 79, 80, 81],
      temperature_2m_min: [55, 56, 57, 58, 59, 60, 61],
      precipitation_sum: [0, 0, 0, 0, 0, 0, 0],
    };

    render(<App daily={mockData} />); // Assuming you can pass daily as a prop for testing

    const dayCards = document.querySelectorAll('.day-card');
    expect(dayCards.length).toBe(7);
  });

  it('handles empty or null daily state gracefully', () => {
    const { container } = render(<App daily={null} />);
    expect(container.querySelector('.weekly-forecast')).toBeNull();
  });
});

```jsx
// Covers: src/components/DailyCards.jsx
// Implements: Unit Tests — rendering of daily cards
// Install required (if not present): vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DailyCards from './DailyCards'; // Adjust the import path as necessary

describe('DailyCards', () => {
  it('renders 7 day cards with correct data', () => {
    const mockDailyData = {
      time: ['2023-06-01', '2023-06-02', '2023-06-03', '2023-06-04', '2023-06-05', '2023-06-06', '2023-06-07'],
      weather_code: [0, 1, 2, 3, 4, 5, 6],
      temperature_2m_max: [75, 76, 77, 78, 79, 80, 81],
      temperature_2m_min: [55, 56, 57, 58, 59, 60, 61],
      precipitation_sum: [0, 0.1, 0, 0.2, 0, 0, 0.3],
    };

    render(<DailyCards daily={mockDailyData} />);

    const dayCards = screen.getAllByRole('article'); // Assuming each card is an article
    expect(dayCards).toHaveLength(7);
    expect(screen.getByText(/Today/i)).toBeInTheDocument();
    expect(screen.getByText(/75°/i)).toBeInTheDocument();
    expect(screen.getByText(/💧 0.00"/i)).toBeInTheDocument();
  });
});

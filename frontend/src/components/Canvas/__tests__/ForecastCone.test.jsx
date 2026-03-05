import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { lightTheme } from '../../../styles/theme';

vi.mock('react-chartjs-2', () => ({
  Line: ({ data, options }) => (
    <div data-testid="chartjs-forecast-line">
      <span data-testid="forecast-labels">{JSON.stringify(data?.labels)}</span>
      <span data-testid="forecast-datasets">{data?.datasets?.length ?? 0}</span>
    </div>
  ),
}));

import ForecastCone from '../charts/ForecastCone';

const renderWithTheme = (ui) =>
  render(<ThemeProvider theme={lightTheme}>{ui}</ThemeProvider>);

describe('ForecastCone', () => {
  const validData = {
    dates: ['2024-01', '2024-02', '2024-03', '2024-04'],
    actual: [100, 120, null, null],
    forecast: [100, 120, 140, 160],
    upper: [100, 130, 160, 190],
    lower: [100, 110, 120, 130],
  };

  it('renders empty state when data is null', () => {
    renderWithTheme(<ForecastCone data={null} />);
    expect(screen.getByTestId('forecast-cone-empty')).toBeInTheDocument();
  });

  it('renders empty state when dates are empty', () => {
    renderWithTheme(<ForecastCone data={{ dates: [] }} />);
    expect(screen.getByTestId('forecast-cone-empty')).toBeInTheDocument();
  });

  it('renders the chart with valid data', () => {
    renderWithTheme(<ForecastCone data={validData} title="Revenue Forecast" />);
    expect(screen.getByTestId('forecast-cone')).toBeInTheDocument();
    expect(screen.getByTestId('chartjs-forecast-line')).toBeInTheDocument();
  });

  it('passes date labels to chart', () => {
    renderWithTheme(<ForecastCone data={validData} />);
    expect(screen.getByTestId('forecast-labels').textContent).toBe(
      JSON.stringify(['2024-01', '2024-02', '2024-03', '2024-04'])
    );
  });

  it('creates 4 datasets (upper, lower, forecast, actual)', () => {
    renderWithTheme(<ForecastCone data={validData} />);
    expect(screen.getByTestId('forecast-datasets').textContent).toBe('4');
  });

  it('handles data with only dates and actual', () => {
    const partialData = {
      dates: ['2024-01', '2024-02'],
      actual: [100, 120],
    };
    renderWithTheme(<ForecastCone data={partialData} />);
    expect(screen.getByTestId('forecast-cone')).toBeInTheDocument();
    // Only the actual dataset
    expect(screen.getByTestId('forecast-datasets').textContent).toBe('1');
  });
});

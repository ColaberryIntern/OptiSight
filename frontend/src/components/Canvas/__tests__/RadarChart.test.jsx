import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { lightTheme } from '../../../styles/theme';

vi.mock('react-chartjs-2', () => ({
  Radar: ({ data, options }) => (
    <div data-testid="chartjs-radar">
      <span data-testid="chartjs-radar-labels">{JSON.stringify(data?.labels)}</span>
      <span data-testid="chartjs-radar-datasets">{data?.datasets?.length ?? 0}</span>
    </div>
  ),
}));

import RadarChart from '../charts/RadarChart';

const renderWithTheme = (ui) =>
  render(<ThemeProvider theme={lightTheme}>{ui}</ThemeProvider>);

describe('RadarChart', () => {
  const validData = {
    labels: ['Speed', 'Power', 'Accuracy', 'Durability', 'Range'],
    datasets: [
      { label: 'Store A', data: [80, 90, 70, 60, 85] },
      { label: 'Store B', data: [60, 70, 90, 80, 75] },
    ],
  };

  it('renders empty state when data is null', () => {
    renderWithTheme(<RadarChart data={null} />);
    expect(screen.getByTestId('radar-chart-empty')).toBeInTheDocument();
  });

  it('renders empty state when labels are empty', () => {
    renderWithTheme(<RadarChart data={{ labels: [], datasets: [] }} />);
    expect(screen.getByTestId('radar-chart-empty')).toBeInTheDocument();
  });

  it('renders the chart with valid data', () => {
    renderWithTheme(<RadarChart data={validData} title="Performance" />);
    expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('chartjs-radar')).toBeInTheDocument();
  });

  it('passes correct labels and dataset count', () => {
    renderWithTheme(<RadarChart data={validData} />);
    expect(screen.getByTestId('chartjs-radar-labels').textContent).toBe(
      JSON.stringify(['Speed', 'Power', 'Accuracy', 'Durability', 'Range'])
    );
    expect(screen.getByTestId('chartjs-radar-datasets').textContent).toBe('2');
  });
});

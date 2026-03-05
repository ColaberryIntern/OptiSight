import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { lightTheme } from '../../../styles/theme';

vi.mock('react-chartjs-2', () => ({
  Bar: ({ data, options }) => (
    <div data-testid="chartjs-bar">
      <span data-testid="chartjs-bar-labels">{JSON.stringify(data?.labels)}</span>
      <span data-testid="chartjs-bar-datasets">{data?.datasets?.length ?? 0}</span>
    </div>
  ),
}));

import BarChart from '../charts/BarChart';

const renderWithTheme = (ui) =>
  render(<ThemeProvider theme={lightTheme}>{ui}</ThemeProvider>);

describe('BarChart', () => {
  const validData = {
    labels: ['Q1', 'Q2', 'Q3'],
    datasets: [{ label: 'Sales', data: [50, 75, 100] }],
  };

  it('renders empty state when data is null', () => {
    renderWithTheme(<BarChart data={null} />);
    expect(screen.getByTestId('bar-chart-empty')).toBeInTheDocument();
  });

  it('renders empty state when labels are empty', () => {
    renderWithTheme(<BarChart data={{ labels: [], datasets: [] }} />);
    expect(screen.getByTestId('bar-chart-empty')).toBeInTheDocument();
  });

  it('renders the chart with valid data', () => {
    renderWithTheme(<BarChart data={validData} title="Sales" />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('chartjs-bar')).toBeInTheDocument();
  });

  it('passes labels to the Chart.js component', () => {
    renderWithTheme(<BarChart data={validData} />);
    expect(screen.getByTestId('chartjs-bar-labels').textContent).toBe(
      JSON.stringify(['Q1', 'Q2', 'Q3'])
    );
  });

  it('passes correct dataset count', () => {
    renderWithTheme(<BarChart data={validData} />);
    expect(screen.getByTestId('chartjs-bar-datasets').textContent).toBe('1');
  });
});

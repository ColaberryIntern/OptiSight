import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { lightTheme } from '../../../styles/theme';

// Mock react-chartjs-2 to avoid canvas rendering in jsdom
vi.mock('react-chartjs-2', () => ({
  Line: ({ data, options }) => (
    <div data-testid="chartjs-line">
      <span data-testid="chartjs-line-labels">{JSON.stringify(data?.labels)}</span>
      <span data-testid="chartjs-line-datasets">{data?.datasets?.length ?? 0}</span>
    </div>
  ),
}));

// Must import after mocks
import LineChart from '../charts/LineChart';

const renderWithTheme = (ui) =>
  render(<ThemeProvider theme={lightTheme}>{ui}</ThemeProvider>);

describe('LineChart', () => {
  const validData = {
    labels: ['Jan', 'Feb', 'Mar'],
    datasets: [
      { label: 'Revenue', data: [100, 200, 300] },
      { label: 'Costs', data: [80, 150, 250] },
    ],
  };

  it('renders empty state when data is null', () => {
    renderWithTheme(<LineChart data={null} />);
    expect(screen.getByTestId('line-chart-empty')).toBeInTheDocument();
  });

  it('renders empty state when labels are empty', () => {
    renderWithTheme(<LineChart data={{ labels: [], datasets: [] }} />);
    expect(screen.getByTestId('line-chart-empty')).toBeInTheDocument();
  });

  it('renders the chart with valid data', () => {
    renderWithTheme(<LineChart data={validData} title="Test" />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('chartjs-line')).toBeInTheDocument();
  });

  it('passes labels to the Chart.js component', () => {
    renderWithTheme(<LineChart data={validData} title="Test" />);
    expect(screen.getByTestId('chartjs-line-labels').textContent).toBe(
      JSON.stringify(['Jan', 'Feb', 'Mar'])
    );
  });

  it('passes correct number of datasets', () => {
    renderWithTheme(<LineChart data={validData} title="Test" />);
    expect(screen.getByTestId('chartjs-line-datasets').textContent).toBe('2');
  });
});

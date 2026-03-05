import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { lightTheme } from '../../../styles/theme';
import HeatmapChart from '../charts/HeatmapChart';

// Mock ResizeObserver for jsdom
class MockResizeObserver {
  constructor(callback) {
    this._callback = callback;
  }
  observe(element) {
    // Fire immediately with a mock rect
    this._callback([
      { contentRect: { width: 600, height: 400 } },
    ]);
  }
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = MockResizeObserver;

const renderWithTheme = (ui) =>
  render(<ThemeProvider theme={lightTheme}>{ui}</ThemeProvider>);

describe('HeatmapChart', () => {
  const validData = {
    rows: ['Electronics', 'Clothing', 'Food'],
    columns: ['North', 'South', 'East', 'West'],
    values: [
      [10, 20, 30, 40],
      [15, 25, 35, 45],
      [5, 10, 15, 20],
    ],
  };

  it('renders empty state when data is null', () => {
    renderWithTheme(<HeatmapChart data={null} />);
    expect(screen.getByTestId('heatmap-chart-empty')).toBeInTheDocument();
  });

  it('renders empty state when rows are empty', () => {
    renderWithTheme(
      <HeatmapChart data={{ rows: [], columns: ['A'], values: [] }} />
    );
    expect(screen.getByTestId('heatmap-chart-empty')).toBeInTheDocument();
  });

  it('renders the chart container with valid data', () => {
    renderWithTheme(<HeatmapChart data={validData} title="Complaints" />);
    expect(screen.getByTestId('heatmap-chart')).toBeInTheDocument();
  });

  it('renders an SVG element inside', () => {
    renderWithTheme(<HeatmapChart data={validData} />);
    const container = screen.getByTestId('heatmap-chart');
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders heatmap cells as rects', () => {
    renderWithTheme(<HeatmapChart data={validData} />);
    const container = screen.getByTestId('heatmap-chart');
    const rects = container.querySelectorAll('rect');
    // 3 rows x 4 columns = 12 rects
    expect(rects.length).toBe(12);
  });
});

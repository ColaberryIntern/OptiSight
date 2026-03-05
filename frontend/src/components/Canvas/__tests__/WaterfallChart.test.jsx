import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { lightTheme } from '../../../styles/theme';
import WaterfallChart from '../charts/WaterfallChart';

class MockResizeObserver {
  constructor(callback) {
    this._callback = callback;
  }
  observe() {
    this._callback([{ contentRect: { width: 600, height: 400 } }]);
  }
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = MockResizeObserver;

const renderWithTheme = (ui) =>
  render(<ThemeProvider theme={lightTheme}>{ui}</ThemeProvider>);

describe('WaterfallChart', () => {
  const validData = {
    steps: [
      { label: 'Starting', value: 1000, type: 'total' },
      { label: 'Product Sales', value: 500, type: 'increase' },
      { label: 'Costs', value: 300, type: 'decrease' },
      { label: 'Net', value: 1200, type: 'total' },
    ],
  };

  it('renders empty state when data is null', () => {
    renderWithTheme(<WaterfallChart data={null} />);
    expect(screen.getByTestId('waterfall-chart-empty')).toBeInTheDocument();
  });

  it('renders empty state when steps are empty', () => {
    renderWithTheme(<WaterfallChart data={{ steps: [] }} />);
    expect(screen.getByTestId('waterfall-chart-empty')).toBeInTheDocument();
  });

  it('renders the chart container with valid data', () => {
    renderWithTheme(<WaterfallChart data={validData} />);
    expect(screen.getByTestId('waterfall-chart')).toBeInTheDocument();
  });

  it('renders SVG with bars', () => {
    renderWithTheme(<WaterfallChart data={validData} />);
    const container = screen.getByTestId('waterfall-chart');
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    // Should have waterfall bars
    const rects = container.querySelectorAll('.waterfall-bar');
    expect(rects.length).toBe(4);
  });

  it('renders value labels on bars', () => {
    renderWithTheme(<WaterfallChart data={validData} />);
    const container = screen.getByTestId('waterfall-chart');
    const labels = container.querySelectorAll('.waterfall-label');
    expect(labels.length).toBe(4);
  });
});

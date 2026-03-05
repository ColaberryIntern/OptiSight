import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { lightTheme } from '../../../styles/theme';
import RiskMatrix from '../charts/RiskMatrix';

class MockResizeObserver {
  constructor(callback) {
    this._callback = callback;
  }
  observe() {
    this._callback([{ contentRect: { width: 500, height: 400 } }]);
  }
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = MockResizeObserver;

const renderWithTheme = (ui) =>
  render(<ThemeProvider theme={lightTheme}>{ui}</ThemeProvider>);

describe('RiskMatrix', () => {
  const validData = {
    items: [
      { name: 'Supplier Delay', likelihood: 4, impact: 3, label: 'SD' },
      { name: 'Inventory Shortage', likelihood: 2, impact: 4, label: 'IS' },
      { name: 'IT Outage', likelihood: 1, impact: 5, label: 'IT' },
    ],
  };

  it('renders empty state when data is null', () => {
    renderWithTheme(<RiskMatrix data={null} />);
    expect(screen.getByTestId('risk-matrix-empty')).toBeInTheDocument();
  });

  it('renders empty state when items are empty', () => {
    renderWithTheme(<RiskMatrix data={{ items: [] }} />);
    expect(screen.getByTestId('risk-matrix-empty')).toBeInTheDocument();
  });

  it('renders the chart container with valid data', () => {
    renderWithTheme(<RiskMatrix data={validData} />);
    expect(screen.getByTestId('risk-matrix')).toBeInTheDocument();
  });

  it('renders risk dots', () => {
    renderWithTheme(<RiskMatrix data={validData} />);
    const container = screen.getByTestId('risk-matrix');
    const dots = container.querySelectorAll('.risk-dot');
    expect(dots.length).toBe(3);
  });

  it('renders risk labels', () => {
    renderWithTheme(<RiskMatrix data={validData} />);
    const container = screen.getByTestId('risk-matrix');
    const labels = container.querySelectorAll('.risk-label');
    expect(labels.length).toBe(3);
  });

  it('renders background grid (5x5 = 25 zone rects)', () => {
    renderWithTheme(<RiskMatrix data={validData} />);
    const container = screen.getByTestId('risk-matrix');
    const svg = container.querySelector('svg');
    // 25 zone rects + 3 risk dots = 28 rects total... but risk dots are circles
    const rects = svg.querySelectorAll('rect');
    expect(rects.length).toBe(25);
  });

  it('renders axis labels', () => {
    renderWithTheme(<RiskMatrix data={validData} />);
    const container = screen.getByTestId('risk-matrix');
    const texts = container.querySelectorAll('text');
    const textContents = Array.from(texts).map((t) => t.textContent);
    expect(textContents).toContain('Likelihood');
    expect(textContents).toContain('Impact');
  });
});

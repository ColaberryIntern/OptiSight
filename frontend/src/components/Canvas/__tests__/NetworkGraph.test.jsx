import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { lightTheme } from '../../../styles/theme';
import NetworkGraph from '../charts/NetworkGraph';

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

describe('NetworkGraph', () => {
  const validData = {
    nodes: [
      { id: 'a', label: 'Node A', group: 'cluster1' },
      { id: 'b', label: 'Node B', group: 'cluster1' },
      { id: 'c', label: 'Node C', group: 'cluster2' },
    ],
    links: [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
    ],
  };

  it('renders empty state when data is null', () => {
    renderWithTheme(<NetworkGraph data={null} />);
    expect(screen.getByTestId('network-graph-empty')).toBeInTheDocument();
  });

  it('renders empty state when nodes are empty', () => {
    renderWithTheme(<NetworkGraph data={{ nodes: [], links: [] }} />);
    expect(screen.getByTestId('network-graph-empty')).toBeInTheDocument();
  });

  it('renders the chart container with valid data', () => {
    renderWithTheme(<NetworkGraph data={validData} />);
    expect(screen.getByTestId('network-graph')).toBeInTheDocument();
  });

  it('renders SVG element', () => {
    renderWithTheme(<NetworkGraph data={validData} />);
    const container = screen.getByTestId('network-graph');
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders node circles', () => {
    renderWithTheme(<NetworkGraph data={validData} />);
    const container = screen.getByTestId('network-graph');
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(3);
  });

  it('renders link lines', () => {
    renderWithTheme(<NetworkGraph data={validData} />);
    const container = screen.getByTestId('network-graph');
    const lines = container.querySelectorAll('line');
    expect(lines.length).toBe(2);
  });
});

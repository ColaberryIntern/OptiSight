import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { lightTheme } from '../../../styles/theme';
import DecompositionTree from '../charts/DecompositionTree';

class MockResizeObserver {
  constructor(callback) {
    this._callback = callback;
  }
  observe() {
    this._callback([{ contentRect: { width: 700, height: 400 } }]);
  }
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = MockResizeObserver;

const renderWithTheme = (ui) =>
  render(<ThemeProvider theme={lightTheme}>{ui}</ThemeProvider>);

describe('DecompositionTree', () => {
  const validData = {
    name: 'Total Revenue',
    value: 1000,
    children: [
      {
        name: 'Product A',
        value: 600,
        children: [
          { name: 'Online', value: 400 },
          { name: 'In-Store', value: 200 },
        ],
      },
      {
        name: 'Product B',
        value: 400,
      },
    ],
  };

  it('renders empty state when data is null', () => {
    renderWithTheme(<DecompositionTree data={null} />);
    expect(screen.getByTestId('decomposition-tree-empty')).toBeInTheDocument();
  });

  it('renders empty state when data has no name', () => {
    renderWithTheme(<DecompositionTree data={{}} />);
    expect(screen.getByTestId('decomposition-tree-empty')).toBeInTheDocument();
  });

  it('renders the chart container with valid data', () => {
    renderWithTheme(<DecompositionTree data={validData} />);
    expect(screen.getByTestId('decomposition-tree')).toBeInTheDocument();
  });

  it('renders SVG element', () => {
    renderWithTheme(<DecompositionTree data={validData} />);
    const container = screen.getByTestId('decomposition-tree');
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders tree nodes as circles', () => {
    renderWithTheme(<DecompositionTree data={validData} />);
    const container = screen.getByTestId('decomposition-tree');
    const circles = container.querySelectorAll('circle');
    // 5 nodes: Total Revenue, Product A, Online, In-Store, Product B
    expect(circles.length).toBe(5);
  });

  it('renders tree links as paths', () => {
    renderWithTheme(<DecompositionTree data={validData} />);
    const container = screen.getByTestId('decomposition-tree');
    const paths = container.querySelectorAll('.tree-link');
    // 4 links: root->A, A->Online, A->In-Store, root->B
    expect(paths.length).toBe(4);
  });

  it('renders node labels with values', () => {
    renderWithTheme(<DecompositionTree data={validData} />);
    const container = screen.getByTestId('decomposition-tree');
    const texts = container.querySelectorAll('.tree-node text');
    const textContents = Array.from(texts).map((t) => t.textContent);
    expect(textContents).toContain('Total Revenue (1000)');
    expect(textContents).toContain('Product A (600)');
    expect(textContents).toContain('Product B (400)');
  });
});

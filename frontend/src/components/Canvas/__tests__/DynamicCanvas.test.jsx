import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { lightTheme } from '../../../styles/theme';
import DynamicCanvas from '../DynamicCanvas';

// Mock all lazy-loaded chart components to avoid Chart.js canvas issues in jsdom
vi.mock('../charts/LineChart', () => ({
  default: ({ data, title }) => (
    <div data-testid="mock-line-chart">{title || 'LineChart'}</div>
  ),
}));
vi.mock('../charts/BarChart', () => ({
  default: ({ data, title }) => (
    <div data-testid="mock-bar-chart">{title || 'BarChart'}</div>
  ),
}));
vi.mock('../charts/HeatmapChart', () => ({
  default: ({ data, title }) => (
    <div data-testid="mock-heatmap-chart">{title || 'HeatmapChart'}</div>
  ),
}));
vi.mock('../charts/GeoMap', () => ({
  default: ({ data, title }) => (
    <div data-testid="mock-geo-map">{title || 'GeoMap'}</div>
  ),
}));
vi.mock('../charts/NetworkGraph', () => ({
  default: ({ data, title }) => (
    <div data-testid="mock-network-graph">{title || 'NetworkGraph'}</div>
  ),
}));
vi.mock('../charts/RadarChart', () => ({
  default: ({ data, title }) => (
    <div data-testid="mock-radar-chart">{title || 'RadarChart'}</div>
  ),
}));
vi.mock('../charts/WaterfallChart', () => ({
  default: ({ data, title }) => (
    <div data-testid="mock-waterfall-chart">{title || 'WaterfallChart'}</div>
  ),
}));
vi.mock('../charts/ForecastCone', () => ({
  default: ({ data, title }) => (
    <div data-testid="mock-forecast-cone">{title || 'ForecastCone'}</div>
  ),
}));
vi.mock('../charts/RiskMatrix', () => ({
  default: ({ data, title }) => (
    <div data-testid="mock-risk-matrix">{title || 'RiskMatrix'}</div>
  ),
}));
vi.mock('../charts/DecompositionTree', () => ({
  default: ({ data, title }) => (
    <div data-testid="mock-decomposition-tree">{title || 'DecompositionTree'}</div>
  ),
}));

const renderWithTheme = (ui) =>
  render(<ThemeProvider theme={lightTheme}>{ui}</ThemeProvider>);

describe('DynamicCanvas', () => {
  it('renders empty state when no visualizations provided', () => {
    renderWithTheme(<DynamicCanvas visualizations={[]} />);
    expect(screen.getByTestId('dynamic-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-empty')).toBeInTheDocument();
  });

  it('renders empty state with default props', () => {
    renderWithTheme(<DynamicCanvas />);
    expect(screen.getByTestId('canvas-empty')).toBeInTheDocument();
  });

  it('renders chart type selector', () => {
    renderWithTheme(<DynamicCanvas visualizations={[]} />);
    expect(screen.getByTestId('chart-type-selector')).toBeInTheDocument();
  });

  it('renders a line chart visualization', async () => {
    const visualizations = [
      {
        type: 'line',
        title: 'Revenue Trend',
        data: { labels: ['Jan', 'Feb'], datasets: [{ data: [100, 200] }] },
      },
    ];
    renderWithTheme(<DynamicCanvas visualizations={visualizations} />);
    expect(await screen.findByText('Revenue Trend')).toBeInTheDocument();
    expect(await screen.findByTestId('mock-line-chart')).toBeInTheDocument();
  });

  it('renders multiple chart cards', async () => {
    const visualizations = [
      {
        type: 'line',
        title: 'Chart A',
        data: { labels: ['Jan'], datasets: [{ data: [1] }] },
      },
      {
        type: 'bar',
        title: 'Chart B',
        data: { labels: ['Jan'], datasets: [{ data: [2] }] },
      },
    ];
    renderWithTheme(<DynamicCanvas visualizations={visualizations} />);
    // Title text appears in both the h3 and the mock chart, so use getAllByText
    expect((await screen.findAllByText('Chart A')).length).toBeGreaterThanOrEqual(1);
    expect((await screen.findAllByText('Chart B')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('chart-card-0')).toBeInTheDocument();
    expect(screen.getByTestId('chart-card-1')).toBeInTheDocument();
  });

  it('shows unknown chart type message for unrecognized types', () => {
    const visualizations = [
      { type: 'unknown_xyz', title: 'Mystery', data: {} },
    ];
    renderWithTheme(<DynamicCanvas visualizations={visualizations} />);
    expect(screen.getByText(/Unknown chart type: unknown_xyz/)).toBeInTheDocument();
  });

  it('allows chart type override via selector', async () => {
    const visualizations = [
      {
        type: 'line',
        title: 'Overridden',
        data: { labels: ['A'], datasets: [{ data: [1] }] },
      },
    ];
    renderWithTheme(<DynamicCanvas visualizations={visualizations} />);

    // Initially shows line chart
    expect(await screen.findByTestId('mock-line-chart')).toBeInTheDocument();

    // Click bar type button to override
    fireEvent.click(screen.getByTestId('chart-type-bar'));

    // Now should render bar chart instead
    expect(await screen.findByTestId('mock-bar-chart')).toBeInTheDocument();
  });

  it('toggles override off when clicking the same type again', async () => {
    const visualizations = [
      {
        type: 'line',
        title: 'Toggle Test',
        data: { labels: ['A'], datasets: [{ data: [1] }] },
      },
    ];
    renderWithTheme(<DynamicCanvas visualizations={visualizations} />);

    // Override to bar
    fireEvent.click(screen.getByTestId('chart-type-bar'));
    expect(await screen.findByTestId('mock-bar-chart')).toBeInTheDocument();

    // Click bar again to toggle off
    fireEvent.click(screen.getByTestId('chart-type-bar'));
    // Should revert to the original line type
    expect(await screen.findByTestId('mock-line-chart')).toBeInTheDocument();
  });
});

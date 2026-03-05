import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { lightTheme } from '../../../styles/theme';
import MapTooltip from '../MapTooltip';

const renderWithTheme = (ui) =>
  render(<ThemeProvider theme={lightTheme}>{ui}</ThemeProvider>);

describe('MapTooltip', () => {
  const baseNode = {
    id: 'store-1',
    label: 'Dallas Eye Center',
    storeId: 'store-1',
    city: 'Dallas',
    region: 'South',
    revenue: 42150,
    riskScore: 65,
    riskLevel: 'high',
    health: 35,
    complaintCount: 8,
    anomalyDetected: true,
    factors: { revenue_trend: { score: 80 }, complaint_velocity: { score: 60 } },
  };

  it('renders nothing when node is null', () => {
    const { container } = renderWithTheme(
      <MapTooltip node={null} x={100} y={100} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders tooltip with node label', () => {
    renderWithTheme(<MapTooltip node={baseNode} x={100} y={100} />);
    expect(screen.getByTestId('map-tooltip')).toBeInTheDocument();
    expect(screen.getByText('Dallas Eye Center')).toBeInTheDocument();
  });

  it('displays city and region', () => {
    renderWithTheme(<MapTooltip node={baseNode} x={50} y={50} />);
    // City + region subtitle line
    expect(screen.getByText(/Dallas \u2022 South/)).toBeInTheDocument();
  });

  it('displays revenue formatted as currency', () => {
    renderWithTheme(<MapTooltip node={baseNode} x={50} y={50} />);
    expect(screen.getByText('$42,150')).toBeInTheDocument();
  });

  it('displays risk score with level badge', () => {
    renderWithTheme(<MapTooltip node={baseNode} x={50} y={50} />);
    expect(screen.getByText('65 high')).toBeInTheDocument();
  });

  it('displays complaint count', () => {
    renderWithTheme(<MapTooltip node={baseNode} x={50} y={50} />);
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('displays anomaly status when detected', () => {
    renderWithTheme(<MapTooltip node={baseNode} x={50} y={50} />);
    expect(screen.getByText('Detected')).toBeInTheDocument();
  });

  it('does not display anomaly row when not detected', () => {
    const node = { ...baseNode, anomalyDetected: false };
    renderWithTheme(<MapTooltip node={node} x={50} y={50} />);
    expect(screen.queryByText('Detected')).not.toBeInTheDocument();
  });

  it('displays top risk factor', () => {
    renderWithTheme(<MapTooltip node={baseNode} x={50} y={50} />);
    expect(screen.getByText('revenue trend')).toBeInTheDocument();
  });

  it('handles node with no factors gracefully', () => {
    const node = { ...baseNode, factors: null };
    renderWithTheme(<MapTooltip node={node} x={50} y={50} />);
    expect(screen.getByText('Dallas Eye Center')).toBeInTheDocument();
    expect(screen.queryByText('Top Risk Factor')).not.toBeInTheDocument();
  });

  it('handles node with no city gracefully', () => {
    const node = { ...baseNode, city: '' };
    renderWithTheme(<MapTooltip node={node} x={50} y={50} />);
    expect(screen.getByText('Dallas Eye Center')).toBeInTheDocument();
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import MapNode from '../MapNode';

const renderInSvg = (ui) =>
  render(<svg data-testid="svg-root">{ui}</svg>);

describe('MapNode', () => {
  const baseNode = {
    id: 'store-1',
    label: 'Dallas Eye',
    storeId: 'store-1',
    city: 'Dallas',
    region: 'South',
    revenue: 42000,
    riskScore: 65,
    riskLevel: 'high',
    health: 35,
    complaintCount: 8,
    anomalyDetected: true,
    factors: {},
  };

  it('renders nothing when node is null', () => {
    const { container } = renderInSvg(<MapNode node={null} />);
    expect(container.querySelector('[data-testid^="map-node"]')).toBeNull();
  });

  it('renders a group with the correct test id', () => {
    renderInSvg(<MapNode node={baseNode} />);
    expect(screen.getByTestId('map-node-store-1')).toBeInTheDocument();
  });

  it('renders the label text', () => {
    renderInSvg(<MapNode node={baseNode} />);
    expect(screen.getByText('Dallas Eye')).toBeInTheDocument();
  });

  it('truncates long labels', () => {
    const node = { ...baseNode, label: 'Very Long Store Name Here' };
    renderInSvg(<MapNode node={node} />);
    expect(screen.getByText('Very Long S\u2026')).toBeInTheDocument();
  });

  it('renders complaint count badge when > 0', () => {
    renderInSvg(<MapNode node={baseNode} />);
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('does not render complaint badge when count is 0', () => {
    const node = { ...baseNode, complaintCount: 0 };
    renderInSvg(<MapNode node={node} />);
    const group = screen.getByTestId('map-node-store-1');
    const texts = Array.from(group.querySelectorAll('text')).map((t) => t.textContent);
    expect(texts).not.toContain('0');
  });

  it('renders anomaly badge when anomalyDetected is true', () => {
    renderInSvg(<MapNode node={baseNode} />);
    expect(screen.getByText('!')).toBeInTheDocument();
  });

  it('does not render anomaly badge when anomalyDetected is false', () => {
    const node = { ...baseNode, anomalyDetected: false };
    renderInSvg(<MapNode node={node} />);
    expect(screen.queryByText('!')).not.toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    renderInSvg(<MapNode node={baseNode} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('map-node-store-1'));
    expect(onClick).toHaveBeenCalledWith(baseNode);
  });

  it('calls onDoubleClick when double-clicked', () => {
    const onDoubleClick = vi.fn();
    renderInSvg(<MapNode node={baseNode} onDoubleClick={onDoubleClick} />);
    fireEvent.doubleClick(screen.getByTestId('map-node-store-1'));
    expect(onDoubleClick).toHaveBeenCalledWith(baseNode);
  });

  it('calls onMouseEnter and onMouseLeave', () => {
    const onMouseEnter = vi.fn();
    const onMouseLeave = vi.fn();
    renderInSvg(
      <MapNode
        node={baseNode}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />
    );
    const el = screen.getByTestId('map-node-store-1');
    fireEvent.mouseEnter(el);
    expect(onMouseEnter).toHaveBeenCalled();
    fireEvent.mouseLeave(el);
    expect(onMouseLeave).toHaveBeenCalled();
  });

  it('applies selected styling (stroke-width 3)', () => {
    renderInSvg(<MapNode node={baseNode} isSelected={true} />);
    const group = screen.getByTestId('map-node-store-1');
    const circle = group.querySelector('circle');
    expect(circle.getAttribute('stroke-width')).toBe('3');
  });

  it('uses the provided radius', () => {
    renderInSvg(<MapNode node={baseNode} radius={30} />);
    const group = screen.getByTestId('map-node-store-1');
    const circle = group.querySelector('circle');
    expect(circle.getAttribute('r')).toBe('30');
  });

  it('renders health score below circle', () => {
    renderInSvg(<MapNode node={baseNode} />);
    expect(screen.getByText('35%')).toBeInTheDocument();
  });
});

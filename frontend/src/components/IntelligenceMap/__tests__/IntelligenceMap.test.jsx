import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { lightTheme } from '../../../styles/theme';
import intelligenceMapReducer from '../../../store/slices/intelligenceMapSlice';
import IntelligenceMap from '../IntelligenceMap';

// Mock d3 force simulation to avoid timer-based animation in tests
vi.mock('d3', async () => {
  const actual = await vi.importActual('d3');
  return {
    ...actual,
    forceSimulation: (nodes) => {
      const positionedNodes = nodes.map((n, i) => ({
        ...n,
        x: 400 + i * 60,
        y: 300 + (i % 2 === 0 ? -30 : 30),
      }));

      const sim = {
        force: () => sim,
        alphaDecay: () => sim,
        on: (event, handler) => {
          if (event === 'tick') {
            nodes.forEach((n, i) => {
              n.x = positionedNodes[i].x;
              n.y = positionedNodes[i].y;
            });
            handler();
          }
          return sim;
        },
        stop: () => {},
        alphaTarget: () => sim,
        restart: () => sim,
      };
      return sim;
    },
    forceLink: () => {
      const fn = () => fn;
      fn.id = () => fn;
      fn.distance = () => fn;
      fn.strength = () => fn;
      return fn;
    },
    forceManyBody: () => {
      const fn = () => fn;
      fn.strength = () => fn;
      return fn;
    },
    forceCenter: () => () => {},
    forceCollide: () => {
      const fn = () => fn;
      fn.radius = () => fn;
      return fn;
    },
    zoom: () => {
      const fn = () => fn;
      fn.scaleExtent = () => fn;
      fn.on = () => fn;
      return fn;
    },
  };
});

const createTestStore = (overrides = {}) =>
  configureStore({
    reducer: { intelligenceMap: intelligenceMapReducer },
    preloadedState: {
      intelligenceMap: {
        nodes: [],
        selectedNode: null,
        similarityEdges: [],
        showSimilarity: false,
        regionFilter: null,
        riskFilter: null,
        loading: false,
        similarityLoading: false,
        expandedNodes: [],
        healthScores: {},
        ...overrides,
      },
    },
  });

const renderWithProviders = (ui, storeOverrides = {}) =>
  render(
    <Provider store={createTestStore(storeOverrides)}>
      <ThemeProvider theme={lightTheme}>{ui}</ThemeProvider>
    </Provider>
  );

const sampleNodes = [
  {
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
    factors: { revenue_trend: { score: 80 } },
  },
  {
    id: 'store-2',
    label: 'Austin Vision',
    storeId: 'store-2',
    city: 'Austin',
    region: 'South',
    revenue: 55000,
    riskScore: 30,
    riskLevel: 'low',
    health: 70,
    complaintCount: 2,
    anomalyDetected: false,
    factors: {},
  },
];

describe('IntelligenceMap', () => {
  it('renders the container', () => {
    renderWithProviders(
      <IntelligenceMap nodes={sampleNodes} width={800} height={600} />
    );
    expect(screen.getByTestId('intelligence-map')).toBeInTheDocument();
  });

  it('renders all store nodes', () => {
    renderWithProviders(
      <IntelligenceMap nodes={sampleNodes} width={800} height={600} />
    );
    expect(screen.getByTestId('map-node-store-1')).toBeInTheDocument();
    expect(screen.getByTestId('map-node-store-2')).toBeInTheDocument();
  });

  it('calls onNodeSelect when a node is clicked', () => {
    const onNodeSelect = vi.fn();
    renderWithProviders(
      <IntelligenceMap
        nodes={sampleNodes}
        onNodeSelect={onNodeSelect}
        width={800}
        height={600}
      />
    );
    fireEvent.click(screen.getByTestId('map-node-store-1'));
    expect(onNodeSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'store-1' })
    );
  });

  it('highlights the selected node', () => {
    renderWithProviders(
      <IntelligenceMap
        nodes={sampleNodes}
        selectedNode="store-1"
        width={800}
        height={600}
      />
    );
    const nodeGroup = screen.getByTestId('map-node-store-1');
    const circle = nodeGroup.querySelector('circle');
    expect(circle.getAttribute('stroke-width')).toBe('3');
  });

  it('renders with empty nodes array without crashing', () => {
    renderWithProviders(
      <IntelligenceMap nodes={[]} width={800} height={600} />
    );
    expect(screen.getByTestId('intelligence-map')).toBeInTheDocument();
  });

  it('renders the SVG element', () => {
    renderWithProviders(
      <IntelligenceMap nodes={sampleNodes} width={800} height={600} />
    );
    const container = screen.getByTestId('intelligence-map');
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg.getAttribute('viewBox')).toBe('0 0 800 600');
  });
});

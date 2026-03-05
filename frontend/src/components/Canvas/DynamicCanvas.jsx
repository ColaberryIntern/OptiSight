import React, { useState, useCallback, lazy, Suspense } from 'react';
import styled from 'styled-components';
import ChartTypeSelector from './ChartTypeSelector';
import { autoSelectChartType } from '../../utils/chartAutoSelector';

// Lazy-load chart components for code-splitting
const LineChart = lazy(() => import('./charts/LineChart'));
const BarChart = lazy(() => import('./charts/BarChart'));
const HeatmapChart = lazy(() => import('./charts/HeatmapChart'));
const GeoMap = lazy(() => import('./charts/GeoMap'));
const NetworkGraph = lazy(() => import('./charts/NetworkGraph'));
const RadarChart = lazy(() => import('./charts/RadarChart'));
const WaterfallChart = lazy(() => import('./charts/WaterfallChart'));
const ForecastCone = lazy(() => import('./charts/ForecastCone'));
const RiskMatrix = lazy(() => import('./charts/RiskMatrix'));
const DecompositionTree = lazy(() => import('./charts/DecompositionTree'));
const RootCausePanel = lazy(() => import('./charts/RootCausePanel'));
const ClusterView = lazy(() => import('./charts/ClusterView'));

const CHART_COMPONENTS = {
  line: LineChart,
  bar: BarChart,
  heatmap: HeatmapChart,
  geo: GeoMap,
  network: NetworkGraph,
  radar: RadarChart,
  waterfall: WaterfallChart,
  forecast: ForecastCone,
  forecast_cone: ForecastCone,
  risk: RiskMatrix,
  risk_matrix: RiskMatrix,
  tree: DecompositionTree,
  decomposition_tree: DecompositionTree,
  root_cause_split: RootCausePanel,
  cluster: ClusterView,
};

const CanvasWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
  width: 100%;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
  width: 100%;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.md};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  min-height: 300px;
  max-height: 550px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ChartTitle = styled.h3`
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  font-size: ${({ theme }) => theme.fontSizes.md};
  color: ${({ theme }) => theme.colors.text};
  font-weight: 600;
`;

const ChartBody = styled.div`
  flex: 1;
  position: relative;
  min-height: 250px;
`;

const FallbackLoader = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 200px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  text-align: center;
  line-height: 1.5;
  padding: 0 ${({ theme }) => theme.spacing.md};
`;

const EMPTY_HINTS = {
  line: 'Trend data not available for this query. Try asking about a specific store\'s revenue over time.',
  bar: 'Comparison data not available. Try asking about risk factors or store comparisons.',
  heatmap: 'Heatmap data requires regional density information. Ask about complaint density by region.',
  geo: 'Geographic data not available. Try asking about store locations or regional patterns.',
  forecast: 'Forecast requires historical time-series data. Ask about forecasting a specific store\'s revenue.',
  forecast_cone: 'Forecast requires historical time-series data. Ask about forecasting a specific store\'s revenue.',
  risk: 'Risk matrix data not available. Ask about which stores show operational risk.',
  risk_matrix: 'Risk matrix data not available. Ask about which stores show operational risk.',
  root_cause_split: 'Root cause analysis requires ML model results. Ask about a specific performance issue.',
  cluster: 'Clustering data not available. Ask about complaint patterns or similar issues.',
};

function getEmptyHint(chartType) {
  return EMPTY_HINTS[chartType] || 'Data not available for this visualization. Try a more specific query.';
}

function isDataEmpty(data) {
  if (!data) return true;
  if (Array.isArray(data) && data.length === 0) return true;
  if (typeof data === 'object' && !Array.isArray(data)) {
    // Check for Chart.js data structure (datasets with empty data arrays)
    if (data.datasets) {
      return data.datasets.every((ds) => !ds.data || ds.data.length === 0);
    }
    if (data.labels && data.labels.length === 0) return true;
  }
  return false;
}

const DynamicCanvas = ({ visualizations = [] }) => {
  const [overrideType, setOverrideType] = useState(null);

  const handleTypeChange = useCallback((type) => {
    setOverrideType((prev) => (prev === type ? null : type));
  }, []);

  if (!visualizations.length) {
    return (
      <CanvasWrapper data-testid="dynamic-canvas">
        <ChartTypeSelector activeType={overrideType} onTypeChange={handleTypeChange} />
        <EmptyState data-testid="canvas-empty">
          No visualizations to display. Select a node or query the intelligence engine.
        </EmptyState>
      </CanvasWrapper>
    );
  }

  return (
    <CanvasWrapper data-testid="dynamic-canvas">
      <ChartTypeSelector activeType={overrideType} onTypeChange={handleTypeChange} />
      <Grid>
        {visualizations.map((viz, idx) => {
          const chartType = overrideType || viz.type || autoSelectChartType(viz);
          const ChartComponent = CHART_COMPONENTS[chartType];

          if (!ChartComponent) {
            return (
              <ChartCard key={viz.title || idx}>
                <ChartTitle>{viz.title || 'Chart'}</ChartTitle>
                <ChartBody>
                  <EmptyState>
                    Unknown chart type: {chartType}
                  </EmptyState>
                </ChartBody>
              </ChartCard>
            );
          }

          // Show contextual hint instead of empty chart
          if (isDataEmpty(viz.data)) {
            return (
              <ChartCard key={viz.title || idx} data-testid={`chart-card-${idx}`}>
                <ChartTitle>{viz.title || 'Chart'}</ChartTitle>
                <ChartBody>
                  <EmptyState>{getEmptyHint(chartType)}</EmptyState>
                </ChartBody>
              </ChartCard>
            );
          }

          return (
            <ChartCard key={viz.title || idx} data-testid={`chart-card-${idx}`}>
              <ChartTitle>{viz.title || 'Chart'}</ChartTitle>
              <ChartBody>
                <Suspense
                  fallback={<FallbackLoader>Loading chart...</FallbackLoader>}
                >
                  <ChartComponent data={viz.data} title={viz.title} />
                </Suspense>
              </ChartBody>
            </ChartCard>
          );
        })}
      </Grid>
    </CanvasWrapper>
  );
};

export default DynamicCanvas;

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import styled from 'styled-components';
import { fetchAutoInsights } from '../../store/slices/canvasSlice';
import InsightCard from './InsightCard';

const GridWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
`;

const GridTitle = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.lg};
  color: ${({ theme }) => theme.colors.text};
  font-weight: 600;
`;

const GridSubtitle = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const InsightsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

function AutoInsightsGrid() {
  const dispatch = useDispatch();
  const { autoInsights, insightsLoading } = useSelector((state) => state.canvas);

  useEffect(() => {
    dispatch(fetchAutoInsights());
  }, [dispatch]);

  if (insightsLoading) {
    return <LoadingState>Analyzing your data for insights...</LoadingState>;
  }

  if (!autoInsights || autoInsights.length === 0) {
    return null;
  }

  return (
    <GridWrapper data-testid="auto-insights-grid">
      <div>
        <GridTitle>Intelligence Insights</GridTitle>
        <GridSubtitle>
          Auto-detected patterns and anomalies. Click to investigate.
        </GridSubtitle>
      </div>
      <InsightsGrid>
        {autoInsights.map((insight, idx) => (
          <InsightCard key={insight.type || idx} insight={insight} />
        ))}
      </InsightsGrid>
    </GridWrapper>
  );
}

export default AutoInsightsGrid;

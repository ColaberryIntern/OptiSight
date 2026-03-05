import React, { lazy, Suspense } from 'react';
import { useDispatch } from 'react-redux';
import styled, { css } from 'styled-components';
import { addMessage, sendQuery } from '../../store/slices/aiAssistantSlice';

const BarChart = lazy(() => import('./charts/BarChart'));
const ForecastCone = lazy(() => import('./charts/ForecastCone'));

const CHART_MAP = {
  bar: BarChart,
  forecast_cone: ForecastCone,
};

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.md};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  cursor: pointer;
  transition: box-shadow 0.2s, border-color 0.2s;

  ${({ $severity }) => {
    const colors = { high: '#D93025', medium: '#F9AB00', low: '#34A853' };
    return css`
      border-left: 4px solid ${colors[$severity] || '#4285F4'};
    `;
  }}

  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.md};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const Title = styled.h4`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.md};
  color: ${({ theme }) => theme.colors.text};
  font-weight: 600;
`;

const SeverityBadge = styled.span`
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  color: #fff;
  background: ${({ $severity }) => {
    switch ($severity) {
      case 'high': return '#D93025';
      case 'medium': return '#F9AB00';
      default: return '#34A853';
    }
  }};
`;

const Summary = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin: 0 0 ${({ theme }) => theme.spacing.sm};
  line-height: 1.4;
`;

const MiniChart = styled.div`
  height: 150px;
  position: relative;
`;

const FollowUp = styled.div`
  margin-top: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 500;
`;

function InsightCard({ insight }) {
  const dispatch = useDispatch();

  const handleClick = () => {
    if (insight.follow_up) {
      dispatch(addMessage({
        id: `msg_${Date.now()}`,
        role: 'user',
        content: insight.follow_up,
        timestamp: Date.now(),
      }));
      dispatch(sendQuery({
        question: insight.follow_up,
        userId: 'executive',
      }));
    }
  };

  const ChartComponent = CHART_MAP[insight.visualization?.type];
  const chartData = insight.visualization?.data;

  return (
    <Card $severity={insight.severity} onClick={handleClick}>
      <Header>
        <Title>{insight.title}</Title>
        <SeverityBadge $severity={insight.severity}>{insight.severity}</SeverityBadge>
      </Header>
      <Summary>{insight.summary}</Summary>
      {ChartComponent && chartData && (
        <MiniChart>
          <Suspense fallback={<div>Loading...</div>}>
            <ChartComponent data={chartData} title="" />
          </Suspense>
        </MiniChart>
      )}
      {insight.follow_up && <FollowUp>Click to investigate &rarr;</FollowUp>}
    </Card>
  );
}

export default InsightCard;

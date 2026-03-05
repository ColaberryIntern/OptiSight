import React from 'react';
import { useSelector } from 'react-redux';
import styled, { css } from 'styled-components';

const HeaderRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
`;

const KPICard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  display: flex;
  flex-direction: column;
  gap: 4px;

  ${({ $accent }) =>
    $accent &&
    css`
      border-left: 3px solid ${$accent};
    `}
`;

const KPILabel = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
`;

const KPIValue = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`;

const KPIDetail = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const RiskBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
  text-transform: uppercase;
  color: #fff;
  background: ${({ $level }) => {
    switch ($level) {
      case 'critical': return '#D93025';
      case 'high': return '#EA4335';
      case 'medium': return '#F9AB00';
      default: return '#34A853';
    }
  }};
`;

const DeltaSpan = styled.span`
  color: ${({ $positive }) => ($positive ? '#34A853' : '#D93025')};
  font-weight: 600;
`;

const SkeletonCard = styled(KPICard)`
  opacity: 0.5;
  min-height: 72px;
`;

function ExecutiveInsightHeader() {
  const { summary, loading } = useSelector((state) => state.executive);

  if (loading || !summary) {
    return (
      <HeaderRow>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i}>
            <KPILabel>Loading...</KPILabel>
            <KPIValue>--</KPIValue>
          </SkeletonCard>
        ))}
      </HeaderRow>
    );
  }

  const riskColor = {
    critical: '#D93025',
    high: '#EA4335',
    medium: '#F9AB00',
    low: '#34A853',
  }[summary.risk_level] || '#34A853';

  const trendDelta = summary.revenue_trend_30d?.delta_pct || 0;
  const trendPositive = trendDelta > 0;

  return (
    <HeaderRow data-testid="executive-header">
      <KPICard $accent={riskColor}>
        <KPILabel>Risk Level</KPILabel>
        <KPIValue>
          <RiskBadge $level={summary.risk_level}>{summary.risk_level}</RiskBadge>
        </KPIValue>
        <KPIDetail>Score: {summary.risk_score}/100</KPIDetail>
      </KPICard>

      <KPICard $accent={summary.active_alerts > 0 ? '#EA4335' : '#34A853'}>
        <KPILabel>Active Alerts</KPILabel>
        <KPIValue>{summary.active_alerts}</KPIValue>
        <KPIDetail>High/critical stores</KPIDetail>
      </KPICard>

      <KPICard $accent={trendPositive ? '#34A853' : '#D93025'}>
        <KPILabel>Revenue Trend (30d)</KPILabel>
        <KPIValue>
          <DeltaSpan $positive={trendPositive}>
            {trendPositive ? '+' : ''}{trendDelta}%
          </DeltaSpan>
        </KPIValue>
        <KPIDetail>{summary.revenue_trend_30d?.direction || 'stable'}</KPIDetail>
      </KPICard>

      <KPICard $accent={summary.complaint_spike?.active ? '#F9AB00' : '#34A853'}>
        <KPILabel>Complaint Spike</KPILabel>
        <KPIValue>
          {summary.complaint_spike?.active ? summary.complaint_spike.count : 'None'}
        </KPIValue>
        <KPIDetail>
          {summary.complaint_spike?.active
            ? summary.complaint_spike.category
            : 'No spike detected'}
        </KPIDetail>
      </KPICard>

      <KPICard $accent={summary.inventory_risk?.at_risk_stores > 0 ? '#F9AB00' : '#34A853'}>
        <KPILabel>Inventory Risk</KPILabel>
        <KPIValue>
          {summary.inventory_risk?.at_risk_stores || 0}/{summary.inventory_risk?.total_stores || 0}
        </KPIValue>
        <KPIDetail>At-risk stores</KPIDetail>
      </KPICard>

      <KPICard $accent="#4285F4">
        <KPILabel>Forecast Confidence</KPILabel>
        <KPIValue>
          {((summary.forecast_confidence?.avg_confidence || 0) * 100).toFixed(0)}%
        </KPIValue>
        <KPIDetail>30-day projection</KPIDetail>
      </KPICard>
    </HeaderRow>
  );
}

export default ExecutiveInsightHeader;

import React from 'react';
import styled from 'styled-components';

const TooltipContainer = styled.div`
  position: absolute;
  pointer-events: none;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  z-index: 1000;
  min-width: 200px;
  max-width: 280px;
  left: ${({ $x }) => $x}px;
  top: ${({ $y }) => $y}px;
  transform: translate(-50%, -100%) translateY(-12px);
`;

const TooltipTitle = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 2px;
`;

const TooltipSubtitle = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const MetricRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
  padding: 2px 0;
`;

const MetricValue = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
`;

const RiskBadge = styled.span`
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  color: #FFFFFF;
  background: ${({ $level }) =>
    $level === 'high' ? '#D93025' :
    $level === 'medium' ? '#F9AB00' : '#34A853'};
`;

const HealthBar = styled.div`
  width: 100%;
  height: 4px;
  background: ${({ theme }) => theme.colors.border};
  border-radius: 2px;
  margin-top: ${({ theme }) => theme.spacing.xs};
  overflow: hidden;
`;

const HealthFill = styled.div`
  height: 100%;
  width: ${({ $health }) => $health}%;
  background: ${({ $health }) =>
    $health > 70 ? '#34A853' : $health > 40 ? '#F9AB00' : '#D93025'};
  border-radius: 2px;
  transition: width 0.3s ease;
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  margin: ${({ theme }) => theme.spacing.xs} 0;
`;

const formatCurrency = (value) => {
  if (value == null) return 'N/A';
  return '$' + Math.round(value).toLocaleString('en-US');
};

const getTopFactor = (factors) => {
  if (!factors || typeof factors !== 'object') return null;
  let topKey = null;
  let topScore = -1;
  for (const [key, val] of Object.entries(factors)) {
    const score = val?.score ?? val ?? 0;
    if (score > topScore) {
      topScore = score;
      topKey = key;
    }
  }
  return topKey;
};

const MapTooltip = ({ node, x, y }) => {
  if (!node) return null;

  const health = node.health ?? null;
  const riskLevel = node.riskLevel || 'medium';
  const topFactor = getTopFactor(node.factors);

  return (
    <TooltipContainer $x={x} $y={y} data-testid="map-tooltip">
      <TooltipTitle>{node.label}</TooltipTitle>
      {node.city && (
        <TooltipSubtitle>{node.city}{node.region ? ` \u2022 ${node.region}` : ''}</TooltipSubtitle>
      )}

      <Divider />

      <MetricRow>
        <span>Revenue (30d)</span>
        <MetricValue>{formatCurrency(node.revenue)}</MetricValue>
      </MetricRow>

      <MetricRow>
        <span>Risk</span>
        <RiskBadge $level={riskLevel}>
          {node.riskScore != null ? Math.round(node.riskScore) : 'N/A'} {riskLevel}
        </RiskBadge>
      </MetricRow>

      <MetricRow>
        <span>Complaints</span>
        <MetricValue>{node.complaintCount ?? 0}</MetricValue>
      </MetricRow>

      {node.anomalyDetected && (
        <MetricRow>
          <span>Anomaly</span>
          <MetricValue style={{ color: '#D93025' }}>Detected</MetricValue>
        </MetricRow>
      )}

      {topFactor && (
        <MetricRow>
          <span>Top Risk Factor</span>
          <MetricValue>{topFactor.replace(/_/g, ' ')}</MetricValue>
        </MetricRow>
      )}

      {health != null && (
        <HealthBar>
          <HealthFill $health={health} />
        </HealthBar>
      )}
    </TooltipContainer>
  );
};

export default MapTooltip;

import React from 'react';
import styled from 'styled-components';

const LegendContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const LegendGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ColorDot = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`;

const SizeDot = styled.span`
  display: inline-block;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.textSecondary};
  opacity: 0.5;
`;

const GlowDot = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #F9AB00;
  box-shadow: 0 0 ${({ $intensity }) => $intensity}px #F9AB00;
`;

const MapLegend = () => (
  <LegendContainer data-testid="map-legend">
    <LegendGroup>
      <SizeDot $size={6} /> Small = Low Revenue
    </LegendGroup>
    <LegendGroup>
      <SizeDot $size={12} /> Large = High Revenue
    </LegendGroup>
    <LegendGroup>
      <ColorDot $color="#34A853" /> Low Risk
    </LegendGroup>
    <LegendGroup>
      <ColorDot $color="#F9AB00" /> Medium
    </LegendGroup>
    <LegendGroup>
      <ColorDot $color="#D93025" /> High Risk
    </LegendGroup>
    <LegendGroup>
      <GlowDot $intensity={4} /> Complaints
    </LegendGroup>
    <LegendGroup>
      <ColorDot $color="#D93025" /> ! = Anomaly
    </LegendGroup>
  </LegendContainer>
);

export default MapLegend;

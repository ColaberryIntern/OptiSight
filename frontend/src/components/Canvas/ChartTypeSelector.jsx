import React from 'react';
import styled from 'styled-components';

const Toolbar = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  flex-wrap: wrap;
`;

const TypeButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.primary : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? '#FFFFFF' : theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 500;
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.default};
  white-space: nowrap;

  &:hover {
    background: ${({ $active, theme }) =>
      $active ? theme.colors.primaryHover : theme.colors.surfaceHover};
  }
`;

const CHART_TYPES = [
  { key: 'line', label: 'Line', icon: '\u2014' },
  { key: 'bar', label: 'Bar', icon: '\u2581\u2583\u2585' },
  { key: 'heatmap', label: 'Heatmap', icon: '\u25A6' },
  { key: 'geo', label: 'Geo', icon: '\u25CB' },
  { key: 'network', label: 'Network', icon: '\u25C7' },
  { key: 'radar', label: 'Radar', icon: '\u25CE' },
  { key: 'waterfall', label: 'Waterfall', icon: '\u2587\u2585\u2583' },
  { key: 'forecast', label: 'Forecast', icon: '\u223F' },
  { key: 'risk', label: 'Risk', icon: '\u26A0' },
  { key: 'tree', label: 'Tree', icon: '\u25B7' },
  { key: 'root_cause_split', label: 'Root Cause', icon: '\u2261' },
  { key: 'cluster', label: 'Clusters', icon: '\u25CE' },
];

const ChartTypeSelector = ({ activeType, onTypeChange }) => {
  return (
    <Toolbar data-testid="chart-type-selector">
      {CHART_TYPES.map(({ key, label, icon }) => (
        <TypeButton
          key={key}
          $active={activeType === key}
          onClick={() => onTypeChange?.(key)}
          data-testid={`chart-type-${key}`}
          title={label}
        >
          <span aria-hidden="true">{icon}</span>
          {label}
        </TypeButton>
      ))}
    </Toolbar>
  );
};

export { CHART_TYPES };
export default ChartTypeSelector;

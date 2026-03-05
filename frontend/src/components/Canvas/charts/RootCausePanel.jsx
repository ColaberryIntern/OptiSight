import React, { useRef, useEffect } from 'react';
import styled, { useTheme } from 'styled-components';
import * as d3 from 'd3';

const PanelWrapper = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.md};
  width: 100%;
  height: 100%;
  min-height: 250px;
`;

const ChartSection = styled.div`
  position: relative;
  min-height: 200px;
`;

const SectionTitle = styled.h4`
  margin: 0 0 ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-weight: 500;
`;

const SVGContainer = styled.div`
  width: 100%;
  height: calc(100% - 24px);

  svg {
    width: 100%;
    height: 100%;
  }
`;

const EmptyText = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

/**
 * RootCausePanel — split view: trend chart (left) + SHAP factors (right).
 *
 * Expected data shape:
 * {
 *   left: { type: "line"|"bar", data: { labels, datasets } },
 *   right: { factors: [{ feature, impact, direction }] },
 *   explanation?: string
 * }
 *
 * OR fallback to global_importance-style data:
 * {
 *   factors: [{ feature, impact, direction }]
 * }
 */
const RootCausePanel = ({ data, title }) => {
  const rightRef = useRef(null);
  const theme = useTheme();

  // Normalize data
  const factors = data?.right?.factors || data?.factors || [];

  useEffect(() => {
    if (!rightRef.current || !factors.length) return;

    const container = rightRef.current;
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 220;
    const margin = { top: 10, right: 40, bottom: 10, left: 120 };

    d3.select(container).select('svg').remove();

    const svg = d3
      .select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const sorted = [...factors].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)).slice(0, 10);

    const maxImpact = d3.max(sorted, (d) => Math.abs(d.impact)) || 1;

    const x = d3.scaleLinear().domain([0, maxImpact]).range([0, innerW]);
    const y = d3
      .scaleBand()
      .domain(sorted.map((d) => d.feature))
      .range([0, innerH])
      .padding(0.3);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Bars
    g.selectAll('rect')
      .data(sorted)
      .join('rect')
      .attr('x', 0)
      .attr('y', (d) => y(d.feature))
      .attr('width', (d) => x(Math.abs(d.impact)))
      .attr('height', y.bandwidth())
      .attr('rx', 3)
      .attr('fill', (d) => (d.direction === 'positive' ? '#34A853' : '#D93025'));

    // Labels (feature name)
    g.selectAll('.label')
      .data(sorted)
      .join('text')
      .attr('class', 'label')
      .attr('x', -4)
      .attr('y', (d) => y(d.feature) + y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('font-size', '11px')
      .attr('fill', theme.colors.text)
      .text((d) => {
        const name = d.feature.replace(/_/g, ' ');
        return name.length > 18 ? name.slice(0, 16) + '..' : name;
      });

    // Impact values
    g.selectAll('.value')
      .data(sorted)
      .join('text')
      .attr('class', 'value')
      .attr('x', (d) => x(Math.abs(d.impact)) + 4)
      .attr('y', (d) => y(d.feature) + y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('font-size', '10px')
      .attr('fill', theme.colors.textSecondary)
      .text((d) => `${(d.impact * 100).toFixed(1)}%`);
  }, [factors, theme]);

  if (!data) {
    return <EmptyText>Root cause analysis requires risk or ML data to be available.</EmptyText>;
  }

  return (
    <PanelWrapper>
      <ChartSection>
        <SectionTitle>Trend Analysis</SectionTitle>
        {data?.left?.data ? (
          <EmptyText>Trend chart rendered from query data</EmptyText>
        ) : (
          <EmptyText>Ask about a specific store to see trend data</EmptyText>
        )}
      </ChartSection>
      <ChartSection>
        <SectionTitle>Contributing Factors (SHAP)</SectionTitle>
        {factors.length > 0 ? (
          <SVGContainer ref={rightRef} />
        ) : (
          <EmptyText>No SHAP factor data available</EmptyText>
        )}
      </ChartSection>
    </PanelWrapper>
  );
};

export default RootCausePanel;

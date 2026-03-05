import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { useTheme } from 'styled-components';

const RiskMatrix = ({ data, title }) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const theme = useTheme();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!data || !data.items?.length || !dimensions.width) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 50, left: 60 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    if (width <= 0 || height <= 0) return;

    const g = svg
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales: likelihood (x) and impact (y) both 0-5
    const xScale = d3.scaleLinear().domain([0, 5]).range([0, width]);
    const yScale = d3.scaleLinear().domain([0, 5]).range([height, 0]);

    // Background risk zones (5x5 grid)
    const zoneColor = (li, im) => {
      const score = li * im;
      if (score >= 16) return 'rgba(217, 48, 37, 0.15)'; // critical
      if (score >= 9) return 'rgba(249, 171, 0, 0.15)'; // warning
      if (score >= 4) return 'rgba(249, 171, 0, 0.08)'; // caution
      return 'rgba(52, 168, 83, 0.08)'; // safe
    };

    for (let li = 0; li < 5; li++) {
      for (let im = 0; im < 5; im++) {
        g.append('rect')
          .attr('x', xScale(li))
          .attr('y', yScale(im + 1))
          .attr('width', xScale(1) - xScale(0))
          .attr('height', yScale(0) - yScale(1))
          .attr('fill', zoneColor(li + 1, im + 1))
          .attr('stroke', theme.colors.border)
          .attr('stroke-width', 0.5);
      }
    }

    // Risk items as circles
    const riskColor = (item) => {
      const score = item.likelihood * item.impact;
      if (score >= 16) return theme.colors.error;
      if (score >= 9) return theme.colors.warning;
      return theme.colors.success;
    };

    g.selectAll('.risk-dot')
      .data(data.items)
      .join('circle')
      .attr('class', 'risk-dot')
      .attr('cx', (d) => xScale(d.likelihood))
      .attr('cy', (d) => yScale(d.impact))
      .attr('r', 10)
      .attr('fill', (d) => riskColor(d))
      .attr('fill-opacity', 0.8)
      .attr('stroke', theme.colors.background)
      .attr('stroke-width', 2)
      .append('title')
      .text(
        (d) =>
          `${d.name || d.label}: Likelihood ${d.likelihood}, Impact ${d.impact}`
      );

    // Labels on dots
    g.selectAll('.risk-label')
      .data(data.items)
      .join('text')
      .attr('class', 'risk-label')
      .attr('x', (d) => xScale(d.likelihood))
      .attr('y', (d) => yScale(d.impact))
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .attr('font-size', 8)
      .attr('font-weight', 600)
      .attr('fill', '#FFFFFF')
      .style('pointer-events', 'none')
      .text((d) => (d.label || d.name || '').slice(0, 3).toUpperCase());

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(5))
      .selectAll('text')
      .attr('fill', theme.colors.textSecondary);

    g.append('text')
      .attr('x', width / 2)
      .attr('y', height + 40)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('fill', theme.colors.textSecondary)
      .text('Likelihood');

    // Y axis
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .selectAll('text')
      .attr('fill', theme.colors.textSecondary);

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -45)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('fill', theme.colors.textSecondary)
      .text('Impact');

    g.selectAll('.domain').attr('stroke', theme.colors.border);
    g.selectAll('.tick line').attr('stroke', theme.colors.border);
  }, [data, dimensions, theme]);

  if (!data || !data.items?.length) {
    return <div data-testid="risk-matrix-empty">No data available</div>;
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: 400, minHeight: 200, maxHeight: 500 }}
      data-testid="risk-matrix"
    >
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default RiskMatrix;

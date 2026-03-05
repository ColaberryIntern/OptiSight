import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { useTheme } from 'styled-components';

const HeatmapChart = ({ data, title }) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const theme = useTheme();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // ResizeObserver for responsiveness
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
    if (
      !data ||
      !data.rows?.length ||
      !data.columns?.length ||
      !data.values?.length ||
      !dimensions.width
    )
      return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 30, right: 20, bottom: 60, left: 80 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    if (width <= 0 || height <= 0) return;

    const g = svg
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleBand().domain(data.columns).range([0, width]).padding(0.05);
    const yScale = d3.scaleBand().domain(data.rows).range([0, height]).padding(0.05);

    // Flatten values to find extent
    const allValues = data.values.flat();
    const colorScale = d3
      .scaleSequential()
      .domain(d3.extent(allValues))
      .interpolator(d3.interpolateYlOrRd);

    // Draw cells
    data.rows.forEach((row, ri) => {
      data.columns.forEach((col, ci) => {
        const value = data.values[ri]?.[ci] ?? 0;

        g.append('rect')
          .attr('x', xScale(col))
          .attr('y', yScale(row))
          .attr('width', xScale.bandwidth())
          .attr('height', yScale.bandwidth())
          .attr('fill', colorScale(value))
          .attr('rx', 2)
          .attr('ry', 2)
          .append('title')
          .text(`${row} / ${col}: ${value}`);
      });
    });

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .attr('fill', theme.colors.textSecondary)
      .style('font-size', '10px')
      .attr('transform', 'rotate(-45)')
      .attr('text-anchor', 'end');

    // Y axis
    g.append('g')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .attr('fill', theme.colors.textSecondary)
      .style('font-size', '10px');

    // Remove axis lines for cleaner look
    g.selectAll('.domain').attr('stroke', theme.colors.border);
    g.selectAll('.tick line').attr('stroke', theme.colors.border);
  }, [data, dimensions, theme]);

  if (!data || !data.rows?.length || !data.columns?.length) {
    return <div data-testid="heatmap-chart-empty">No data available</div>;
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: 200 }}
      data-testid="heatmap-chart"
    >
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default HeatmapChart;

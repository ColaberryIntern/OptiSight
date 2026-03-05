import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { useTheme } from 'styled-components';

const WaterfallChart = ({ data, title }) => {
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
    if (!data || !data.steps?.length || !dimensions.width) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 60, left: 60 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    if (width <= 0 || height <= 0) return;

    const g = svg
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Compute cumulative values for positioning
    const steps = data.steps.map((step, i) => ({ ...step, _index: i }));
    let cumulative = 0;
    const barData = steps.map((step) => {
      let start, end;
      if (step.type === 'total') {
        start = 0;
        end = step.value;
        cumulative = step.value;
      } else if (step.type === 'increase') {
        start = cumulative;
        end = cumulative + step.value;
        cumulative = end;
      } else {
        // decrease
        start = cumulative;
        end = cumulative - Math.abs(step.value);
        cumulative = end;
      }
      return { ...step, start, end, y0: Math.min(start, end), y1: Math.max(start, end) };
    });

    const xScale = d3
      .scaleBand()
      .domain(steps.map((s) => s.label))
      .range([0, width])
      .padding(0.3);

    const allValues = barData.flatMap((d) => [d.y0, d.y1]);
    const yMin = Math.min(0, d3.min(allValues));
    const yMax = d3.max(allValues);
    const yScale = d3.scaleLinear().domain([yMin, yMax * 1.1]).range([height, 0]);

    const getColor = (step) => {
      if (step.type === 'total') return theme.colors.chartColors[0];
      if (step.type === 'increase') return theme.colors.success;
      return theme.colors.error;
    };

    // Connector lines between bars
    barData.forEach((d, i) => {
      if (i < barData.length - 1 && d.type !== 'total') {
        const nextStep = steps[i + 1];
        g.append('line')
          .attr('x1', xScale(d.label) + xScale.bandwidth())
          .attr('y1', yScale(d.end))
          .attr('x2', xScale(nextStep.label))
          .attr('y2', yScale(d.end))
          .attr('stroke', theme.colors.border)
          .attr('stroke-dasharray', '3,3')
          .attr('stroke-width', 1);
      }
    });

    // Bars
    g.selectAll('.waterfall-bar')
      .data(barData)
      .join('rect')
      .attr('class', 'waterfall-bar')
      .attr('x', (d) => xScale(d.label))
      .attr('y', (d) => yScale(d.y1))
      .attr('width', xScale.bandwidth())
      .attr('height', (d) => Math.max(0, yScale(d.y0) - yScale(d.y1)))
      .attr('fill', (d) => getColor(d))
      .attr('rx', 2)
      .append('title')
      .text((d) => `${d.label}: ${d.value}`);

    // Value labels on bars
    g.selectAll('.waterfall-label')
      .data(barData)
      .join('text')
      .attr('class', 'waterfall-label')
      .attr('x', (d) => xScale(d.label) + xScale.bandwidth() / 2)
      .attr('y', (d) => yScale(d.y1) - 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', 10)
      .attr('fill', theme.colors.text)
      .text((d) => {
        const prefix = d.type === 'decrease' ? '-' : d.type === 'increase' ? '+' : '';
        return `${prefix}${Math.abs(d.value)}`;
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
      .call(d3.axisLeft(yScale).ticks(6))
      .selectAll('text')
      .attr('fill', theme.colors.textSecondary)
      .style('font-size', '10px');

    g.selectAll('.domain').attr('stroke', theme.colors.border);
    g.selectAll('.tick line').attr('stroke', theme.colors.border);
  }, [data, dimensions, theme]);

  if (!data || !data.steps?.length) {
    return <div data-testid="waterfall-chart-empty">No data available</div>;
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: 200 }}
      data-testid="waterfall-chart"
    >
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default WaterfallChart;

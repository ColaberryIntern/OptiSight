import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { useTheme } from 'styled-components';

const NetworkGraph = ({ data, title }) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const simulationRef = useRef(null);
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
    if (!data || !data.nodes?.length || !dimensions.width) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const width = dimensions.width;
    const height = dimensions.height;

    svg.attr('width', width).attr('height', height);

    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3.zoom().scaleExtent([0.3, 4]).on('zoom', (event) => {
      g.attr('transform', event.transform);
    });
    svg.call(zoom);

    const colorScale = d3
      .scaleOrdinal()
      .domain(data.nodes.map((n) => n.group || 'default'))
      .range(theme.colors.chartColors);

    // Copy data so d3 can mutate positions
    const nodes = data.nodes.map((n) => ({ ...n }));
    const links = (data.links || []).map((l) => ({ ...l }));

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance(80)
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(20));

    simulationRef.current = simulation;

    // Links
    const link = g
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', theme.colors.border)
      .attr('stroke-opacity', 0.5)
      .attr('stroke-width', (d) => d.weight || 1);

    // Nodes
    const node = g
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', (d) => d.radius || 8)
      .attr('fill', (d) => colorScale(d.group || 'default'))
      .attr('stroke', theme.colors.background)
      .attr('stroke-width', 1.5)
      .call(
        d3
          .drag()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Labels
    const label = g
      .selectAll('text')
      .data(nodes)
      .join('text')
      .text((d) => d.label || d.id)
      .attr('font-size', 10)
      .attr('fill', theme.colors.textSecondary)
      .attr('text-anchor', 'middle')
      .attr('dy', -14)
      .style('pointer-events', 'none');

    // Tooltip via title
    node.append('title').text((d) => d.label || d.id);

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);

      node.attr('cx', (d) => d.x).attr('cy', (d) => d.y);
      label.attr('x', (d) => d.x).attr('y', (d) => d.y);
    });

    return () => {
      simulation.stop();
    };
  }, [data, dimensions, theme]);

  if (!data || !data.nodes?.length) {
    return <div data-testid="network-graph-empty">No data available</div>;
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: 200 }}
      data-testid="network-graph"
    >
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default NetworkGraph;

import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { useTheme } from 'styled-components';

const DecompositionTree = ({ data, title }) => {
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
    if (!data || !data.name || !dimensions.width) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 30, right: 90, bottom: 30, left: 90 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    if (width <= 0 || height <= 0) return;

    const g = svg
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const root = d3.hierarchy(data);
    const treeLayout = d3.tree().size([height, width]);
    treeLayout(root);

    const colorScale = d3
      .scaleOrdinal()
      .domain([0, 1, 2, 3])
      .range(theme.colors.chartColors);

    // Links
    g.selectAll('.tree-link')
      .data(root.links())
      .join('path')
      .attr('class', 'tree-link')
      .attr('d', (d) => {
        return `M${d.source.y},${d.source.x}
                C${(d.source.y + d.target.y) / 2},${d.source.x}
                 ${(d.source.y + d.target.y) / 2},${d.target.x}
                 ${d.target.y},${d.target.x}`;
      })
      .attr('fill', 'none')
      .attr('stroke', theme.colors.border)
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6);

    // Nodes
    const node = g
      .selectAll('.tree-node')
      .data(root.descendants())
      .join('g')
      .attr('class', 'tree-node')
      .attr('transform', (d) => `translate(${d.y},${d.x})`);

    node
      .append('circle')
      .attr('r', 6)
      .attr('fill', (d) => colorScale(d.depth))
      .attr('stroke', theme.colors.background)
      .attr('stroke-width', 2);

    // Node labels
    node
      .append('text')
      .attr('dy', '0.35em')
      .attr('x', (d) => (d.children ? -12 : 12))
      .attr('text-anchor', (d) => (d.children ? 'end' : 'start'))
      .attr('font-size', 11)
      .attr('fill', theme.colors.text)
      .text((d) => {
        const name = d.data.name || '';
        const value = d.data.value !== undefined ? ` (${d.data.value})` : '';
        return `${name}${value}`;
      });

    // Tooltip via title
    node
      .append('title')
      .text(
        (d) =>
          `${d.data.name}${d.data.value !== undefined ? `: ${d.data.value}` : ''}`
      );
  }, [data, dimensions, theme]);

  if (!data || !data.name) {
    return <div data-testid="decomposition-tree-empty">No data available</div>;
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: 200 }}
      data-testid="decomposition-tree"
    >
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default DecompositionTree;

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import styled, { useTheme } from 'styled-components';
import * as d3 from 'd3';

const Container = styled.div`
  width: 100%;
  height: 100%;
  min-height: 250px;
  position: relative;

  svg {
    width: 100%;
    height: 100%;
  }
`;

const Tooltip = styled.div`
  position: absolute;
  pointer-events: none;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  box-shadow: ${({ theme }) => theme.shadows.md};
  z-index: 10;
  display: none;
`;

const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

/**
 * ClusterView — D3 force-directed cluster visualization.
 *
 * Expected data:
 * {
 *   clusters: [{id, label, keywords, count, color, stores, trend}],
 *   links?: [{source, target, weight}],
 *   noise_count?: number
 * }
 *
 * Fallback: plain {nodes, links} from issue_clusterer mapper.
 */
const ClusterView = ({ data, title }) => {
  const containerRef = useRef(null);
  const tooltipRef = useRef(null);
  const theme = useTheme();

  const nodes = useMemo(() => {
    if (!data) return [];
    if (data.clusters) {
      return data.clusters.map((c) => ({
        id: c.id || `cluster-${c.cluster_id || Math.random()}`,
        label: c.label || c.keywords?.join(', ') || `Cluster`,
        radius: Math.max(10, Math.min(40, 10 + (c.count || c.issue_count || 1))),
        count: c.count || c.issue_count || 0,
        keywords: c.keywords || c.top_keywords || [],
        color: c.color,
      }));
    }
    if (data.nodes) return data.nodes;
    return [];
  }, [data]);

  const links = useMemo(() => {
    return data?.links || [];
  }, [data]);

  const draw = useCallback(() => {
    if (!containerRef.current || !nodes.length) return;

    const container = containerRef.current;
    const width = container.clientWidth || 500;
    const height = container.clientHeight || 350;

    d3.select(container).select('svg').remove();

    const svg = d3
      .select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const g = svg.append('g');

    // Zoom
    const zoom = d3.zoom().scaleExtent([0.3, 3]).on('zoom', (event) => {
      g.attr('transform', event.transform);
    });
    svg.call(zoom);

    const color = d3.scaleOrdinal(d3.schemeTableau10);

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
      .force('collision', d3.forceCollide().radius((d) => (d.radius || 15) + 5));

    // Links
    const link = g
      .selectAll('.link')
      .data(links)
      .join('line')
      .attr('class', 'link')
      .attr('stroke', theme.colors.border)
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d) => Math.max(1, (d.weight || 1) * 2));

    // Nodes
    const node = g
      .selectAll('.node')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .call(
        d3.drag()
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

    node
      .append('circle')
      .attr('r', (d) => d.radius || 15)
      .attr('fill', (d) => d.color || color(d.group || d.id))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('opacity', 0.85);

    // Labels
    node
      .append('text')
      .text((d) => {
        const label = d.label || d.id;
        return label.length > 20 ? label.slice(0, 18) + '..' : label;
      })
      .attr('dy', (d) => (d.radius || 15) + 14)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', theme.colors.text);

    // Count inside node
    node
      .filter((d) => d.count > 0)
      .append('text')
      .text((d) => d.count)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .attr('fill', '#fff');

    // Tooltip
    node
      .on('mouseenter', (event, d) => {
        if (tooltipRef.current) {
          const tooltip = tooltipRef.current;
          tooltip.style.display = 'block';
          tooltip.style.left = `${event.offsetX + 10}px`;
          tooltip.style.top = `${event.offsetY - 10}px`;
          const kw = d.keywords?.slice(0, 5).join(', ') || '';
          tooltip.innerHTML = `
            <strong>${d.label || d.id}</strong><br/>
            ${d.count ? `Issues: ${d.count}<br/>` : ''}
            ${kw ? `Keywords: ${kw}` : ''}
          `;
        }
      })
      .on('mouseleave', () => {
        if (tooltipRef.current) {
          tooltipRef.current.style.display = 'none';
        }
      });

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);
      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    return () => simulation.stop();
  }, [nodes, links, theme]);

  useEffect(() => {
    draw();
  }, [draw]);

  if (!data || (!nodes.length)) {
    return <EmptyState>No cluster data available. Ask about complaint patterns to see clusters.</EmptyState>;
  }

  return (
    <Container ref={containerRef}>
      <Tooltip ref={tooltipRef} />
    </Container>
  );
};

export default ClusterView;

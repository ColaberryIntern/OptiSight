import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import MapNode from './MapNode';
import MapTooltip from './MapTooltip';

const Container = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
`;

const StyledSvg = styled.svg`
  width: 100%;
  height: 100%;
  display: block;
`;

/**
 * Computes a radius scale based on revenue across all nodes.
 */
const buildRadiusScale = (nodes) => {
  if (!nodes.length) return () => 22;
  const revenues = nodes.map((n) => n.revenue || 0);
  const minRev = Math.min(...revenues);
  const maxRev = Math.max(...revenues);
  if (minRev === maxRev) return () => 22;
  return d3.scaleSqrt().domain([minRev, maxRev]).range([16, 40]);
};

const IntelligenceMap = ({
  nodes = [],
  selectedNode,
  onNodeSelect,
  width = 800,
  height = 600,
}) => {
  const svgRef = useRef(null);
  const gRef = useRef(null);
  const simulationRef = useRef(null);
  const [positions, setPositions] = useState(new Map());
  const [tooltip, setTooltip] = useState(null);

  const similarityEdges = useSelector((state) => state.intelligenceMap.similarityEdges);
  const showSimilarity = useSelector((state) => state.intelligenceMap.showSimilarity);
  const regionFilter = useSelector((state) => state.intelligenceMap.regionFilter);
  const riskFilter = useSelector((state) => state.intelligenceMap.riskFilter);

  // Filter nodes by region and risk level
  const filteredNodes = useMemo(() => {
    let result = nodes;
    if (regionFilter) {
      result = result.filter((n) => n.region === regionFilter);
    }
    if (riskFilter) {
      result = result.filter((n) => n.riskLevel === riskFilter);
    }
    return result;
  }, [nodes, regionFilter, riskFilter]);

  const radiusScale = useMemo(() => buildRadiusScale(filteredNodes), [filteredNodes]);

  // Visible similarity edges (only between visible nodes)
  const visibleEdges = useMemo(() => {
    if (!showSimilarity || !similarityEdges.length) return [];
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    return similarityEdges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    );
  }, [showSimilarity, similarityEdges, filteredNodes]);

  // Run D3 force simulation
  useEffect(() => {
    if (!filteredNodes.length) return;

    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const simNodes = filteredNodes.map((n) => ({
      id: n.id,
      x: width / 2 + (Math.random() - 0.5) * 200,
      y: height / 2 + (Math.random() - 0.5) * 200,
    }));

    const simLinks = visibleEdges.map((e) => ({
      source: e.source,
      target: e.target,
      weight: e.weight || 0.5,
    }));

    const simulation = d3
      .forceSimulation(simNodes)
      .force(
        'link',
        d3
          .forceLink(simLinks)
          .id((d) => d.id)
          .distance(120)
          .strength((d) => d.weight * 0.3)
      )
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(50))
      .alphaDecay(0.05);

    simulation.on('tick', () => {
      const next = new Map();
      simNodes.forEach((n) => {
        next.set(n.id, { x: n.x, y: n.y });
      });
      setPositions(new Map(next));
    });

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredNodes.length, visibleEdges.length, width, height]);

  // Zoom + Pan
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;

    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    return () => {
      svg.on('.zoom', null);
    };
  }, []);

  const handleNodeClick = useCallback(
    (node) => {
      onNodeSelect?.(node);
    },
    [onNodeSelect]
  );

  const handleMouseEnter = useCallback((node, event) => {
    const svgRect = event.currentTarget.closest('svg')?.getBoundingClientRect();
    if (!svgRect) return;
    const clientX = event.clientX - svgRect.left;
    const clientY = event.clientY - svgRect.top;
    setTooltip({ node, x: clientX, y: clientY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  return (
    <Container data-testid="intelligence-map">
      <StyledSvg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <g ref={gRef}>
          {/* Similarity edges */}
          {visibleEdges.map((edge) => {
            const sourcePos = positions.get(edge.source);
            const targetPos = positions.get(edge.target);
            if (!sourcePos || !targetPos) return null;

            return (
              <line
                key={`sim-${edge.source}-${edge.target}`}
                x1={sourcePos.x}
                y1={sourcePos.y}
                x2={targetPos.x}
                y2={targetPos.y}
                stroke="#8AB4F8"
                strokeWidth={1.5}
                strokeOpacity={edge.weight || 0.4}
                strokeDasharray="6 3"
                data-testid="map-link"
              />
            );
          })}

          {/* Store nodes */}
          {filteredNodes.map((node) => {
            const pos = positions.get(node.id);
            if (!pos) return null;

            const r = radiusScale(node.revenue || 0);

            return (
              <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}>
                <MapNode
                  node={node}
                  radius={r}
                  isSelected={selectedNode === node.id}
                  onClick={handleNodeClick}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                />
              </g>
            );
          })}
        </g>
      </StyledSvg>

      {/* Tooltip overlay */}
      {tooltip && (
        <MapTooltip node={tooltip.node} x={tooltip.x} y={tooltip.y} />
      )}
    </Container>
  );
};

export default IntelligenceMap;

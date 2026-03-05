import React from 'react';

/**
 * Returns a color based on risk score:
 *   < 40 = green (low risk), 40-70 = yellow/amber, > 70 = red (high risk)
 */
const getRiskColor = (riskScore) => {
  if (riskScore > 70) return '#D93025';
  if (riskScore > 40) return '#F9AB00';
  return '#34A853';
};

const getRiskColorLight = (riskScore) => {
  if (riskScore > 70) return '#F28B82';
  if (riskScore > 40) return '#FDD663';
  return '#81C995';
};

/**
 * Returns glow intensity based on complaint count.
 *   0 = none, 1-5 = subtle (2px), 5+ = strong (5px)
 */
const getGlowDeviation = (complaintCount) => {
  if (!complaintCount || complaintCount === 0) return 0;
  if (complaintCount <= 5) return 2;
  return 5;
};

const MapNode = ({
  node,
  isSelected,
  onClick,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
  radius = 22,
}) => {
  if (!node) return null;

  const riskScore = node.riskScore ?? 50;
  const health = node.health ?? 50;
  const color = getRiskColor(riskScore);
  const colorLight = getRiskColorLight(riskScore);
  const gradientId = `grad-${node.id}`;
  const glowId = `glow-${node.id}`;
  const complaintGlowId = `cglow-${node.id}`;
  const complaintGlow = getGlowDeviation(node.complaintCount);
  const hasAnomaly = node.anomalyDetected;
  const label = (node.label || '').length > 12
    ? node.label.substring(0, 11) + '\u2026'
    : node.label || '';

  return (
    <g
      data-testid={`map-node-${node.id}`}
      style={{ cursor: 'pointer' }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(node);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick?.(node);
      }}
      onMouseEnter={(e) => onMouseEnter?.(node, e)}
      onMouseLeave={(e) => onMouseLeave?.(node, e)}
    >
      {/* Definitions for gradient and glow */}
      <defs>
        <radialGradient id={gradientId} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor={colorLight} />
          <stop offset="100%" stopColor={color} />
        </radialGradient>
        {isSelected && (
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
        {complaintGlow > 0 && (
          <filter id={complaintGlowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={complaintGlow} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      {/* Main circle — size = revenue (via radius prop), color = risk */}
      <circle
        r={radius}
        fill={`url(#${gradientId})`}
        stroke={isSelected ? '#FFFFFF' : color}
        strokeWidth={isSelected ? 3 : 1.5}
        filter={
          isSelected
            ? `url(#${glowId})`
            : complaintGlow > 0
              ? `url(#${complaintGlowId})`
              : undefined
        }
        opacity={0.9}
      />

      {/* Label text */}
      <text
        textAnchor="middle"
        dy="0.35em"
        fontSize={radius > 25 ? 10 : 8}
        fontWeight={600}
        fill="#FFFFFF"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {label}
      </text>

      {/* Health score below circle */}
      <text
        textAnchor="middle"
        y={radius + 12}
        fontSize={8}
        fill={color}
        fontWeight={500}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {health}%
      </text>

      {/* Anomaly badge (top-right warning icon) */}
      {hasAnomaly && (
        <g transform={`translate(${radius * 0.7}, ${-radius * 0.7})`}>
          <circle r={8} fill="#D93025" />
          <text
            textAnchor="middle"
            dy="0.38em"
            fontSize={10}
            fill="#FFFFFF"
            style={{ pointerEvents: 'none' }}
          >
            !
          </text>
        </g>
      )}

      {/* Complaint count badge (top-left, only if > 0) */}
      {node.complaintCount > 0 && (
        <g transform={`translate(${-radius * 0.7}, ${-radius * 0.7})`}>
          <circle r={9} fill="#F9AB00" />
          <text
            textAnchor="middle"
            dy="0.35em"
            fontSize={8}
            fontWeight={700}
            fill="#FFFFFF"
            style={{ pointerEvents: 'none' }}
          >
            {node.complaintCount}
          </text>
        </g>
      )}
    </g>
  );
};

export default MapNode;

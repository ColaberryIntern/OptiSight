import React from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';

const HealthRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  flex-wrap: wrap;
`;

const Indicator = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Dot = styled.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $ok, theme }) => ($ok ? theme.colors.success : theme.colors.error)};
`;

const SERVICES = [
  { key: 'sql', label: 'SQL' },
  { key: 'ml', label: 'ML' },
  { key: 'vector', label: 'Vector' },
  { key: 'llm', label: 'LLM' },
];

const SystemHealthBar = () => {
  const healthStatus = useSelector(
    (state) => state.aiAssistant?.healthStatus ?? {}
  );

  // If no health data loaded yet, show a minimal "Checking..."
  const hasData = Object.keys(healthStatus).length > 0;

  if (!hasData) {
    return (
      <HealthRow data-testid="system-health-bar">
        <Indicator>
          <Dot $ok={false} /> Checking...
        </Indicator>
      </HealthRow>
    );
  }

  return (
    <HealthRow data-testid="system-health-bar">
      {SERVICES.map(({ key, label }) => {
        const status = healthStatus[key];
        const isOk = status?.status === 'ok';
        return (
          <Indicator key={key} title={isOk ? `${label}: OK` : `${label}: Error`}>
            <Dot $ok={isOk} /> {label}
          </Indicator>
        );
      })}
    </HealthRow>
  );
};

export default SystemHealthBar;

import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';

const slideDown = keyframes`
  from {
    max-height: 0;
    opacity: 0;
  }
  to {
    max-height: 300px;
    opacity: 1;
  }
`;

const Container = styled.div`
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Header = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text};
  font-family: inherit;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: background ${({ theme }) => theme.transitions.default};

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const AlertCount = styled.span`
  background: ${({ theme }) => theme.colors.error};
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  min-width: 18px;
  text-align: center;
`;

const ChevronIcon = styled.span`
  display: inline-flex;
  transition: transform ${({ theme }) => theme.transitions.default};
  transform: ${({ $expanded }) => ($expanded ? 'rotate(180deg)' : 'rotate(0deg)')};
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const AlertList = styled.div`
  overflow: hidden;
  max-height: ${({ $expanded }) => ($expanded ? '300px' : '0')};
  opacity: ${({ $expanded }) => ($expanded ? 1 : 0)};
  transition: max-height 0.3s ease-in-out, opacity 0.2s ease-in-out;
  overflow-y: auto;
`;

const AlertItem = styled.button`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.sm};
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: none;
  border: none;
  border-top: 1px solid ${({ theme }) => `${theme.colors.border}66`};
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: background ${({ theme }) => theme.transitions.default};

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
  }
`;

const severityColors = {
  critical: (theme) => theme.colors.error,
  high: (theme) => theme.colors.error,
  medium: (theme) => theme.colors.warning,
  low: (theme) => theme.colors.success,
};

const SeverityDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $severity, theme }) => {
    const colorFn = severityColors[$severity];
    return colorFn ? colorFn(theme) : theme.colors.warning;
  }};
  flex-shrink: 0;
  margin-top: 4px;
`;

const AlertContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const AlertTitle = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text};
  font-weight: 500;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const AlertTime = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 2px;
`;

const AlertFeed = ({ alerts = [], onAlertClick }) => {
  const [expanded, setExpanded] = useState(true);

  if (!alerts || alerts.length === 0) return null;

  const handleAlertClick = (alert) => {
    if (onAlertClick) {
      // Convert alert into a question to send to the chat
      const question =
        alert.question || `Tell me more about: ${alert.title || alert.message}`;
      onAlertClick(question);
    }
  };

  return (
    <Container data-testid="alert-feed">
      <Header
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-label="Toggle alerts"
        data-testid="alert-feed-toggle"
      >
        <HeaderLeft>
          Alerts
          <AlertCount>{alerts.length}</AlertCount>
        </HeaderLeft>
        <ChevronIcon $expanded={expanded}>&#9660;</ChevronIcon>
      </Header>
      <AlertList $expanded={expanded}>
        {alerts.map((alert, index) => (
          <AlertItem
            key={alert.id || index}
            onClick={() => handleAlertClick(alert)}
            title={alert.title || alert.message}
            data-testid={`alert-item-${index}`}
          >
            <SeverityDot $severity={alert.severity || 'medium'} />
            <AlertContent>
              <AlertTitle>{alert.title || alert.message}</AlertTitle>
              {alert.timestamp && (
                <AlertTime>{alert.timestamp}</AlertTime>
              )}
            </AlertContent>
          </AlertItem>
        ))}
      </AlertList>
    </Container>
  );
};

export default AlertFeed;

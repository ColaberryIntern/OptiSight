import React from 'react';
import styled, { keyframes } from 'styled-components';

const bounce = keyframes`
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Container = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  animation: ${fadeIn} 0.3s ease-out;
`;

const Avatar = styled.div`
  width: 28px;
  height: 28px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background: ${({ theme }) => theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: #fff;
  font-weight: 600;
`;

const Bubble = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  border-top-left-radius: ${({ theme }) => theme.borderRadius.sm};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  max-width: 260px;
`;

const DotsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  height: 20px;
`;

const Dot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  display: inline-block;
  animation: ${bounce} 1.4s ease-in-out infinite both;
  animation-delay: ${({ $delay }) => $delay};
`;

const Label = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-style: italic;
`;

const ExecutionStep = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.primary};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  animation: ${fadeIn} 0.2s ease-out;

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.primary};
    opacity: 0.6;
  }
`;

const ThinkingIndicator = ({ executionSteps = [] }) => {
  return (
    <Container>
      <Avatar>AI</Avatar>
      <Bubble>
        <DotsRow>
          <Dot $delay="0s" />
          <Dot $delay="0.16s" />
          <Dot $delay="0.32s" />
          <Label>Thinking...</Label>
        </DotsRow>
        {executionSteps.length > 0 &&
          executionSteps.map((step, index) => (
            <ExecutionStep key={index}>{step}</ExecutionStep>
          ))}
      </Bubble>
    </Container>
  );
};

export default ThinkingIndicator;

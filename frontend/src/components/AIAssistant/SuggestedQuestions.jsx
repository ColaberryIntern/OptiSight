import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.md};
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => `${theme.colors.border} transparent`};

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border};
    border-radius: 2px;
  }
`;

const ChipList = styled.div`
  display: inline-flex;
  gap: ${({ theme }) => theme.spacing.xs};
  padding-bottom: ${({ theme }) => theme.spacing.xs};
`;

const Chip = styled.button`
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  cursor: pointer;
  white-space: nowrap;
  transition: all ${({ theme }) => theme.transitions.default};
  font-family: inherit;
  line-height: 1.3;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }

  &:active {
    transform: scale(0.97);
  }
`;

const SuggestedQuestions = ({ questions = [], onSelect }) => {
  if (!questions || questions.length === 0) return null;

  return (
    <Container data-testid="suggested-questions">
      <ChipList>
        {questions.map((question, index) => (
          <Chip
            key={index}
            onClick={() => onSelect(question)}
            title={question}
            data-testid={`suggestion-chip-${index}`}
          >
            {question}
          </Chip>
        ))}
      </ChipList>
    </Container>
  );
};

export default SuggestedQuestions;

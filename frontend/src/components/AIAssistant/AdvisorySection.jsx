import React, { useState } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  margin-top: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  overflow: hidden;
`;

const Toggle = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => `${theme.colors.primary}08`};
  border: none;
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Arrow = styled.span`
  transform: ${({ $open }) => ($open ? 'rotate(180deg)' : 'rotate(0deg)')};
  transition: transform 0.2s;
  font-size: 10px;
`;

const List = styled.div`
  display: ${({ $open }) => ($open ? 'flex' : 'none')};
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.sm};
`;

const Item = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  align-items: flex-start;
  padding: ${({ theme }) => theme.spacing.xs};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  background: ${({ theme }) => theme.colors.surfaceHover};
`;

const PriorityDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
  background: ${({ $priority }) => {
    switch ($priority) {
      case 'high': return '#D93025';
      case 'medium': return '#F9AB00';
      default: return '#34A853';
    }
  }};
`;

const ItemContent = styled.div`
  flex: 1;
`;

const ActionText = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text};
  font-weight: 500;
`;

const ReasoningText = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 2px;
`;

const CategoryBadge = styled.span`
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background: ${({ theme }) => `${theme.colors.primary}14`};
  color: ${({ theme }) => theme.colors.primary};
  white-space: nowrap;
`;

function AdvisorySection({ recommendations }) {
  const [open, setOpen] = useState(false);

  if (!recommendations || recommendations.length === 0) return null;

  return (
    <Container>
      <Toggle onClick={() => setOpen(!open)}>
        <span>Recommended Executive Actions ({recommendations.length})</span>
        <Arrow $open={open}>&#9660;</Arrow>
      </Toggle>
      <List $open={open}>
        {recommendations.map((rec, idx) => (
          <Item key={idx}>
            <PriorityDot $priority={rec.priority} />
            <ItemContent>
              <ActionText>
                {rec.action}
                {rec.category && (
                  <>
                    {' '}
                    <CategoryBadge>{rec.category}</CategoryBadge>
                  </>
                )}
              </ActionText>
              {rec.reasoning && <ReasoningText>{rec.reasoning}</ReasoningText>}
            </ItemContent>
          </Item>
        ))}
      </List>
    </Container>
  );
}

export default AdvisorySection;

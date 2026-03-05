import styled, { css } from 'styled-components';

const variantStyles = {
  primary: css`
    background-color: ${({ theme }) => theme.colors.primary};
    color: #ffffff;
    border: none;

    &:hover:not(:disabled) {
      background-color: ${({ theme }) => theme.colors.primaryHover};
    }
  `,
  secondary: css`
    background-color: transparent;
    color: ${({ theme }) => theme.colors.text};
    border: 1px solid ${({ theme }) => theme.colors.border};

    &:hover:not(:disabled) {
      background-color: ${({ theme }) => theme.colors.surfaceHover};
    }
  `,
  danger: css`
    background-color: ${({ theme }) => theme.colors.error};
    color: #ffffff;
    border: none;

    &:hover:not(:disabled) {
      opacity: 0.9;
    }
  `,
};

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.lg};
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: 500;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  transition: all ${({ theme }) => theme.transitions.default};
  cursor: pointer;
  min-width: 100px;

  ${({ $variant = 'primary' }) => variantStyles[$variant] || variantStyles.primary}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

export default Button;

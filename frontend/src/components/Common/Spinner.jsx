import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const SpinnerWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.md};
`;

const SpinnerCircle = styled.div`
  width: ${({ $size }) => $size || '32px'};
  height: ${({ $size }) => $size || '32px'};
  border: 3px solid ${({ theme }) => theme.colors.border};
  border-top-color: ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

function Spinner({ size }) {
  return (
    <SpinnerWrapper role="status" aria-label="Loading">
      <SpinnerCircle $size={size} />
    </SpinnerWrapper>
  );
}

export default Spinner;

import { Link } from 'react-router-dom';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.lg};
`;

const Code = styled.h1`
  font-size: 6rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  line-height: 1;
`;

const Message = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const StyledLink = styled(Link)`
  margin-top: ${({ theme }) => theme.spacing.md};
  font-size: ${({ theme }) => theme.fontSizes.md};
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`;

function NotFoundPage() {
  return (
    <Container>
      <Code>404</Code>
      <Message>Page not found</Message>
      <StyledLink to="/intelligence">Back to Intelligence OS</StyledLink>
    </Container>
  );
}

export default NotFoundPage;

import { Outlet } from 'react-router-dom';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: ${({ theme }) => theme.spacing.lg};
  background-color: ${({ theme }) => theme.colors.background};
`;

const Logo = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  text-align: center;
`;

const LogoTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.xxl};
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 700;
  letter-spacing: -0.5px;
`;

const LogoSubtitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

function PublicLayout() {
  return (
    <Container>
      <Logo>
        <LogoTitle>OptiSight AI</LogoTitle>
        <LogoSubtitle>Retail Intelligence Platform</LogoSubtitle>
      </Logo>
      <Outlet />
    </Container>
  );
}

export default PublicLayout;

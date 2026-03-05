import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import styled from 'styled-components';
import { logout } from '../../store/slices/authSlice';
import { toggleLeftPanel, toggleRightPanel } from '../../store/slices/uiSlice';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import AIAssistant from '../AIAssistant/AIAssistant';
import IntelligenceMap from '../IntelligenceMap/IntelligenceMap';
import MapControls from '../IntelligenceMap/MapControls';
import MapLegend from '../IntelligenceMap/MapLegend';
import { fetchMapData, selectNode } from '../../store/slices/intelligenceMapSlice';

/* ------------------------------------------------------------------ */
/*  TopBar — 48px fixed height                                        */
/* ------------------------------------------------------------------ */

const TopBar = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  flex-shrink: 0;
  z-index: 10;
`;

const TopBarLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Logo = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  letter-spacing: -0.3px;
`;

const ConnectionIndicator = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background-color: ${({ theme }) => theme.colors.success};
  margin-left: ${({ theme }) => theme.spacing.xs};
`;

const TopBarRight = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const UserName = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textSecondary};

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: none;
  }
`;

const LogoutButton = styled.button`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  background: none;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.default};

  &:hover {
    color: ${({ theme }) => theme.colors.error};
    border-color: ${({ theme }) => theme.colors.error};
  }
`;

/* ------------------------------------------------------------------ */
/*  Body — three-panel layout                                         */
/* ------------------------------------------------------------------ */

const Body = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column;
  }
`;

/* Left Panel */

const LeftPanel = styled.aside`
  width: ${({ $collapsed }) => ($collapsed ? '60px' : '260px')};
  background-color: ${({ theme }) => theme.colors.surface};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  transition: width ${({ theme }) => theme.transitions.default};
  overflow-y: auto;
  overflow-x: hidden;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;

  @media (max-width: ${({ theme }) => theme.breakpoints.desktop}) {
    width: 60px;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: none;
  }
`;

const PanelToggleButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin: ${({ theme }) => theme.spacing.xs};
  background: none;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  align-self: ${({ $align }) => $align || 'flex-end'};
  transition: all ${({ theme }) => theme.transitions.default};
  flex-shrink: 0;

  &:hover {
    background-color: ${({ theme }) => theme.colors.surfaceHover};
    color: ${({ theme }) => theme.colors.text};
  }
`;

const PanelPlaceholder = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  text-align: center;
`;

/* Center Canvas */

const CenterCanvas = styled.main`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background-color: ${({ theme }) => theme.colors.background};
`;

/* Right Panel */

const RightPanel = styled.aside`
  width: ${({ $collapsed }) => ($collapsed ? '0px' : '380px')};
  background-color: ${({ theme }) => theme.colors.surface};
  border-left: 1px solid ${({ theme }) => theme.colors.border};
  transition: width ${({ theme }) => theme.transitions.default};
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;

  @media (max-width: ${({ theme }) => theme.breakpoints.desktop}) {
    width: ${({ $collapsed }) => ($collapsed ? '0px' : '320px')};
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    width: ${({ $collapsed }) => ($collapsed ? '0px' : '280px')};
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: none;
  }
`;

/* ------------------------------------------------------------------ */
/*  StatusBar — 24px fixed height                                     */
/* ------------------------------------------------------------------ */

const StatusBar = styled.footer`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 24px;
  padding: 0 ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => theme.colors.surface};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textSecondary};
  flex-shrink: 0;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: none;
  }
`;

const StatusSection = styled.span`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

/* ------------------------------------------------------------------ */
/*  Mobile Bottom Nav                                                 */
/* ------------------------------------------------------------------ */

const MobileNav = styled.nav`
  display: none;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: flex;
    align-items: center;
    justify-content: space-around;
    height: 56px;
    background-color: ${({ theme }) => theme.colors.surface};
    border-top: 1px solid ${({ theme }) => theme.colors.border};
    flex-shrink: 0;
  }
`;

const MobileNavButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: ${({ theme }) => theme.spacing.xs};
  background: none;
  border: none;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.textSecondary};
  font-size: 10px;
  cursor: pointer;
`;

const MobileNavIcon = styled.span`
  font-size: 18px;
`;

/* ------------------------------------------------------------------ */
/*  Shell — full viewport                                             */
/* ------------------------------------------------------------------ */

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background-color: ${({ theme }) => theme.colors.background};
`;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

function IntelligenceOSLayout() {
  const dispatch = useDispatch();
  const { leftPanelCollapsed, rightPanelCollapsed } = useSelector(
    (state) => state.ui
  );
  const user = useSelector((state) => state.auth.user);
  const executionPath = useSelector(
    (state) => state.aiAssistant.executionPath
  );
  const mapNodes = useSelector((state) => state.intelligenceMap.nodes);
  const selectedNode = useSelector(
    (state) => state.intelligenceMap.selectedNode
  );

  // Fetch intelligence map data on mount
  useEffect(() => {
    dispatch(fetchMapData());
  }, [dispatch]);

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <Shell>
      {/* Top Bar */}
      <TopBar>
        <TopBarLeft>
          <Logo>OptiSight AI</Logo>
          <ConnectionIndicator title="Connected" />
        </TopBarLeft>
        <TopBarRight>
          <ThemeToggle />
          <UserName>{user?.email || 'User'}</UserName>
          <LogoutButton onClick={handleLogout}>Logout</LogoutButton>
        </TopBarRight>
      </TopBar>

      {/* Three-panel body */}
      <Body>
        {/* Left Panel — Intelligence Map */}
        <LeftPanel $collapsed={leftPanelCollapsed}>
          <PanelToggleButton
            $align="flex-end"
            onClick={() => dispatch(toggleLeftPanel())}
            aria-label={
              leftPanelCollapsed
                ? 'Expand intelligence map'
                : 'Collapse intelligence map'
            }
          >
            {leftPanelCollapsed ? '\u25B6' : '\u25C0'}
          </PanelToggleButton>
          {!leftPanelCollapsed && (
            <>
              <MapControls />
              <IntelligenceMap
                nodes={mapNodes}
                selectedNode={selectedNode}
                onNodeSelect={(nodeId) => dispatch(selectNode(nodeId))}
              />
              <MapLegend />
            </>
          )}
        </LeftPanel>

        {/* Center Canvas — renders page content via Outlet */}
        <CenterCanvas>
          <Outlet />
        </CenterCanvas>

        {/* Right Panel — AI Assistant */}
        <RightPanel $collapsed={rightPanelCollapsed}>
          <PanelToggleButton
            $align="flex-start"
            onClick={() => dispatch(toggleRightPanel())}
            aria-label={
              rightPanelCollapsed
                ? 'Expand AI assistant'
                : 'Collapse AI assistant'
            }
          >
            {rightPanelCollapsed ? '\u25C0' : '\u25B6'}
          </PanelToggleButton>
          {!rightPanelCollapsed && <AIAssistant />}
        </RightPanel>
      </Body>

      {/* Status Bar — desktop/tablet only */}
      <StatusBar>
        <StatusSection>
          Last refresh: {new Date().toLocaleTimeString()}
        </StatusSection>
        <StatusSection>
          {executionPath
            ? `Path: ${executionPath}`
            : 'Ready'}
        </StatusSection>
      </StatusBar>

      {/* Mobile Bottom Nav — replaces side panels on small screens */}
      <MobileNav>
        <MobileNavButton
          $active={!leftPanelCollapsed}
          onClick={() => dispatch(toggleLeftPanel())}
        >
          <MobileNavIcon>{'\u{1F5FA}'}</MobileNavIcon>
          Map
        </MobileNavButton>
        <MobileNavButton $active>
          <MobileNavIcon>{'\u{1F4CA}'}</MobileNavIcon>
          Canvas
        </MobileNavButton>
        <MobileNavButton
          $active={!rightPanelCollapsed}
          onClick={() => dispatch(toggleRightPanel())}
        >
          <MobileNavIcon>{'\u{1F4AC}'}</MobileNavIcon>
          Assistant
        </MobileNavButton>
      </MobileNav>
    </Shell>
  );
}

export default IntelligenceOSLayout;

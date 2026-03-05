import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import App from './App';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './store/slices/authSlice';
import uiReducer from './store/slices/uiSlice';
import intelligenceMapReducer from './store/slices/intelligenceMapSlice';
import canvasReducer from './store/slices/canvasSlice';
import aiAssistantReducer from './store/slices/aiAssistantSlice';
import orchestratorReducer from './store/slices/orchestratorSlice';
import executiveReducer from './store/slices/executiveSlice';
import { lightTheme } from './styles/theme';

// jsdom doesn't implement scrollIntoView
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

function createTestStore(preloadedState = {}) {
  return configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer,
      intelligenceMap: intelligenceMapReducer,
      canvas: canvasReducer,
      aiAssistant: aiAssistantReducer,
      orchestrator: orchestratorReducer,
      executive: executiveReducer,
    },
    preloadedState,
  });
}

function renderWithProviders(ui, { route = '/', store } = {}) {
  const testStore = store || createTestStore();
  return render(
    <Provider store={testStore}>
      <MemoryRouter initialEntries={[route]}>
        <ThemeProvider theme={lightTheme}>
          {ui}
        </ThemeProvider>
      </MemoryRouter>
    </Provider>
  );
}

describe('App', () => {
  it('redirects unauthenticated users from / to login', () => {
    renderWithProviders(<App />, { route: '/' });
    // Unauthenticated users hitting /intelligence are redirected to /login
    // which renders inside PublicLayout showing "OptiSight AI"
    expect(screen.getByText('OptiSight AI')).toBeInTheDocument();
  });

  it('shows login form on /login route', () => {
    renderWithProviders(<App />, { route: '/login' });
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('shows register form on /register route', () => {
    renderWithProviders(<App />, { route: '/register' });
    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('shows 404 page for unknown routes', () => {
    renderWithProviders(<App />, { route: '/some-unknown-path' });
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Page not found')).toBeInTheDocument();
  });

  it('renders Intelligence OS layout for authenticated users on /intelligence', () => {
    const store = createTestStore({
      auth: {
        user: { user_id: 'u1', email: 'test@example.com' },
        token: 'test-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      },
    });

    renderWithProviders(<App />, { route: '/intelligence', store });
    // The IntelligenceOSLayout TopBar shows "OptiSight AI" and the Logout button
    expect(screen.getByText('OptiSight AI')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });
});

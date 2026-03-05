import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../../store/slices/authSlice';
import uiReducer from '../../../store/slices/uiSlice';
import { lightTheme } from '../../../styles/theme';
import LoginForm from '../LoginForm';

function createTestStore(preloadedState = {}) {
  return configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer,
    },
    preloadedState,
  });
}

function renderLoginForm(store) {
  const testStore = store || createTestStore();
  return render(
    <Provider store={testStore}>
      <BrowserRouter>
        <ThemeProvider theme={lightTheme}>
          <LoginForm />
        </ThemeProvider>
      </BrowserRouter>
    </Provider>
  );
}

describe('LoginForm', () => {
  it('renders email and password inputs', () => {
    renderLoginForm();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders the sign in button', () => {
    renderLoginForm();

    expect(
      screen.getByRole('button', { name: /sign in/i })
    ).toBeInTheDocument();
  });

  it('renders a link to the register page', () => {
    renderLoginForm();

    const link = screen.getByRole('link', { name: /create one/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/register');
  });

  it('shows validation errors on empty submit', async () => {
    const user = userEvent.setup();
    renderLoginForm();

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('displays server error from auth state', () => {
    const store = createTestStore({
      auth: {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Invalid credentials',
      },
      ui: {
        theme: 'light',
        sidebarCollapsed: false,
      },
    });

    renderLoginForm(store);

    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });
});

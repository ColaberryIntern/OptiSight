import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import { lightTheme, darkTheme } from '../../../styles/theme';
import uiReducer from '../../../store/slices/uiSlice';
import ThemeToggle from '../ThemeToggle';

function renderToggle(initialTheme = 'light') {
  const store = configureStore({
    reducer: { ui: uiReducer },
    preloadedState: {
      ui: { theme: initialTheme, sidebarCollapsed: false },
    },
  });

  const theme = initialTheme === 'dark' ? darkTheme : lightTheme;

  render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <ThemeToggle />
      </ThemeProvider>
    </Provider>
  );

  return store;
}

describe('ThemeToggle', () => {
  it('renders with moon icon in light mode', () => {
    renderToggle('light');
    const button = screen.getByRole('button', { name: /switch to dark mode/i });
    expect(button).toBeInTheDocument();
  });

  it('renders with sun icon in dark mode', () => {
    renderToggle('dark');
    const button = screen.getByRole('button', { name: /switch to light mode/i });
    expect(button).toBeInTheDocument();
  });

  it('toggles theme when clicked', () => {
    const store = renderToggle('light');
    const button = screen.getByRole('button', { name: /switch to dark mode/i });
    fireEvent.click(button);
    expect(store.getState().ui.theme).toBe('dark');
  });

  it('toggles back to light when clicked in dark mode', () => {
    const store = renderToggle('dark');
    const button = screen.getByRole('button', { name: /switch to light mode/i });
    fireEvent.click(button);
    expect(store.getState().ui.theme).toBe('light');
  });
});

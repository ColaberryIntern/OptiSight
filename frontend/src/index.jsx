import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import App from './App';
import { store } from './store';
import { lightTheme, darkTheme } from './styles/theme';
import GlobalStyles from './styles/GlobalStyles';
import { restoreSession } from './store/slices/authSlice';
import { getToken } from './utils/tokenStorage';

function Root() {
  const dispatch = useDispatch();
  const theme = useSelector((state) => state.ui.theme);
  const activeTheme = theme === 'dark' ? darkTheme : lightTheme;

  useEffect(() => {
    const token = getToken();
    if (token) {
      dispatch(restoreSession());
    }
  }, [dispatch]);

  return (
    <BrowserRouter>
      <ThemeProvider theme={activeTheme}>
        <GlobalStyles />
        <App />
      </ThemeProvider>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <Root />
    </Provider>
  </React.StrictMode>
);

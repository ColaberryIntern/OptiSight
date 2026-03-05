import { createSlice } from '@reduxjs/toolkit';

const THEME_KEY = 'ri_theme';

const getInitialTheme = () => {
  try {
    return localStorage.getItem(THEME_KEY) || 'light';
  } catch {
    return 'light';
  }
};

const initialState = {
  theme: getInitialTheme(),
  sidebarCollapsed: false,
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleTheme(state) {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem(THEME_KEY, state.theme);
      } catch {
        // localStorage unavailable — ignore silently
      }
    },
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    toggleLeftPanel(state) {
      state.leftPanelCollapsed = !state.leftPanelCollapsed;
    },
    toggleRightPanel(state) {
      state.rightPanelCollapsed = !state.rightPanelCollapsed;
    },
  },
});

export const { toggleTheme, toggleSidebar, toggleLeftPanel, toggleRightPanel } =
  uiSlice.actions;
export default uiSlice.reducer;

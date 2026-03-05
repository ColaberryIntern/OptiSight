import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  lastResponse: null,
  executionPath: '',
  sources: [],
  loading: false,
  error: null,
};

const orchestratorSlice = createSlice({
  name: 'orchestrator',
  initialState,
  reducers: {
    setResponse(state, action) {
      state.lastResponse = action.payload;
      state.executionPath = action.payload?.execution_path || '';
      state.sources = action.payload?.sources || [];
      state.error = null;
    },
    setLoading(state, action) {
      state.loading = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
      state.loading = false;
    },
    clearResponse(state) {
      state.lastResponse = null;
      state.executionPath = '';
      state.sources = [];
      state.loading = false;
      state.error = null;
    },
  },
});

export const {
  setResponse,
  setLoading,
  setError,
  clearResponse,
} = orchestratorSlice.actions;

export default orchestratorSlice.reducer;

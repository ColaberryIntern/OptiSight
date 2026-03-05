import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getAutoInsights } from '../../services/orchestratorService';

export const fetchAutoInsights = createAsyncThunk(
  'canvas/fetchAutoInsights',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getAutoInsights();
      return response.data.insights || [];
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || 'Failed to fetch auto-insights.'
      );
    }
  }
);

const initialState = {
  visualizations: [],
  activeChartType: null,
  chartData: null,
  loading: false,
  autoInsights: [],
  insightsLoading: false,
};

const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    setVisualizations(state, action) {
      state.visualizations = action.payload;
    },
    setActiveChartType(state, action) {
      state.activeChartType = action.payload;
    },
    setChartData(state, action) {
      state.chartData = action.payload;
    },
    clearCanvas(state) {
      state.visualizations = [];
      state.activeChartType = null;
      state.chartData = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchAutoInsights.pending, (state) => {
      state.insightsLoading = true;
    });
    builder.addCase(fetchAutoInsights.fulfilled, (state, action) => {
      state.insightsLoading = false;
      state.autoInsights = action.payload;
    });
    builder.addCase(fetchAutoInsights.rejected, (state) => {
      state.insightsLoading = false;
    });
  },
});

export const {
  setVisualizations,
  setActiveChartType,
  setChartData,
  clearCanvas,
} = canvasSlice.actions;

export default canvasSlice.reducer;

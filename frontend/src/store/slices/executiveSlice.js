import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getExecutiveSummary } from '../../services/orchestratorService';

export const fetchExecutiveSummary = createAsyncThunk(
  'executive/fetchSummary',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getExecutiveSummary();
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Failed to fetch executive summary.';
      return rejectWithValue(message);
    }
  }
);

const initialState = {
  summary: null,
  loading: false,
  error: null,
};

const executiveSlice = createSlice({
  name: 'executive',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchExecutiveSummary.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchExecutiveSummary.fulfilled, (state, action) => {
      state.loading = false;
      state.summary = action.payload;
    });
    builder.addCase(fetchExecutiveSummary.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });
  },
});

export default executiveSlice.reducer;

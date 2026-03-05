import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { queryOrchestrator, getSystemHealth } from '../../services/orchestratorService';
import { setVisualizations } from './canvasSlice';

export const sendQuery = createAsyncThunk(
  'aiAssistant/sendQuery',
  async ({ question, userId, context = {} }, { dispatch, rejectWithValue }) => {
    try {
      const response = await queryOrchestrator(question, userId, context);
      const data = response.data;

      // Dispatch visualizations array to canvas slice if present
      if (data.visualizations && data.visualizations.length > 0) {
        dispatch(setVisualizations(data.visualizations));
      }

      return data;
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Failed to process query.';
      return rejectWithValue(message);
    }
  }
);

export const fetchSystemHealth = createAsyncThunk(
  'aiAssistant/fetchSystemHealth',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getSystemHealth();
      return response.data;
    } catch (error) {
      return rejectWithValue('Health check failed');
    }
  }
);

const initialState = {
  messages: [],
  suggestedQuestions: [],
  isProcessing: false,
  executionPath: '',
  error: null,
  healthStatus: {},
  healthLoading: false,
};

const aiAssistantSlice = createSlice({
  name: 'aiAssistant',
  initialState,
  reducers: {
    addMessage(state, action) {
      state.messages.push(action.payload);
    },
    setSuggestedQuestions(state, action) {
      state.suggestedQuestions = action.payload;
    },
    setProcessing(state, action) {
      state.isProcessing = action.payload;
    },
    setExecutionPath(state, action) {
      state.executionPath = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
    },
    clearMessages(state) {
      state.messages = [];
      state.suggestedQuestions = [];
      state.isProcessing = false;
      state.executionPath = '';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(sendQuery.pending, (state) => {
      state.isProcessing = true;
      state.error = null;
    });
    builder.addCase(sendQuery.fulfilled, (state, action) => {
      state.isProcessing = false;
      const data = action.payload;

      // Add assistant response as a message
      state.messages.push({
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        role: 'ai',
        content: data.answer || data.response || '',
        timestamp: Date.now(),
        executionPath: data.execution_path || null,
        sources: data.sources || [],
        recommendations: data.recommendations || [],
      });

      // Update execution path if provided
      if (data.execution_path) {
        state.executionPath = data.execution_path;
      }

      // Update suggested questions if provided
      if (data.follow_up_questions) {
        state.suggestedQuestions = data.follow_up_questions;
      } else if (data.suggested_questions) {
        state.suggestedQuestions = data.suggested_questions;
      }
    });
    builder.addCase(sendQuery.rejected, (state, action) => {
      state.isProcessing = false;
      const raw = action.payload || '';
      // Provide specific error context based on error type
      if (action.meta?.rejectedWithValue === false && action.error?.message?.includes('timeout')) {
        state.error = 'Analysis is taking longer than expected. The orchestrator may be processing a complex query.';
      } else if (raw.includes?.('503') || raw.includes?.('unavailable')) {
        state.error = 'Some data services are temporarily unavailable. Try again.';
      } else if (raw.includes?.('401') || raw.includes?.('unauthorized')) {
        state.error = 'Session expired. Please log in again.';
      } else {
        state.error = raw || 'Unable to complete analysis. Check system health indicators.';
      }
    });
    // System health
    builder.addCase(fetchSystemHealth.pending, (state) => {
      state.healthLoading = true;
    });
    builder.addCase(fetchSystemHealth.fulfilled, (state, action) => {
      state.healthLoading = false;
      state.healthStatus = action.payload || {};
    });
    builder.addCase(fetchSystemHealth.rejected, (state) => {
      state.healthLoading = false;
    });
  },
});

export const {
  addMessage,
  setSuggestedQuestions,
  setProcessing,
  setExecutionPath,
  setError,
  clearMessages,
} = aiAssistantSlice.actions;

export default aiAssistantSlice.reducer;

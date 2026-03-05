import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import intelligenceMapReducer from './slices/intelligenceMapSlice';
import canvasReducer from './slices/canvasSlice';
import aiAssistantReducer from './slices/aiAssistantSlice';
import orchestratorReducer from './slices/orchestratorSlice';
import executiveReducer from './slices/executiveSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    intelligenceMap: intelligenceMapReducer,
    canvas: canvasReducer,
    aiAssistant: aiAssistantReducer,
    orchestrator: orchestratorReducer,
    executive: executiveReducer,
  },
});

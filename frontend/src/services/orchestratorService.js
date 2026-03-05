import api from './api';

export const queryOrchestrator = (question, userId, context = {}) =>
  api.post('/orchestrator/query', { question, user_id: userId, context });

export const getExecutiveSummary = () => api.get('/orchestrator/executive-summary');

export const getAutoInsights = () => api.get('/orchestrator/auto-insights');

export const getSystemHealth = () => api.get('/orchestrator/health');

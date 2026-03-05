import api from './api';

const AUTH_BASE = '/api/v1/users';

export const register = (email, password) =>
  api.post(`${AUTH_BASE}/register`, { email, password });

export const login = (email, password) =>
  api.post(`${AUTH_BASE}/login`, { email, password });

export const getProfile = (userId) =>
  api.get(`${AUTH_BASE}/${userId}`);

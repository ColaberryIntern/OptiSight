import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import {
  loginUser,
  registerUser,
  logout as logoutAction,
  clearError,
} from '../store/slices/authSlice';

export function useAuth() {
  const dispatch = useDispatch();
  const { user, isAuthenticated, isLoading, error } = useSelector(
    (state) => state.auth
  );

  const login = useCallback(
    (email, password) => dispatch(loginUser({ email, password })),
    [dispatch]
  );

  const register = useCallback(
    (email, password) => dispatch(registerUser({ email, password })),
    [dispatch]
  );

  const logout = useCallback(() => dispatch(logoutAction()), [dispatch]);

  const resetError = useCallback(() => dispatch(clearError()), [dispatch]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError: resetError,
  };
}

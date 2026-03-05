import authReducer, { logout, clearError } from '../slices/authSlice';

describe('authSlice', () => {
  const initialState = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  };

  it('should return the initial state', () => {
    const state = authReducer(undefined, { type: 'unknown' });
    expect(state).toEqual(initialState);
  });

  it('should handle logout correctly by clearing all state', () => {
    const loggedInState = {
      user: { id: '123', email: 'test@example.com' },
      token: 'some-jwt-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    };

    const state = authReducer(loggedInState, logout());

    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should handle clearError', () => {
    const stateWithError = {
      ...initialState,
      error: 'Something went wrong',
    };

    const state = authReducer(stateWithError, clearError());

    expect(state.error).toBeNull();
  });

  it('should not affect other state properties on clearError', () => {
    const authenticatedStateWithError = {
      user: { id: '123', email: 'test@example.com' },
      token: 'some-jwt-token',
      isAuthenticated: true,
      isLoading: false,
      error: 'Some error',
    };

    const state = authReducer(authenticatedStateWithError, clearError());

    expect(state.error).toBeNull();
    expect(state.user).toEqual({ id: '123', email: 'test@example.com' });
    expect(state.token).toBe('some-jwt-token');
    expect(state.isAuthenticated).toBe(true);
  });
});

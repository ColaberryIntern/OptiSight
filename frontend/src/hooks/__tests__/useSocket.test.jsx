import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useSocket } from '../useSocket';

// Mock socket.io-client and our socketService
const mockOn = vi.fn();
const mockOff = vi.fn();
const mockDisconnect = vi.fn();
const mockSocket = {
  connected: false,
  on: mockOn,
  off: mockOff,
  disconnect: mockDisconnect,
  id: 'test-socket-id',
};

vi.mock('../../services/socketService', () => ({
  connect: vi.fn(() => mockSocket),
  disconnect: vi.fn(),
}));

import * as socketService from '../../services/socketService';

function createMockStore(authState = {}) {
  return configureStore({
    reducer: {
      auth: (state = { user: null, token: null, isAuthenticated: false, ...authState }) => state,
    },
  });
}

function createWrapper(store) {
  return function Wrapper({ children }) {
    return <Provider store={store}>{children}</Provider>;
  };
}

describe('useSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
  });

  it('should not connect when user is not authenticated', () => {
    const store = createMockStore({ isAuthenticated: false, token: null, user: null });
    const { result } = renderHook(() => useSocket(), {
      wrapper: createWrapper(store),
    });

    expect(socketService.connect).not.toHaveBeenCalled();
    expect(result.current.isConnected).toBe(false);
  });

  it('should connect when user is authenticated', () => {
    const store = createMockStore({
      isAuthenticated: true,
      token: 'test-token',
      user: { id: 'user-123', email: 'test@test.com' },
    });

    renderHook(() => useSocket(), {
      wrapper: createWrapper(store),
    });

    expect(socketService.connect).toHaveBeenCalledWith('test-token', 'user-123');
  });

  it('should subscribe to connect and disconnect events', () => {
    const store = createMockStore({
      isAuthenticated: true,
      token: 'test-token',
      user: { id: 'user-123' },
    });

    renderHook(() => useSocket(), {
      wrapper: createWrapper(store),
    });

    // Should have registered event handlers
    expect(mockOn).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('disconnect', expect.any(Function));
  });

  it('should set isConnected to true when connect event fires', () => {
    const store = createMockStore({
      isAuthenticated: true,
      token: 'test-token',
      user: { id: 'user-123' },
    });

    const { result } = renderHook(() => useSocket(), {
      wrapper: createWrapper(store),
    });

    expect(result.current.isConnected).toBe(false);

    // Simulate connect event firing
    const connectHandler = mockOn.mock.calls.find((call) => call[0] === 'connect')[1];
    act(() => {
      connectHandler();
    });

    expect(result.current.isConnected).toBe(true);
  });

  it('should set isConnected to false when disconnect event fires', () => {
    const store = createMockStore({
      isAuthenticated: true,
      token: 'test-token',
      user: { id: 'user-123' },
    });

    const { result } = renderHook(() => useSocket(), {
      wrapper: createWrapper(store),
    });

    // Simulate connect then disconnect
    const connectHandler = mockOn.mock.calls.find((call) => call[0] === 'connect')[1];
    const disconnectHandler = mockOn.mock.calls.find((call) => call[0] === 'disconnect')[1];

    act(() => {
      connectHandler();
    });
    expect(result.current.isConnected).toBe(true);

    act(() => {
      disconnectHandler();
    });
    expect(result.current.isConnected).toBe(false);
  });

  it('should disconnect and clean up on unmount', () => {
    const store = createMockStore({
      isAuthenticated: true,
      token: 'test-token',
      user: { id: 'user-123' },
    });

    const { unmount } = renderHook(() => useSocket(), {
      wrapper: createWrapper(store),
    });

    unmount();

    // Should have unsubscribed from events
    expect(mockOff).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockOff).toHaveBeenCalledWith('disconnect', expect.any(Function));

    // Should have called disconnect
    expect(socketService.disconnect).toHaveBeenCalled();
  });

  it('should handle user with userId property instead of id', () => {
    const store = createMockStore({
      isAuthenticated: true,
      token: 'test-token',
      user: { userId: 'user-456' },
    });

    renderHook(() => useSocket(), {
      wrapper: createWrapper(store),
    });

    expect(socketService.connect).toHaveBeenCalledWith('test-token', 'user-456');
  });

  it('should detect already-connected socket on mount', () => {
    mockSocket.connected = true;

    const store = createMockStore({
      isAuthenticated: true,
      token: 'test-token',
      user: { id: 'user-123' },
    });

    const { result } = renderHook(() => useSocket(), {
      wrapper: createWrapper(store),
    });

    expect(result.current.isConnected).toBe(true);
  });
});

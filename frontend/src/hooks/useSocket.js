import { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { connect, disconnect } from '../services/socketService';

/**
 * Custom hook that manages Socket.IO connection lifecycle.
 * Connects when the user is authenticated and disconnects on unmount.
 *
 * @returns {{ isConnected: boolean }}
 */
export function useSocket() {
  const { token, user, isAuthenticated } = useSelector((state) => state.auth);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }

    const userId = user?.id || user?.userId || 'unknown';
    const socket = connect(token, userId);
    socketRef.current = socket;

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // If already connected at time of binding
    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [isAuthenticated, token, user]);

  return { isConnected };
}

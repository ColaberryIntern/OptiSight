import { useSelector } from 'react-redux';
import { Outlet } from 'react-router-dom';
import { useSocket } from '../../hooks/useSocket';
import { useAnomalyAlerts } from '../../hooks/useAnomalyAlerts';

/**
 * SocketProvider wraps protected routes and manages WebSocket lifecycle.
 * It connects on mount (when authenticated) and subscribes to anomaly alerts.
 */
function SocketProvider() {
  const { user } = useSelector((state) => state.auth);
  const userId = user?.id || user?.userId;

  useSocket();
  useAnomalyAlerts(userId);

  return <Outlet />;
}

export default SocketProvider;

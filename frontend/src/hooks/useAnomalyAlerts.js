import { useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { on, off } from '../services/socketService';
import { fetchUnreadCount } from '../store/slices/notificationsSlice';

/**
 * Request browser notification permission if not already granted.
 */
function requestNotificationPermission() {
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

/**
 * Show a browser notification for an anomaly.
 * @param {{ anomalies: Array, detectedAt: string }} data
 */
function showBrowserNotification(data) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return;
  }

  const count = data.anomalies?.length || 0;
  const highSeverity = data.anomalies?.filter((a) => a.severity === 'high') || [];
  const title = `${count} Revenue Anomal${count === 1 ? 'y' : 'ies'} Detected`;
  const body = highSeverity.length > 0
    ? `${highSeverity.length} high severity anomal${highSeverity.length === 1 ? 'y' : 'ies'} require attention.`
    : `${count} anomal${count === 1 ? 'y' : 'ies'} detected in revenue data.`;

  try {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: 'anomaly-alert',
    });
  } catch {
    // Browser may not support Notification constructor (e.g., mobile)
  }
}

/**
 * Custom hook that listens for anomaly:detected WebSocket events.
 * Shows browser notifications and updates the Redux notification count.
 *
 * @param {string} userId - Current user ID for refreshing unread count
 */
export function useAnomalyAlerts(userId) {
  const dispatch = useDispatch();

  const handleAnomalyDetected = useCallback(
    (data) => {
      // Show browser notification
      showBrowserNotification(data);

      // Refresh unread notification count from notification_service
      if (userId) {
        dispatch(fetchUnreadCount(userId));
      }
    },
    [dispatch, userId]
  );

  useEffect(() => {
    requestNotificationPermission();

    on('anomaly:detected', handleAnomalyDetected);

    return () => {
      off('anomaly:detected', handleAnomalyDetected);
    };
  }, [handleAnomalyDetected]);
}

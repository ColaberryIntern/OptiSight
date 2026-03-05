const http = require('http');
const app = require('./app');
const { logger } = require('@retail-insight/shared');
const socketManager = require('./socketManager');
const anomalyNotifier = require('./services/anomalyNotifier');
const reportScheduler = require('./services/reportScheduler');

const PORT = process.env.ANALYTICS_SERVICE_PORT || 3003;

const server = http.createServer(app);

// Initialize Socket.IO
socketManager.init(server);

// Start anomaly detection schedule (default: every 5 minutes)
const ANOMALY_CHECK_INTERVAL = parseInt(process.env.ANOMALY_CHECK_INTERVAL_MS, 10) || 5 * 60 * 1000;
anomalyNotifier.startSchedule(ANOMALY_CHECK_INTERVAL);

// Start weekly report scheduler
reportScheduler.start();

server.listen(PORT, () => {
  logger.info(`analytics_service running on port ${PORT}`);
  logger.info(`Anomaly check interval: ${ANOMALY_CHECK_INTERVAL}ms`);
});

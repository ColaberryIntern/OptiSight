const app = require('./app');
const { logger } = require('@retail-insight/shared');

const PORT = process.env.USER_SERVICE_PORT || 3001;

app.listen(PORT, () => {
  logger.info(`user_service running on port ${PORT}`);
});

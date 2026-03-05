const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { errorHandler, errorTracker, logger } = require('@retail-insight/shared');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification_service', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/v1/notifications', notificationRoutes);

// Error tracking & handler
app.use(errorTracker());
app.use(errorHandler);

module.exports = app;

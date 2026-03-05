const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { errorHandler, errorTracker, logger, auditMiddleware, generalLimiter, metricsMiddleware, metricsEndpoint } = require('@retail-insight/shared');
const dashboardRoutes = require('./routes/dashboardRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware('analytics_service'));
app.use(generalLimiter);
app.use(auditMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'analytics_service', timestamp: new Date().toISOString() });
});

// Metrics endpoint
app.get('/metrics', metricsEndpoint);

// Routes
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// Error tracking & handler
app.use(errorTracker());
app.use(errorHandler);

module.exports = app;

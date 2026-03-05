const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { errorHandler, errorTracker, logger, auditMiddleware, authLimiter, metricsMiddleware, metricsEndpoint } = require('@retail-insight/shared');
const authRoutes = require('./routes/authRoutes');
const onboardingRoutes = require('./routes/onboardingRoutes');
const preferencesRoutes = require('./routes/preferencesRoutes');
const complianceRoutes = require('./routes/complianceRoutes');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware('user_service'));
app.use(auditMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'user_service', timestamp: new Date().toISOString() });
});

// Metrics endpoint
app.get('/metrics', metricsEndpoint);

// Routes
app.use('/api/v1/users', authRoutes);
app.use('/api/v1/users', onboardingRoutes);
app.use('/api/v1/users', preferencesRoutes);
app.use('/api/v1/users', complianceRoutes);

// Error tracking & handler
app.use(errorTracker());
app.use(errorHandler);

module.exports = app;

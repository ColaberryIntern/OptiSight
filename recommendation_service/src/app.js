const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { errorHandler, errorTracker, logger } = require('@retail-insight/shared');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'recommendation_service', timestamp: new Date().toISOString() });
});

// Routes
const recommendationRoutes = require('./routes/recommendationRoutes');
app.use('/api/v1/recommendations', recommendationRoutes);

// Error tracking & handler
app.use(errorTracker());
app.use(errorHandler);

module.exports = app;

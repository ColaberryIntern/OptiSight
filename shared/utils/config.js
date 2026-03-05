require('dotenv').config();

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10,
  ports: {
    userService: parseInt(process.env.USER_SERVICE_PORT, 10) || 3001,
    dataIngestion: parseInt(process.env.DATA_INGESTION_PORT, 10) || 3002,
    analyticsService: parseInt(process.env.ANALYTICS_SERVICE_PORT, 10) || 3003,
    recommendationService:
      parseInt(process.env.RECOMMENDATION_SERVICE_PORT, 10) || 3004,
    notificationService:
      parseInt(process.env.NOTIFICATION_SERVICE_PORT, 10) || 3005,
    aiEngine: parseInt(process.env.AI_ENGINE_PORT, 10) || 5000,
    frontend: parseInt(process.env.FRONTEND_PORT, 10) || 3000,
  },
  serviceUrls: {
    userService:
      process.env.USER_SERVICE_URL || 'http://user_service:3001',
    dataIngestion:
      process.env.DATA_INGESTION_URL || 'http://data_ingestion_service:3002',
    analyticsService:
      process.env.ANALYTICS_SERVICE_URL || 'http://analytics_service:3003',
    recommendationService:
      process.env.RECOMMENDATION_SERVICE_URL ||
      'http://recommendation_service:3004',
    notificationService:
      process.env.NOTIFICATION_SERVICE_URL ||
      'http://notification_service:3005',
    aiEngine: process.env.AI_ENGINE_URL || 'http://ai_engine:5000',
  },
};

module.exports = config;

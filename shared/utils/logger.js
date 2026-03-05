const winston = require('winston');

const transports = [
  new winston.transports.Console({
    format:
      process.env.NODE_ENV === 'development'
        ? winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        : winston.format.json(),
  }),
];

// Add Elasticsearch transport when ELASTICSEARCH_URL is configured
if (process.env.ELASTICSEARCH_URL) {
  try {
    const { ElasticsearchTransport } = require('winston-elasticsearch');
    const esTransport = new ElasticsearchTransport({
      level: 'info',
      clientOpts: {
        node: process.env.ELASTICSEARCH_URL,
        maxRetries: 5,
        requestTimeout: 10000,
      },
      indexPrefix: 'optisight-logs',
      indexSuffixPattern: 'YYYY.MM.DD',
      transformer: (logData) => {
        return {
          '@timestamp': logData.timestamp || new Date().toISOString(),
          severity: logData.level,
          message: logData.message,
          service: logData.meta?.service || process.env.SERVICE_NAME || 'unknown',
          fields: logData.meta,
        };
      },
    });

    // Don't crash on ES connection errors
    esTransport.on('error', (error) => {
      console.error('Elasticsearch transport error:', error.message);
    });

    transports.push(esTransport);
  } catch (err) {
    // winston-elasticsearch not installed or other error — continue without it
    console.warn('Elasticsearch logging not available:', err.message);
  }
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: process.env.SERVICE_NAME || 'unknown' },
  transports,
});

module.exports = logger;

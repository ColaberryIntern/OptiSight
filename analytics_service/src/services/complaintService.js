const axios = require('axios');
const db = require('../config/db');
const { logger } = require('@retail-insight/shared');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:5000';

/**
 * Fetch complaints from the database, send them to the AI engine
 * for TF-IDF + K-Means clustering, and return cluster results
 * along with a regional heatmap.
 *
 * @param {string|null} storeId - Optional store filter
 * @returns {Promise<{clusters: Array, heatmap: Object}>}
 */
async function getComplaintClusters(storeId = null) {
  let query = db('complaints').select('*');
  if (storeId) {
    query = query.where('store_id', storeId);
  }

  const complaints = await query;

  if (!complaints.length) {
    return { clusters: [], heatmap: { regions: [], categories: [], data: [] } };
  }

  logger.info({
    message: 'Sending complaints to AI engine for clustering',
    complaintCount: complaints.length,
    storeId: storeId || 'all',
  });

  const response = await axios.post(`${AI_ENGINE_URL}/cluster-complaints`, {
    complaints: complaints.map(c => ({
      description: c.description,
      region: c.region,
      category: c.category,
    })),
  });

  return response.data;
}

module.exports = { getComplaintClusters };

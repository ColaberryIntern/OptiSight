const axios = require('axios');
const { logger } = require('@retail-insight/shared');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:5000';
const DATA_INGESTION_URL = process.env.DATA_INGESTION_URL || 'http://localhost:3002';

/**
 * Fetch a user's transaction history from the data ingestion service,
 * transform it into interaction data, and get AI-powered recommendations
 * from the Python ai_engine.
 *
 * @param {string} userId - The target user ID.
 * @param {number} [n=5] - Number of recommendations to return.
 * @returns {Promise<Array>} Array of recommendation objects.
 */
async function getRecommendations(userId, n = 5) {
  try {
    // Step 1: Fetch user's transaction history from data_ingestion_service
    logger.info({
      message: 'Fetching transaction history',
      userId,
      url: `${DATA_INGESTION_URL}/api/v1/data/transactions`,
    });

    let transactions = [];
    try {
      const txResponse = await axios.get(
        `${DATA_INGESTION_URL}/api/v1/data/transactions`,
        {
          params: { userId },
          timeout: 10000,
        }
      );

      // The data_ingestion_service returns { data: [...], pagination: {...} }
      transactions = txResponse.data.data || txResponse.data || [];
    } catch (txErr) {
      logger.warn({
        message: 'Failed to fetch transactions from data_ingestion_service',
        userId,
        error: txErr.message,
      });
      // If data service is unavailable, proceed with empty transactions
      // The AI engine will return empty recommendations
    }

    // Step 2: Transform transactions into interaction format
    const interactions = transformTransactionsToInteractions(transactions, userId);

    logger.info({
      message: 'Transformed interactions',
      userId,
      interactionCount: interactions.length,
    });

    // Step 3: POST to ai_engine /predict
    let recommendations = [];
    try {
      const predictResponse = await axios.post(
        `${AI_ENGINE_URL}/predict`,
        {
          user_id: userId,
          interactions,
          n,
        },
        {
          timeout: 15000,
        }
      );

      recommendations = predictResponse.data.recommendations || [];
    } catch (aiErr) {
      logger.error({
        message: 'AI engine request failed',
        userId,
        error: aiErr.message,
      });
      // If AI engine is down, return empty recommendations
      return [];
    }

    logger.info({
      message: 'Recommendations generated',
      userId,
      count: recommendations.length,
    });

    return recommendations;
  } catch (err) {
    logger.error({
      message: 'Unexpected error in getRecommendations',
      userId,
      error: err.message,
      stack: err.stack,
    });
    return [];
  }
}

/**
 * Transform raw transaction data into the interaction format expected
 * by the ai_engine /predict endpoint.
 *
 * Each transaction has a JSONB `items` field containing an array of
 * { product_id, quantity, unit_price } objects. We extract each item
 * and create an interaction record with the quantity as the score.
 *
 * We also include interactions from all users in the transaction data
 * (not just the target user) so the collaborative filter can find
 * similar users.
 *
 * @param {Array} transactions - Raw transaction records.
 * @param {string} targetUserId - The user we're generating recommendations for.
 * @returns {Array} Interaction objects: { user_id, product_id, interaction_score }
 */
function transformTransactionsToInteractions(transactions, targetUserId) {
  const interactions = [];

  if (!Array.isArray(transactions)) {
    return interactions;
  }

  for (const tx of transactions) {
    const txUserId = tx.user_id || tx.userId || targetUserId;

    // Parse items - may be a JSON string or already parsed array
    let items = tx.items;
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch {
        continue;
      }
    }

    if (!Array.isArray(items)) {
      continue;
    }

    for (const item of items) {
      const productId = item.product_id || item.productId;
      const quantity = item.quantity || 1;

      if (!productId) {
        continue;
      }

      interactions.push({
        user_id: String(txUserId),
        product_id: String(productId),
        interaction_score: Number(quantity),
      });
    }
  }

  return interactions;
}

module.exports = {
  getRecommendations,
  transformTransactionsToInteractions,
};

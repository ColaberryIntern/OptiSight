import api from './api';

/**
 * Fetches the enriched store network from the orchestrator.
 * Returns flat list of stores with risk, revenue, complaints, anomaly flags.
 */
export const getStoreNetwork = () => api.get('/orchestrator/store-network');

/**
 * Fetches pairwise similarity edges between stores (vector intelligence).
 * Returns { edges: [{ source, target, weight }] }.
 */
export const getStoreSimilarity = (threshold = 0.5) =>
  api.get('/orchestrator/store-similarity', { params: { threshold } });

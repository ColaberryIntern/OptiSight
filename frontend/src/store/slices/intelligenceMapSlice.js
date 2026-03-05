import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getStoreNetwork, getStoreSimilarity } from '../../services/intelligenceService';

/* ------------------------------------------------------------------ */
/*  Store node builder                                                  */
/* ------------------------------------------------------------------ */

/**
 * Transforms flat /orchestrator/store-network response into D3-ready nodes.
 * Each node = one physical store. No hierarchy, no categories.
 */
function buildStoreNodes(stores) {
  if (!stores || stores.length === 0) {
    return [];
  }

  return stores.map((s) => ({
    id: s.store_id,
    label: s.store_name || s.store_id.substring(0, 8),
    storeId: s.store_id,
    city: s.city || '',
    region: s.region || '',
    revenue: s.revenue_30d || 0,
    riskScore: s.risk_score ?? 50,
    riskLevel: s.risk_level || 'medium',
    health: Math.round(100 - (s.risk_score ?? 50)),
    complaintCount: s.complaint_count || 0,
    anomalyDetected: !!s.anomaly_detected,
    factors: s.contributing_factors || {},
    lat: s.lat,
    lng: s.lng,
  }));
}

/* ------------------------------------------------------------------ */
/*  Async thunks                                                       */
/* ------------------------------------------------------------------ */

export const fetchMapData = createAsyncThunk(
  'intelligenceMap/fetchMapData',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getStoreNetwork();
      const stores = response.data?.stores || [];
      return buildStoreNodes(stores);
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Failed to fetch store network data.';
      return rejectWithValue(message);
    }
  }
);

export const fetchStoreSimilarity = createAsyncThunk(
  'intelligenceMap/fetchStoreSimilarity',
  async (threshold = 0.5, { rejectWithValue }) => {
    try {
      const response = await getStoreSimilarity(threshold);
      return response.data?.edges || [];
    } catch (error) {
      return rejectWithValue('Failed to fetch store similarity data.');
    }
  }
);

/* ------------------------------------------------------------------ */
/*  Slice                                                              */
/* ------------------------------------------------------------------ */

const initialState = {
  nodes: [],
  selectedNode: null,
  similarityEdges: [],
  showSimilarity: false,
  regionFilter: null,
  riskFilter: null,
  loading: false,
  similarityLoading: false,
  // Kept for backward compatibility with tests
  expandedNodes: [],
  healthScores: {},
};

const intelligenceMapSlice = createSlice({
  name: 'intelligenceMap',
  initialState,
  reducers: {
    setNodes(state, action) {
      state.nodes = action.payload;
    },
    selectNode(state, action) {
      state.selectedNode = action.payload;
    },
    toggleNodeExpansion(state, action) {
      const nodeId = action.payload;
      const index = state.expandedNodes.indexOf(nodeId);
      if (index === -1) {
        state.expandedNodes.push(nodeId);
      } else {
        state.expandedNodes.splice(index, 1);
      }
    },
    setHealthScores(state, action) {
      state.healthScores = action.payload;
    },
    setLoading(state, action) {
      state.loading = action.payload;
    },
    toggleSimilarity(state) {
      state.showSimilarity = !state.showSimilarity;
    },
    setRegionFilter(state, action) {
      state.regionFilter = action.payload;
    },
    setRiskFilter(state, action) {
      state.riskFilter = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchMapData.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchMapData.fulfilled, (state, action) => {
      state.loading = false;
      state.nodes = action.payload || [];
      // Build healthScores map for backward compat
      const scores = {};
      state.nodes.forEach((n) => { scores[n.id] = n.health; });
      state.healthScores = scores;
    });
    builder.addCase(fetchMapData.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(fetchStoreSimilarity.pending, (state) => {
      state.similarityLoading = true;
    });
    builder.addCase(fetchStoreSimilarity.fulfilled, (state, action) => {
      state.similarityLoading = false;
      state.similarityEdges = action.payload || [];
    });
    builder.addCase(fetchStoreSimilarity.rejected, (state) => {
      state.similarityLoading = false;
    });
  },
});

export const {
  setNodes,
  selectNode,
  toggleNodeExpansion,
  setHealthScores,
  setLoading,
  toggleSimilarity,
  setRegionFilter,
  setRiskFilter,
} = intelligenceMapSlice.actions;

export default intelligenceMapSlice.reducer;

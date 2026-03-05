import { configureStore } from '@reduxjs/toolkit';
import authReducer, { logout, clearError } from '../slices/authSlice';
import uiReducer, { toggleTheme, toggleSidebar, toggleLeftPanel, toggleRightPanel } from '../slices/uiSlice';
import intelligenceMapReducer, { setNodes, selectNode, toggleNodeExpansion, setHealthScores } from '../slices/intelligenceMapSlice';
import canvasReducer, { setVisualizations, setActiveChartType, setChartData, clearCanvas } from '../slices/canvasSlice';
import aiAssistantReducer, { addMessage, setSuggestedQuestions, setProcessing, setExecutionPath, setError, clearMessages } from '../slices/aiAssistantSlice';
import orchestratorReducer, { setResponse, setLoading, setError as setOrchestratorError, clearResponse } from '../slices/orchestratorSlice';

/**
 * Create a full store matching production configuration.
 */
function createFullStore(preloadedState) {
  return configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer,
      intelligenceMap: intelligenceMapReducer,
      canvas: canvasReducer,
      aiAssistant: aiAssistantReducer,
      orchestrator: orchestratorReducer,
    },
    preloadedState,
  });
}

// ===================================================================
// intelligenceMapSlice reducer tests
// ===================================================================

describe('intelligenceMapSlice', () => {
  it('setNodes updates nodes array', () => {
    const store = createFullStore();
    const nodes = [{ id: 'n1', label: 'Store A' }, { id: 'n2', label: 'Store B' }];
    store.dispatch(setNodes(nodes));
    expect(store.getState().intelligenceMap.nodes).toEqual(nodes);
  });

  it('selectNode sets the selectedNode', () => {
    const store = createFullStore();
    store.dispatch(selectNode('n1'));
    expect(store.getState().intelligenceMap.selectedNode).toBe('n1');
  });

  it('toggleNodeExpansion adds and removes node ids', () => {
    const store = createFullStore();
    store.dispatch(toggleNodeExpansion('n1'));
    expect(store.getState().intelligenceMap.expandedNodes).toEqual(['n1']);

    store.dispatch(toggleNodeExpansion('n2'));
    expect(store.getState().intelligenceMap.expandedNodes).toEqual(['n1', 'n2']);

    store.dispatch(toggleNodeExpansion('n1'));
    expect(store.getState().intelligenceMap.expandedNodes).toEqual(['n2']);
  });

  it('setHealthScores updates healthScores', () => {
    const store = createFullStore();
    const scores = { n1: 0.95, n2: 0.72 };
    store.dispatch(setHealthScores(scores));
    expect(store.getState().intelligenceMap.healthScores).toEqual(scores);
  });
});

// ===================================================================
// canvasSlice reducer tests
// ===================================================================

describe('canvasSlice', () => {
  it('setVisualizations updates visualizations array', () => {
    const store = createFullStore();
    const vizs = [{ id: 'v1', type: 'bar' }];
    store.dispatch(setVisualizations(vizs));
    expect(store.getState().canvas.visualizations).toEqual(vizs);
  });

  it('setActiveChartType updates activeChartType', () => {
    const store = createFullStore();
    store.dispatch(setActiveChartType('line'));
    expect(store.getState().canvas.activeChartType).toBe('line');
  });

  it('setChartData updates chartData', () => {
    const store = createFullStore();
    const data = { labels: ['Jan', 'Feb'], values: [100, 200] };
    store.dispatch(setChartData(data));
    expect(store.getState().canvas.chartData).toEqual(data);
  });

  it('clearCanvas resets all canvas state', () => {
    const store = createFullStore();
    store.dispatch(setVisualizations([{ id: 'v1' }]));
    store.dispatch(setActiveChartType('bar'));
    store.dispatch(setChartData({ x: 1 }));
    store.dispatch(clearCanvas());

    const state = store.getState().canvas;
    expect(state.visualizations).toEqual([]);
    expect(state.activeChartType).toBeNull();
    expect(state.chartData).toBeNull();
    expect(state.loading).toBe(false);
  });
});

// ===================================================================
// aiAssistantSlice reducer tests
// ===================================================================

describe('aiAssistantSlice', () => {
  it('addMessage appends to messages array', () => {
    const store = createFullStore();
    const msg = { role: 'user', content: 'Hello', timestamp: '2026-03-04T00:00:00Z' };
    store.dispatch(addMessage(msg));
    expect(store.getState().aiAssistant.messages).toEqual([msg]);
  });

  it('setSuggestedQuestions updates suggestions', () => {
    const store = createFullStore();
    const questions = ['What is revenue?', 'Show top products'];
    store.dispatch(setSuggestedQuestions(questions));
    expect(store.getState().aiAssistant.suggestedQuestions).toEqual(questions);
  });

  it('setProcessing updates isProcessing flag', () => {
    const store = createFullStore();
    store.dispatch(setProcessing(true));
    expect(store.getState().aiAssistant.isProcessing).toBe(true);
    store.dispatch(setProcessing(false));
    expect(store.getState().aiAssistant.isProcessing).toBe(false);
  });

  it('setExecutionPath updates executionPath', () => {
    const store = createFullStore();
    store.dispatch(setExecutionPath('analytics > revenue'));
    expect(store.getState().aiAssistant.executionPath).toBe('analytics > revenue');
  });

  it('clearMessages resets all assistant state', () => {
    const store = createFullStore();
    store.dispatch(addMessage({ role: 'user', content: 'Test' }));
    store.dispatch(setProcessing(true));
    store.dispatch(setExecutionPath('test'));
    store.dispatch(setError('some error'));
    store.dispatch(clearMessages());

    const state = store.getState().aiAssistant;
    expect(state.messages).toEqual([]);
    expect(state.suggestedQuestions).toEqual([]);
    expect(state.isProcessing).toBe(false);
    expect(state.executionPath).toBe('');
    expect(state.error).toBeNull();
  });
});

// ===================================================================
// orchestratorSlice reducer tests
// ===================================================================

describe('orchestratorSlice', () => {
  it('setResponse updates lastResponse, executionPath, and sources', () => {
    const store = createFullStore();
    const response = {
      answer: 'Revenue is up 15%',
      execution_path: 'analytics > revenue',
      sources: ['sales_data'],
    };
    store.dispatch(setResponse(response));

    const state = store.getState().orchestrator;
    expect(state.lastResponse).toEqual(response);
    expect(state.executionPath).toBe('analytics > revenue');
    expect(state.sources).toEqual(['sales_data']);
    expect(state.error).toBeNull();
  });

  it('setLoading updates loading flag', () => {
    const store = createFullStore();
    store.dispatch(setLoading(true));
    expect(store.getState().orchestrator.loading).toBe(true);
  });

  it('setError updates error and clears loading', () => {
    const store = createFullStore();
    store.dispatch(setLoading(true));
    store.dispatch(setOrchestratorError('Network error'));

    const state = store.getState().orchestrator;
    expect(state.error).toBe('Network error');
    expect(state.loading).toBe(false);
  });

  it('clearResponse resets all orchestrator state', () => {
    const store = createFullStore();
    store.dispatch(setResponse({ answer: 'test', execution_path: 'x', sources: ['s1'] }));
    store.dispatch(clearResponse());

    const state = store.getState().orchestrator;
    expect(state.lastResponse).toBeNull();
    expect(state.executionPath).toBe('');
    expect(state.sources).toEqual([]);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });
});

// ===================================================================
// uiSlice — panel toggle tests
// ===================================================================

describe('uiSlice — panel toggles', () => {
  it('toggleTheme changes theme from light to dark', () => {
    const store = createFullStore({
      ui: { theme: 'light', sidebarCollapsed: false, leftPanelCollapsed: false, rightPanelCollapsed: false },
    });
    store.dispatch(toggleTheme());
    expect(store.getState().ui.theme).toBe('dark');
  });

  it('toggleTheme toggles back from dark to light', () => {
    const store = createFullStore({
      ui: { theme: 'dark', sidebarCollapsed: false, leftPanelCollapsed: false, rightPanelCollapsed: false },
    });
    store.dispatch(toggleTheme());
    expect(store.getState().ui.theme).toBe('light');
  });

  it('toggleSidebar changes sidebarCollapsed from false to true', () => {
    const store = createFullStore({
      ui: { theme: 'light', sidebarCollapsed: false, leftPanelCollapsed: false, rightPanelCollapsed: false },
    });
    store.dispatch(toggleSidebar());
    expect(store.getState().ui.sidebarCollapsed).toBe(true);
  });

  it('toggleLeftPanel toggles leftPanelCollapsed', () => {
    const store = createFullStore({
      ui: { theme: 'light', sidebarCollapsed: false, leftPanelCollapsed: false, rightPanelCollapsed: false },
    });
    expect(store.getState().ui.leftPanelCollapsed).toBe(false);
    store.dispatch(toggleLeftPanel());
    expect(store.getState().ui.leftPanelCollapsed).toBe(true);
    store.dispatch(toggleLeftPanel());
    expect(store.getState().ui.leftPanelCollapsed).toBe(false);
  });

  it('toggleRightPanel toggles rightPanelCollapsed', () => {
    const store = createFullStore({
      ui: { theme: 'light', sidebarCollapsed: false, leftPanelCollapsed: false, rightPanelCollapsed: false },
    });
    expect(store.getState().ui.rightPanelCollapsed).toBe(false);
    store.dispatch(toggleRightPanel());
    expect(store.getState().ui.rightPanelCollapsed).toBe(true);
    store.dispatch(toggleRightPanel());
    expect(store.getState().ui.rightPanelCollapsed).toBe(false);
  });
});

// ===================================================================
// Full store configuration test
// ===================================================================

describe('Full store configuration', () => {
  it('configures all six reducers correctly with proper initial states', () => {
    const store = createFullStore();
    const state = store.getState();

    // auth slice
    expect(state.auth).toBeDefined();
    expect(state.auth.user).toBeNull();
    expect(state.auth.token).toBeNull();
    expect(state.auth.isAuthenticated).toBe(false);
    expect(state.auth.isLoading).toBe(false);
    expect(state.auth.error).toBeNull();

    // ui slice
    expect(state.ui).toBeDefined();
    expect(state.ui.sidebarCollapsed).toBe(false);
    expect(state.ui.leftPanelCollapsed).toBe(false);
    expect(state.ui.rightPanelCollapsed).toBe(false);

    // intelligenceMap slice
    expect(state.intelligenceMap).toBeDefined();
    expect(state.intelligenceMap.nodes).toEqual([]);
    expect(state.intelligenceMap.selectedNode).toBeNull();
    expect(state.intelligenceMap.expandedNodes).toEqual([]);
    expect(state.intelligenceMap.healthScores).toEqual({});
    expect(state.intelligenceMap.loading).toBe(false);

    // canvas slice
    expect(state.canvas).toBeDefined();
    expect(state.canvas.visualizations).toEqual([]);
    expect(state.canvas.activeChartType).toBeNull();
    expect(state.canvas.chartData).toBeNull();
    expect(state.canvas.loading).toBe(false);

    // aiAssistant slice
    expect(state.aiAssistant).toBeDefined();
    expect(state.aiAssistant.messages).toEqual([]);
    expect(state.aiAssistant.suggestedQuestions).toEqual([]);
    expect(state.aiAssistant.isProcessing).toBe(false);
    expect(state.aiAssistant.executionPath).toBe('');
    expect(state.aiAssistant.error).toBeNull();

    // orchestrator slice
    expect(state.orchestrator).toBeDefined();
    expect(state.orchestrator.lastResponse).toBeNull();
    expect(state.orchestrator.executionPath).toBe('');
    expect(state.orchestrator.sources).toEqual([]);
    expect(state.orchestrator.loading).toBe(false);
    expect(state.orchestrator.error).toBeNull();
  });

  it('allows dispatching actions across slices without cross-contamination', () => {
    const store = createFullStore({
      ui: { theme: 'light', sidebarCollapsed: false, leftPanelCollapsed: false, rightPanelCollapsed: false },
    });

    // Dispatch actions on different slices
    store.dispatch(setNodes([{ id: 'n1' }]));
    store.dispatch(setActiveChartType('bar'));
    store.dispatch(toggleTheme());
    store.dispatch(toggleLeftPanel());
    store.dispatch(addMessage({ role: 'user', content: 'Test' }));

    const state = store.getState();
    expect(state.intelligenceMap.nodes).toEqual([{ id: 'n1' }]);
    expect(state.canvas.activeChartType).toBe('bar');
    expect(state.ui.theme).toBe('dark');
    expect(state.ui.leftPanelCollapsed).toBe(true);
    expect(state.aiAssistant.messages).toHaveLength(1);

    // Other slices remain unaffected
    expect(state.auth.isAuthenticated).toBe(false);
    expect(state.orchestrator.lastResponse).toBeNull();
  });
});

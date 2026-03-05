import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import styled from 'styled-components';
import DynamicCanvas from '../components/Canvas/DynamicCanvas';
import ExecutiveInsightHeader from '../components/Canvas/ExecutiveInsightHeader';
import AutoInsightsGrid from '../components/Canvas/AutoInsightsGrid';
import { fetchExecutiveSummary } from '../store/slices/executiveSlice';
import { setVisualizations } from '../store/slices/canvasSlice';
import { sendQuery, fetchSystemHealth } from '../store/slices/aiAssistantSlice';

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 400px;
  overflow-y: auto;
`;

/**
 * Builds a bar chart visualization from a store node's contributing risk factors.
 */
function buildRiskFactorsViz(node) {
  const factors = node.factors || {};
  const labels = [];
  const values = [];
  for (const [key, val] of Object.entries(factors)) {
    labels.push(key.replace(/_/g, ' '));
    values.push(val?.score ?? val ?? 0);
  }
  if (labels.length === 0) return null;

  return {
    type: 'bar',
    title: `${node.label} — Risk Factors`,
    data: { labels, datasets: [{ label: 'Risk Score', data: values }] },
    has_data: true,
  };
}

function IntelligenceOSPage() {
  const dispatch = useDispatch();
  const visualizations = useSelector((state) => state.canvas.visualizations);
  const messageCount = useSelector((state) => state.aiAssistant.messages.length);
  const selectedNode = useSelector((state) => state.intelligenceMap.selectedNode);
  const userId = useSelector((state) => state.auth.user?.id || 'anonymous');
  const prevSelectedRef = useRef(null);

  // Fetch executive summary on mount and after each query
  useEffect(() => {
    dispatch(fetchExecutiveSummary());
  }, [dispatch, messageCount]);

  // System health polling — check on mount, then every 30 seconds
  useEffect(() => {
    dispatch(fetchSystemHealth());
    const interval = setInterval(() => {
      dispatch(fetchSystemHealth());
    }, 30000);
    return () => clearInterval(interval);
  }, [dispatch]);

  // React to store node selection from left panel
  useEffect(() => {
    if (!selectedNode || typeof selectedNode !== 'object') return;
    if (prevSelectedRef.current === selectedNode.id) return;
    prevSelectedRef.current = selectedNode.id;

    // 1. Build and dispatch risk factors visualization to canvas
    const riskViz = buildRiskFactorsViz(selectedNode);
    if (riskViz) {
      dispatch(setVisualizations([riskViz]));
    }

    // 2. Dispatch AI query for this store
    const storeName = selectedNode.label || selectedNode.storeId;
    dispatch(
      sendQuery({
        question: `Summarize ${storeName} performance and risk factors`,
        userId,
      })
    );
  }, [selectedNode, dispatch, userId]);

  const hasVisualizations = visualizations && visualizations.length > 0;

  return (
    <PageContainer>
      <ExecutiveInsightHeader />
      {hasVisualizations ? (
        <DynamicCanvas visualizations={visualizations} />
      ) : (
        <AutoInsightsGrid />
      )}
    </PageContainer>
  );
}

export default IntelligenceOSPage;

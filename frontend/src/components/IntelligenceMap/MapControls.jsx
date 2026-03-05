import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import styled from 'styled-components';
import {
  toggleSimilarity,
  setRegionFilter,
  setRiskFilter,
  fetchStoreSimilarity,
} from '../../store/slices/intelligenceMapSlice';

const ControlBar = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  flex-wrap: wrap;
  align-items: center;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Select = styled.select`
  padding: 3px 6px;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const ToggleButton = styled.button`
  padding: 3px 8px;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 500;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  border: 1px solid ${({ $active, theme }) => $active ? theme.colors.primary : theme.colors.border};
  background: ${({ $active, theme }) => $active ? theme.colors.primary : theme.colors.surface};
  color: ${({ $active, theme }) => $active ? '#FFFFFF' : theme.colors.text};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.default};

  &:hover {
    opacity: 0.85;
  }
`;

const REGIONS = ['All', 'South', 'West', 'Northeast', 'Midwest', 'Southeast', 'Northwest'];
const RISK_LEVELS = ['All', 'high', 'medium', 'low'];

const MapControls = () => {
  const dispatch = useDispatch();
  const regionFilter = useSelector((state) => state.intelligenceMap.regionFilter);
  const riskFilter = useSelector((state) => state.intelligenceMap.riskFilter);
  const showSimilarity = useSelector((state) => state.intelligenceMap.showSimilarity);
  const similarityEdges = useSelector((state) => state.intelligenceMap.similarityEdges);
  const similarityLoading = useSelector((state) => state.intelligenceMap.similarityLoading);

  const handleRegionChange = (e) => {
    const val = e.target.value === 'All' ? null : e.target.value;
    dispatch(setRegionFilter(val));
  };

  const handleRiskChange = (e) => {
    const val = e.target.value === 'All' ? null : e.target.value;
    dispatch(setRiskFilter(val));
  };

  const handleSimilarityToggle = () => {
    if (!showSimilarity && similarityEdges.length === 0) {
      dispatch(fetchStoreSimilarity());
    }
    dispatch(toggleSimilarity());
  };

  return (
    <ControlBar data-testid="map-controls">
      <Select
        value={regionFilter || 'All'}
        onChange={handleRegionChange}
        data-testid="region-filter"
      >
        {REGIONS.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </Select>

      <Select
        value={riskFilter || 'All'}
        onChange={handleRiskChange}
        data-testid="risk-filter"
      >
        {RISK_LEVELS.map((r) => (
          <option key={r} value={r}>
            {r === 'All' ? 'All Risk' : `${r.charAt(0).toUpperCase() + r.slice(1)} Risk`}
          </option>
        ))}
      </Select>

      <ToggleButton
        $active={showSimilarity}
        onClick={handleSimilarityToggle}
        disabled={similarityLoading}
        data-testid="similarity-toggle"
      >
        {similarityLoading ? 'Loading...' : showSimilarity ? 'Hide Similarity' : 'Show Similarity'}
      </ToggleButton>
    </ControlBar>
  );
};

export default MapControls;

/**
 * Client-side chart type auto-selector.
 * Falls back on keyword matching when the backend doesn't set viz.type.
 */

const KEYWORD_RULES = [
  { keywords: ['forecast', 'predict', 'project', 'future'], type: 'forecast' },
  { keywords: ['trend', 'over time', 'time series', 'monthly', 'weekly', 'daily'], type: 'line' },
  { keywords: ['map', 'region', 'location', 'geographic', 'store map', 'density'], type: 'geo' },
  { keywords: ['risk', 'health', 'score', 'alert'], type: 'risk' },
  { keywords: ['compare', 'rank', 'top', 'bottom', 'best', 'worst'], type: 'bar' },
  { keywords: ['cluster', 'similar', 'group', 'segment'], type: 'network' },
  { keywords: ['breakdown', 'decompose', 'cause', 'root cause', 'why'], type: 'tree' },
  { keywords: ['waterfall', 'contribution', 'factor'], type: 'waterfall' },
  { keywords: ['radar', 'profile', 'scorecard', 'multi-metric'], type: 'radar' },
  { keywords: ['heatmap', 'matrix', 'intensity'], type: 'heatmap' },
];

export function autoSelectChartType(viz, queryText = '') {
  if (viz?.type) return viz.type;

  const searchText = `${queryText} ${viz?.title || ''} ${viz?.description || ''}`.toLowerCase();

  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((kw) => searchText.includes(kw))) {
      return rule.type;
    }
  }

  return 'bar'; // Safe default
}

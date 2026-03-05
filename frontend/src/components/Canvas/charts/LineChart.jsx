import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useTheme } from 'styled-components';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const LineChart = ({ data, title }) => {
  const theme = useTheme();

  const chartData = useMemo(() => {
    if (!data || !data.labels || !data.datasets) {
      return { labels: [], datasets: [] };
    }

    return {
      labels: data.labels,
      datasets: data.datasets.map((ds, i) => ({
        ...ds,
        borderColor:
          ds.borderColor ||
          theme.colors.chartColors[i % theme.colors.chartColors.length],
        backgroundColor:
          ds.backgroundColor ||
          `${theme.colors.chartColors[i % theme.colors.chartColors.length]}33`,
        tension: ds.tension ?? 0.3,
        pointRadius: ds.pointRadius ?? 3,
        pointHoverRadius: ds.pointHoverRadius ?? 6,
      })),
    };
  }, [data, theme]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: chartData.datasets.length > 1,
          labels: { color: theme.colors.text, font: { size: 11 } },
        },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: {
        x: {
          ticks: { color: theme.colors.textSecondary, font: { size: 10 } },
          grid: { color: `${theme.colors.border}66` },
        },
        y: {
          ticks: { color: theme.colors.textSecondary, font: { size: 10 } },
          grid: { color: `${theme.colors.border}66` },
        },
      },
    }),
    [theme, chartData.datasets.length]
  );

  if (!data || !data.labels?.length) {
    return <div data-testid="line-chart-empty">No data available</div>;
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 200 }} data-testid="line-chart">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default LineChart;

import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useTheme } from 'styled-components';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const BarChart = ({ data, title }) => {
  const theme = useTheme();

  const chartData = useMemo(() => {
    if (!data || !data.labels || !data.datasets) {
      return { labels: [], datasets: [] };
    }

    return {
      labels: data.labels,
      datasets: data.datasets.map((ds, i) => ({
        ...ds,
        backgroundColor:
          ds.backgroundColor ||
          theme.colors.chartColors[i % theme.colors.chartColors.length],
        borderColor:
          ds.borderColor ||
          theme.colors.chartColors[i % theme.colors.chartColors.length],
        borderWidth: ds.borderWidth ?? 1,
        borderRadius: ds.borderRadius ?? 4,
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
          beginAtZero: true,
        },
      },
    }),
    [theme, chartData.datasets.length]
  );

  if (!data || !data.labels?.length) {
    return <div data-testid="bar-chart-empty">No data available</div>;
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 200 }} data-testid="bar-chart">
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default BarChart;

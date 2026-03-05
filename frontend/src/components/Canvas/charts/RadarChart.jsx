import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { useTheme } from 'styled-components';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const RadarChart = ({ data, title }) => {
  const theme = useTheme();

  const chartData = useMemo(() => {
    if (!data || !data.labels || !data.datasets) {
      return { labels: [], datasets: [] };
    }

    return {
      labels: data.labels,
      datasets: data.datasets.map((ds, i) => {
        const color =
          theme.colors.chartColors[i % theme.colors.chartColors.length];
        return {
          ...ds,
          borderColor: ds.borderColor || color,
          backgroundColor: ds.backgroundColor || `${color}33`,
          pointBackgroundColor: ds.pointBackgroundColor || color,
          pointBorderColor: ds.pointBorderColor || '#FFFFFF',
          pointHoverRadius: ds.pointHoverRadius ?? 6,
        };
      }),
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
      },
      scales: {
        r: {
          angleLines: { color: `${theme.colors.border}66` },
          grid: { color: `${theme.colors.border}66` },
          pointLabels: {
            color: theme.colors.textSecondary,
            font: { size: 10 },
          },
          ticks: {
            color: theme.colors.textSecondary,
            backdropColor: 'transparent',
            font: { size: 9 },
          },
        },
      },
    }),
    [theme, chartData.datasets.length]
  );

  if (!data || !data.labels?.length) {
    return <div data-testid="radar-chart-empty">No data available</div>;
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 200 }} data-testid="radar-chart">
      <Radar data={chartData} options={options} />
    </div>
  );
};

export default RadarChart;

import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useTheme } from 'styled-components';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

const ForecastCone = ({ data, title }) => {
  const theme = useTheme();

  const chartData = useMemo(() => {
    if (!data || !data.dates) {
      return { labels: [], datasets: [] };
    }

    const primaryColor = theme.colors.chartColors[0];
    const forecastColor = theme.colors.chartColors[1];

    const datasets = [];

    // Upper confidence band (drawn first, will be filled down to lower)
    if (data.upper) {
      datasets.push({
        label: 'Upper Bound',
        data: data.upper,
        borderColor: 'transparent',
        backgroundColor: `${forecastColor}22`,
        fill: '+1', // fill to next dataset (lower)
        pointRadius: 0,
        tension: 0.3,
        order: 3,
      });
    }

    // Lower confidence band
    if (data.lower) {
      datasets.push({
        label: 'Lower Bound',
        data: data.lower,
        borderColor: 'transparent',
        backgroundColor: `${forecastColor}22`,
        fill: false,
        pointRadius: 0,
        tension: 0.3,
        order: 3,
      });
    }

    // Forecast line
    if (data.forecast) {
      datasets.push({
        label: 'Forecast',
        data: data.forecast,
        borderColor: forecastColor,
        backgroundColor: 'transparent',
        borderDash: [6, 3],
        pointRadius: 2,
        tension: 0.3,
        order: 2,
      });
    }

    // Actual line (on top)
    if (data.actual) {
      datasets.push({
        label: 'Actual',
        data: data.actual,
        borderColor: primaryColor,
        backgroundColor: 'transparent',
        pointRadius: 3,
        pointHoverRadius: 6,
        tension: 0.3,
        borderWidth: 2,
        order: 1,
      });
    }

    return { labels: data.dates, datasets };
  }, [data, theme]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
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
    [theme]
  );

  if (!data || !data.dates?.length) {
    return <div data-testid="forecast-cone-empty">No data available</div>;
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 200 }} data-testid="forecast-cone">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default ForecastCone;

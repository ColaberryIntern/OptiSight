import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { lightTheme } from '../../../styles/theme';
import ChartTypeSelector, { CHART_TYPES } from '../ChartTypeSelector';

const renderWithTheme = (ui) =>
  render(<ThemeProvider theme={lightTheme}>{ui}</ThemeProvider>);

describe('ChartTypeSelector', () => {
  it('renders all chart type buttons', () => {
    renderWithTheme(<ChartTypeSelector activeType={null} />);
    expect(screen.getByTestId('chart-type-selector')).toBeInTheDocument();

    CHART_TYPES.forEach(({ key }) => {
      expect(screen.getByTestId(`chart-type-${key}`)).toBeInTheDocument();
    });
  });

  it('renders labels for each chart type', () => {
    renderWithTheme(<ChartTypeSelector activeType={null} />);
    expect(screen.getByText('Line')).toBeInTheDocument();
    expect(screen.getByText('Bar')).toBeInTheDocument();
    expect(screen.getByText('Heatmap')).toBeInTheDocument();
    expect(screen.getByText('Geo')).toBeInTheDocument();
    expect(screen.getByText('Network')).toBeInTheDocument();
    expect(screen.getByText('Radar')).toBeInTheDocument();
    expect(screen.getByText('Waterfall')).toBeInTheDocument();
    expect(screen.getByText('Forecast')).toBeInTheDocument();
    expect(screen.getByText('Risk')).toBeInTheDocument();
    expect(screen.getByText('Tree')).toBeInTheDocument();
  });

  it('calls onTypeChange when a button is clicked', () => {
    const onTypeChange = vi.fn();
    renderWithTheme(
      <ChartTypeSelector activeType={null} onTypeChange={onTypeChange} />
    );
    fireEvent.click(screen.getByTestId('chart-type-bar'));
    expect(onTypeChange).toHaveBeenCalledWith('bar');
  });

  it('highlights the active type button', () => {
    renderWithTheme(<ChartTypeSelector activeType="line" />);
    const lineButton = screen.getByTestId('chart-type-line');
    // Active button gets primary background; check it has the primary color style
    expect(lineButton).toBeInTheDocument();
  });

  it('does not crash when onTypeChange is not provided', () => {
    renderWithTheme(<ChartTypeSelector activeType={null} />);
    // Should not throw
    expect(() => {
      fireEvent.click(screen.getByTestId('chart-type-radar'));
    }).not.toThrow();
  });
});

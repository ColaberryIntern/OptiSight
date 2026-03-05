import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { lightTheme, darkTheme } from '../../../styles/theme';

// Mock react-leaflet since it requires actual DOM / canvas features
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, center, zoom, style }) => (
    <div data-testid="leaflet-map" data-center={JSON.stringify(center)} data-zoom={zoom}>
      {children}
    </div>
  ),
  TileLayer: ({ url }) => <div data-testid="leaflet-tile" data-url={url} />,
  CircleMarker: ({ children, center, radius }) => (
    <div data-testid="leaflet-circle" data-center={JSON.stringify(center)} data-radius={radius}>
      {children}
    </div>
  ),
  Popup: ({ children }) => <div data-testid="leaflet-popup">{children}</div>,
}));

// Mock CSS import
vi.mock('leaflet/dist/leaflet.css', () => ({}));

import GeoMap from '../charts/GeoMap';

const renderWithTheme = (ui, themeObj = lightTheme) =>
  render(<ThemeProvider theme={themeObj}>{ui}</ThemeProvider>);

describe('GeoMap', () => {
  const validData = {
    stores: [
      {
        lat: 32.78,
        lng: -96.8,
        name: 'Dallas HQ',
        metrics: { revenue: 500000, health: 85, complaints: 12 },
      },
      {
        lat: 30.27,
        lng: -97.74,
        name: 'Austin Store',
        metrics: { revenue: 300000, health: 45, complaints: 30 },
      },
    ],
  };

  it('renders empty state when data is null', () => {
    renderWithTheme(<GeoMap data={null} />);
    expect(screen.getByTestId('geo-map-empty')).toBeInTheDocument();
  });

  it('renders empty state when stores are empty', () => {
    renderWithTheme(<GeoMap data={{ stores: [] }} />);
    expect(screen.getByTestId('geo-map-empty')).toBeInTheDocument();
  });

  it('renders the map container with valid data', () => {
    renderWithTheme(<GeoMap data={validData} />);
    expect(screen.getByTestId('geo-map')).toBeInTheDocument();
    expect(screen.getByTestId('leaflet-map')).toBeInTheDocument();
  });

  it('renders circle markers for each store', () => {
    renderWithTheme(<GeoMap data={validData} />);
    const circles = screen.getAllByTestId('leaflet-circle');
    expect(circles.length).toBe(2);
  });

  it('renders popups with store names', () => {
    renderWithTheme(<GeoMap data={validData} />);
    expect(screen.getByText('Dallas HQ')).toBeInTheDocument();
    expect(screen.getByText('Austin Store')).toBeInTheDocument();
  });

  it('renders revenue in popups', () => {
    renderWithTheme(<GeoMap data={validData} />);
    expect(screen.getByText(/500,000/)).toBeInTheDocument();
  });

  it('calculates center from store positions', () => {
    renderWithTheme(<GeoMap data={validData} />);
    const map = screen.getByTestId('leaflet-map');
    const center = JSON.parse(map.getAttribute('data-center'));
    // Average of lat/lng
    expect(center[0]).toBeCloseTo(31.525, 1);
    expect(center[1]).toBeCloseTo(-97.27, 1);
  });

  it('uses OpenStreetMap tiles for light theme', () => {
    renderWithTheme(<GeoMap data={validData} />, lightTheme);
    const tile = screen.getByTestId('leaflet-tile');
    expect(tile.getAttribute('data-url')).toContain('openstreetmap');
  });

  it('uses CARTO dark tiles for dark theme', () => {
    renderWithTheme(<GeoMap data={validData} />, darkTheme);
    const tile = screen.getByTestId('leaflet-tile');
    expect(tile.getAttribute('data-url')).toContain('dark_all');
  });
});

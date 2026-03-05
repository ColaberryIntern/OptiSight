import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { useTheme } from 'styled-components';
import 'leaflet/dist/leaflet.css';

const getHealthColor = (health) => {
  if (health > 70) return '#34A853';
  if (health > 40) return '#F9AB00';
  return '#D93025';
};

const GeoMap = ({ data, title }) => {
  const theme = useTheme();

  if (!data || !data.stores?.length) {
    return <div data-testid="geo-map-empty">No data available</div>;
  }

  // Calculate center from store positions
  const avgLat =
    data.stores.reduce((sum, s) => sum + (s.lat || 0), 0) / data.stores.length;
  const avgLng =
    data.stores.reduce((sum, s) => sum + (s.lng || 0), 0) / data.stores.length;

  // Determine tile layer based on theme background brightness
  const isDark = theme.colors.background === '#202124';
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const tileAttribution = isDark
    ? '&copy; <a href="https://carto.com/">CARTO</a>'
    : '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>';

  // Determine radius scale from revenue if present
  const revenues = data.stores
    .map((s) => s.metrics?.revenue || 0)
    .filter((v) => v > 0);
  const maxRevenue = revenues.length ? Math.max(...revenues) : 1;

  const getRadius = (store) => {
    const rev = store.metrics?.revenue || 0;
    if (!rev || !maxRevenue) return 8;
    return Math.max(6, Math.min(25, (rev / maxRevenue) * 25));
  };

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 250 }} data-testid="geo-map">
      <MapContainer
        center={[avgLat, avgLng]}
        zoom={5}
        style={{ width: '100%', height: '100%', minHeight: 250, borderRadius: 8 }}
        scrollWheelZoom={true}
      >
        <TileLayer url={tileUrl} attribution={tileAttribution} />
        {data.stores.map((store, idx) => {
          const health = store.metrics?.health ?? store.health ?? 50;
          return (
            <CircleMarker
              key={store.name || idx}
              center={[store.lat, store.lng]}
              radius={getRadius(store)}
              pathOptions={{
                fillColor: getHealthColor(health),
                color: getHealthColor(health),
                fillOpacity: 0.7,
                weight: 2,
              }}
            >
              <Popup>
                <div>
                  <strong>{store.name || `Store ${idx + 1}`}</strong>
                  {store.metrics && (
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      {store.metrics.revenue !== undefined && (
                        <div>Revenue: ${store.metrics.revenue.toLocaleString()}</div>
                      )}
                      {store.metrics.health !== undefined && (
                        <div>Health: {store.metrics.health}%</div>
                      )}
                      {store.metrics.complaints !== undefined && (
                        <div>Complaints: {store.metrics.complaints}</div>
                      )}
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default GeoMap;

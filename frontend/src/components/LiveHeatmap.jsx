import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { getHeatmapData } from '../services/api.js';
import { getDevicePosition } from '../lib/location.js';

function HeatmapLayer({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) return undefined;

    const heat = L.heatLayer(points, {
      radius: 35,
      blur: 25,
      maxZoom: 10,
      minOpacity: 0.5,
      gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red' }
    }).addTo(map);

    return () => {
      if (map.hasLayer(heat)) {
        map.removeLayer(heat);
      }
    };
  }, [map, points]);

  return null;
}

function RecenterMap({ center }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [map, center]);

  return null;
}

export default function LiveHeatmap({ issues, height = 'h-48' }) {
  const [apiPoints, setApiPoints] = useState([]);
  const [deviceCenter, setDeviceCenter] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadHeatmap = async () => {
      try {
        const data = await getHeatmapData();
        if (isMounted) setApiPoints(data);
      } catch (error) {
        console.error('Could not load heatmap data', error);
      }
    };

    loadHeatmap();
    const interval = window.setInterval(loadHeatmap, 30000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    getDevicePosition()
      .then(position => {
        if (isMounted) setDeviceCenter(position);
      })
      .catch(error => {
        console.warn('Device location unavailable for heatmap', error);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const heatmapPoints = apiPoints.length > 0
    ? apiPoints.map(point => [point.lat, point.lng, point.intensity])
    : issues
      // Fall back to the complaint list when the analytics endpoint is empty.
      .filter(issue => issue.latitude && issue.longitude)
      .map(issue => {
        let weight = 0.5;
        if (issue.priority === 'HIGH') weight = 0.8;
        if (issue.priority === 'URGENT') weight = 1.0;
        return [issue.latitude, issue.longitude, weight];
      });

  const center = deviceCenter || (heatmapPoints.length > 0
    ? [heatmapPoints[0][0], heatmapPoints[0][1]]
    : null);

  if (!center) {
    // Avoid showing a fake city center before we have real report or device data.
    return (
      <div className={`w-full ${height} bg-gray-900 rounded-lg overflow-hidden relative flex items-center justify-center text-white/70 text-xs font-medium`}>
        No location data available yet
      </div>
    );
  }

  return (
    <div className={`w-full ${height} bg-gray-900 rounded-lg overflow-hidden relative group`}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        zoomControl={false}
      >
        <RecenterMap center={center} />
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <HeatmapLayer points={heatmapPoints} />
      </MapContainer>

      <div className="absolute bottom-2 left-2 bg-white/20 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white font-medium flex items-center gap-1 z-[1000] shadow-sm pointer-events-none">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
        Interactive Live Heatmap
      </div>
    </div>
  );
}

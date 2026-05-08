import React, { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

function HeatmapLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) return;

    // @ts-ignore
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

interface LiveHeatmapProps {
  issues: any[];
  height?: string;
}

export default function LiveHeatmap({ issues, height = "h-48" }: LiveHeatmapProps) {
  // Prepare heatmap data
  const heatmapPoints = issues
    .filter(issue => issue.latitude && issue.longitude)
    .map(issue => {
      // Weight priority
      let weight = 0.5;
      if (issue.priority === 'HIGH') weight = 0.8;
      if (issue.priority === 'URGENT') weight = 1.0;
      return [issue.latitude, issue.longitude, weight] as [number, number, number];
    });

  const center: [number, number] = heatmapPoints.length > 0 
    ? [heatmapPoints[0][0], heatmapPoints[0][1]] 
    : [12.9716, 77.5946]; // Default to Bangalore

  return (
    <div className={`w-full ${height} bg-gray-900 rounded-lg overflow-hidden relative group`}>
      <MapContainer 
        center={center} 
        zoom={13} 
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        zoomControl={false}
      >
        <TileLayer
           attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
           url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" // Dark theme for heatmap
        />
        <HeatmapLayer points={heatmapPoints} />
      </MapContainer>
      
      {/* Overlay to avoid map intercepting scroll easily, removed pointer events if needed.
          If we want interactive map we keep pointer events. Let's make it interactive. */}
      <div className="absolute bottom-2 left-2 bg-white/20 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white font-medium flex items-center gap-1 z-[1000] shadow-sm pointer-events-none">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
        Interactive Live Heatmap
      </div>
    </div>
  );
}

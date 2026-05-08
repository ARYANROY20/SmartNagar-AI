import React from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet's default icon path issues in Vite
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png?url';
import iconUrl from 'leaflet/dist/images/marker-icon.png?url';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png?url';

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

interface LocationPickerProps {
  position: [number, number] | null;
  setPosition: (pos: [number, number]) => void;
  onConfirm: () => void;
}

export default function LocationPicker({ position, setPosition, onConfirm }: LocationPickerProps) {
  // Default to a generic city center if no position is selected yet
  const defaultPosition: [number, number] = [12.9716, 77.5946]; // Bangalore, for example

  function MapClickHandler() {
    useMapEvents({
      click(e) {
        setPosition([e.latlng.lat, e.latlng.lng]);
      },
    });
    return null;
  }

  return (
    <div className="relative w-full h-64 rounded-2xl overflow-hidden shadow-inner border border-gray-200">
      <MapContainer
        center={position || defaultPosition}
        zoom={position ? 16 : 12}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        {position && <Marker position={position} />}
        <MapClickHandler />
      </MapContainer>
      
      <div className="absolute bottom-3 left-0 right-0 flex justify-center z-[1000]">
        <button
          onClick={(e) => {
            e.preventDefault();
            onConfirm();
          }}
          className="bg-gray-900 text-white px-6 py-2.5 rounded-full font-semibold shadow-lg shadow-black/20 hover:bg-black active:scale-95 transition-all text-sm"
        >
          {position ? 'Confirm Location' : 'Tap map to place pin'}
        </button>
      </div>
    </div>
  );
}

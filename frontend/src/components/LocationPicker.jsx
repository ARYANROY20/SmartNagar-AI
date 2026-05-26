import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Crosshair, Loader2 } from 'lucide-react';
import { getDevicePosition, reverseGeocode } from '../lib/location.js';

// Fix Leaflet's default icon path issues in Vite
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png?url';
import iconUrl from 'leaflet/dist/images/marker-icon.png?url';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png?url';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

function RecenterMap({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [map, center, zoom]);

  return null;
}

export default function LocationPicker({ position, setPosition, address, setAddress, onConfirm }) {
  const [deviceCenter, setDeviceCenter] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getDevicePosition()
      .then(currentPosition => {
        if (isMounted) setDeviceCenter(currentPosition);
      })
      .catch(error => {
        console.error('Device location unavailable for picker', error);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const choosePosition = async (nextPosition) => {
    setPosition(nextPosition);
    try {
      // Keep the stored coordinates and the editable address in sync.
      const placeName = await reverseGeocode(nextPosition[0], nextPosition[1]);
      setAddress?.(placeName);
    } catch (error) {
      setAddress?.(`${nextPosition[0].toFixed(5)}, ${nextPosition[1].toFixed(5)}`);
    }
  };

  const useDeviceLocation = async () => {
    setIsLocating(true);
    try {
      const currentPosition = await getDevicePosition();
      await choosePosition(currentPosition);
    } catch (error) {
      console.error('Could not access device location', error);
      alert('Could not access device location. Please allow location permission or tap the map.');
    } finally {
      setIsLocating(false);
    }
  };
  
  const mapCenter = position || deviceCenter;

  function MapClickHandler() {
    useMapEvents({
      click(e) {
        choosePosition([e.latlng.lat, e.latlng.lng]);
      },
    });
    return null;
  }

  if (!mapCenter) {
    // Wait for real location data instead of centering the map on a hardcoded city.
    return (
      <div className="relative w-full h-64 rounded-2xl overflow-hidden shadow-inner border border-gray-200 bg-gray-900 flex flex-col items-center justify-center gap-3 text-center p-4">
        <p className="text-sm font-medium text-white/80">Use your current location to open the map.</p>
        <button
          type="button"
          onClick={useDeviceLocation}
          disabled={isLocating}
          className="bg-white text-gray-800 px-4 py-2 rounded-full font-semibold shadow-md border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all text-xs flex items-center gap-1.5 disabled:opacity-70"
        >
          {isLocating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5 text-blue-600" />}
          Use my location
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-64 rounded-2xl overflow-hidden shadow-inner border border-gray-200">
      <MapContainer
        center={mapCenter}
        zoom={position ? 18 : 16}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        zoomControl={false}
      >
        <RecenterMap center={mapCenter} zoom={position ? 18 : 16} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        {position && <Marker position={position} />}
        <MapClickHandler />
      </MapContainer>

      <button
        type="button"
        onClick={useDeviceLocation}
        disabled={isLocating}
        className="absolute top-3 right-3 z-[1000] bg-white text-gray-800 px-3 py-2 rounded-full font-semibold shadow-md border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all text-xs flex items-center gap-1.5 disabled:opacity-70"
      >
        {isLocating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5 text-blue-600" />}
        Use my location
      </button>
      
      <div className="absolute bottom-3 left-0 right-0 flex justify-center z-[1000]">
        <button
          onClick={(e) => {
            e.preventDefault();
            onConfirm();
          }}
          className="bg-gray-900 text-white px-6 py-2.5 rounded-full font-semibold shadow-lg shadow-black/20 hover:bg-black active:scale-95 transition-all text-sm"
        >
          {position ? (address || 'Confirm Location') : 'Tap map to place pin'}
        </button>
      </div>
    </div>
  );
}

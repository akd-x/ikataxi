import { useCallback, useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const pickupIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'marker-pickup',
});

const dropoffIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'marker-dropoff',
});

const DEFAULT_CENTER = [48.8566, 2.3522]; // Paris

function ClickHandler({ onClick }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng);
    },
  });
  return null;
}

export default function MapPicker({ pickup, dropoff, activePoint, onPick }) {
  const handleClick = useCallback(
    (latlng) => {
      onPick(activePoint, { lat: latlng.lat, lng: latlng.lng });
    },
    [activePoint, onPick]
  );

  const center = pickup || dropoff || { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] };

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      scrollWheelZoom
      style={{ height: '100%', width: '100%', borderRadius: 12 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onClick={handleClick} />
      {pickup && <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon} />}
      {dropoff && <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon} />}
    </MapContainer>
  );
}

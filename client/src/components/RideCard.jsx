import { STATUS_COLORS, STATUS_LABELS } from '../statusLabels';

export default function RideCard({ ride, children }) {
  return (
    <div className="ride-card">
      <div className="ride-card-header">
        <span className="status-dot" style={{ background: STATUS_COLORS[ride.status] }} />
        <strong>{STATUS_LABELS[ride.status] || ride.status}</strong>
      </div>
      <div className="ride-card-row">
        <span className="label">Départ</span>
        <span>{ride.pickup_address}</span>
      </div>
      <div className="ride-card-row">
        <span className="label">Arrivée</span>
        <span>{ride.dropoff_address}</span>
      </div>
      <div className="ride-card-row">
        <span className="label">Distance</span>
        <span>{ride.distance_km} km</span>
      </div>
      <div className="ride-card-row">
        <span className="label">Prix estimé</span>
        <span>{ride.fare.toFixed(2)} €</span>
      </div>
      {ride.driver && (
        <div className="ride-card-row">
          <span className="label">Chauffeur</span>
          <span>
            {ride.driver.name}
            {ride.driver.vehicle_make ? ` · ${ride.driver.vehicle_make}` : ''}
            {ride.driver.vehicle_plate ? ` · ${ride.driver.vehicle_plate}` : ''}
          </span>
        </div>
      )}
      {ride.rider && (
        <div className="ride-card-row">
          <span className="label">Client</span>
          <span>
            {ride.rider.name}
            {ride.rider.phone ? ` · ${ride.rider.phone}` : ''}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import MapPicker from '../components/MapPicker';
import RideCard from '../components/RideCard';
import { reverseGeocode } from '../geocode';

const ACTIVE_STATUSES = ['requested', 'accepted', 'arrived', 'in_progress'];

export default function RiderDashboard() {
  const { user, logout } = useAuth();
  const socket = useSocket();

  const [pickup, setPickup] = useState(null);
  const [dropoff, setDropoff] = useState(null);
  const [activePoint, setActivePoint] = useState('pickup');
  const [geocoding, setGeocoding] = useState(false);

  const [activeRide, setActiveRide] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadRides = useCallback(async () => {
    const { data } = await api.get('/rides/mine');
    const active = data.rides.find((r) => ACTIVE_STATUSES.includes(r.status));
    setActiveRide(active || null);
    setHistory(data.rides.filter((r) => !ACTIVE_STATUSES.includes(r.status)));
  }, []);

  useEffect(() => {
    loadRides().finally(() => setLoading(false));
  }, [loadRides]);

  useEffect(() => {
    if (!socket || !activeRide) return undefined;
    const handler = (ride) => {
      if (ride.id !== activeRide.id) return;
      if (ACTIVE_STATUSES.includes(ride.status)) {
        setActiveRide(ride);
      } else {
        loadRides();
      }
    };
    socket.on('ride:update', handler);
    return () => socket.off('ride:update', handler);
  }, [socket, activeRide?.id, loadRides]);

  const handlePick = useCallback(async (point, latlng) => {
    setError('');
    setGeocoding(true);
    const address = await reverseGeocode(latlng.lat, latlng.lng);
    setGeocoding(false);
    const value = { ...latlng, address };
    if (point === 'pickup') {
      setPickup(value);
      setActivePoint('dropoff');
    } else {
      setDropoff(value);
    }
  }, []);

  const estimate = useMemo(() => {
    if (!pickup || !dropoff) return null;
    const R = 6371;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(dropoff.lat - pickup.lat);
    const dLng = toRad(dropoff.lng - pickup.lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(pickup.lat)) * Math.cos(toRad(dropoff.lat)) * Math.sin(dLng / 2) ** 2;
    const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const fare = 2.5 + distanceKm * 1.2;
    return { distanceKm: distanceKm.toFixed(2), fare: fare.toFixed(2) };
  }, [pickup, dropoff]);

  async function handleBook() {
    if (!pickup || !dropoff) return;
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post('/rides', {
        pickupAddress: pickup.address,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropoffAddress: dropoff.address,
        dropoffLat: dropoff.lat,
        dropoffLng: dropoff.lng,
      });
      setActiveRide(data.ride);
      setPickup(null);
      setDropoff(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de commander la course');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!activeRide) return;
    try {
      await api.patch(`/rides/${activeRide.id}/status`, { status: 'cancelled' });
      setActiveRide(null);
      await loadRides();
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'annuler la course");
    }
  }

  if (loading) return <div className="page-loading">Chargement…</div>;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>🚕 IkaTaxi</h1>
        <div className="header-right">
          <span>Bonjour, {user.name}</span>
          <button className="ghost" onClick={logout}>
            Déconnexion
          </button>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {activeRide ? (
        <div className="panel">
          <h2>Votre course</h2>
          <RideCard ride={activeRide}>
            {['requested', 'accepted', 'arrived'].includes(activeRide.status) && (
              <button className="danger" onClick={handleCancel}>
                Annuler la course
              </button>
            )}
          </RideCard>
        </div>
      ) : (
        <div className="booking-layout">
          <div className="map-wrap">
            <MapPicker
              pickup={pickup}
              dropoff={dropoff}
              activePoint={activePoint}
              onPick={handlePick}
            />
          </div>
          <div className="panel booking-form">
            <h2>Réserver une course</h2>
            <div className="point-selector">
              <button
                className={activePoint === 'pickup' ? 'active' : ''}
                onClick={() => setActivePoint('pickup')}
              >
                📍 Départ
              </button>
              <button
                className={activePoint === 'dropoff' ? 'active' : ''}
                onClick={() => setActivePoint('dropoff')}
              >
                🏁 Arrivée
              </button>
            </div>
            <p className="hint">Cliquez sur la carte pour définir le point sélectionné.</p>

            <label>
              Adresse de départ
              <input
                value={pickup?.address || ''}
                onChange={(e) => setPickup((p) => (p ? { ...p, address: e.target.value } : p))}
                placeholder="Cliquez sur la carte…"
              />
            </label>
            <label>
              Adresse d'arrivée
              <input
                value={dropoff?.address || ''}
                onChange={(e) => setDropoff((d) => (d ? { ...d, address: e.target.value } : d))}
                placeholder="Cliquez sur la carte…"
              />
            </label>

            {geocoding && <p className="hint">Recherche de l'adresse…</p>}

            {estimate && (
              <div className="estimate">
                <div>
                  <span className="label">Distance</span>
                  <span>{estimate.distanceKm} km</span>
                </div>
                <div>
                  <span className="label">Prix estimé</span>
                  <span>{estimate.fare} €</span>
                </div>
              </div>
            )}

            <button
              disabled={!pickup || !dropoff || submitting}
              onClick={handleBook}
              className="primary"
            >
              {submitting ? 'Commande…' : 'Commander un taxi'}
            </button>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="panel">
          <h2>Historique</h2>
          <div className="ride-list">
            {history.map((ride) => (
              <RideCard key={ride.id} ride={ride} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

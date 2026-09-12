import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import RideCard from '../components/RideCard';

const ACTIVE_STATUSES = ['accepted', 'arrived', 'in_progress'];

const NEXT_STATUS = {
  accepted: { next: 'arrived', label: 'Je suis arrivé' },
  arrived: { next: 'in_progress', label: 'Démarrer la course' },
  in_progress: { next: 'completed', label: 'Terminer la course' },
};

export default function DriverDashboard() {
  const { user, logout } = useAuth();
  const socket = useSocket();

  const [available, setAvailable] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(async () => {
    const [mineRes, availableRes] = await Promise.all([
      api.get('/rides/mine'),
      api.get('/rides/available'),
    ]);
    const active = mineRes.data.rides.find((r) => ACTIVE_STATUSES.includes(r.status));
    setActiveRide(active || null);
    setHistory(mineRes.data.rides.filter((r) => !ACTIVE_STATUSES.includes(r.status)));
    setAvailable(availableRes.data.rides);
  }, []);

  useEffect(() => {
    loadAll().finally(() => setLoading(false));
  }, [loadAll]);

  useEffect(() => {
    if (!socket) return undefined;

    const onNew = (ride) => {
      setAvailable((list) => (activeRide ? list : [...list, ride]));
    };
    const onTaken = ({ id }) => {
      setAvailable((list) => list.filter((r) => r.id !== id));
    };
    const onUpdate = (ride) => {
      if (activeRide && activeRide.id === ride.id) {
        if (ACTIVE_STATUSES.includes(ride.status)) {
          setActiveRide(ride);
        } else {
          loadAll();
        }
      }
    };

    socket.on('ride:new', onNew);
    socket.on('ride:taken', onTaken);
    socket.on('ride:update', onUpdate);
    return () => {
      socket.off('ride:new', onNew);
      socket.off('ride:taken', onTaken);
      socket.off('ride:update', onUpdate);
    };
  }, [socket, activeRide, loadAll]);

  async function handleAccept(rideId) {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post(`/rides/${rideId}/accept`);
      setActiveRide(data.ride);
      setAvailable((list) => list.filter((r) => r.id !== rideId));
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'accepter cette course");
      await loadAll();
    } finally {
      setBusy(false);
    }
  }

  async function handleAdvance() {
    if (!activeRide) return;
    const step = NEXT_STATUS[activeRide.status];
    if (!step) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await api.patch(`/rides/${activeRide.id}/status`, { status: step.next });
      if (data.ride.status === 'completed') {
        setActiveRide(null);
        await loadAll();
      } else {
        setActiveRide(data.ride);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de mettre à jour la course');
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!activeRide) return;
    setBusy(true);
    try {
      await api.patch(`/rides/${activeRide.id}/status`, { status: 'cancelled' });
      setActiveRide(null);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'annuler la course");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="page-loading">Chargement…</div>;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>🚕 IkaTaxi Chauffeur</h1>
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
          <h2>Course en cours</h2>
          <RideCard ride={activeRide}>
            <div className="button-row">
              {NEXT_STATUS[activeRide.status] && (
                <button className="primary" disabled={busy} onClick={handleAdvance}>
                  {NEXT_STATUS[activeRide.status].label}
                </button>
              )}
              {activeRide.status !== 'in_progress' && (
                <button className="danger" disabled={busy} onClick={handleCancel}>
                  Annuler
                </button>
              )}
            </div>
          </RideCard>
        </div>
      ) : (
        <div className="panel">
          <h2>Courses disponibles</h2>
          {available.length === 0 && <p className="hint">Aucune demande pour le moment.</p>}
          <div className="ride-list">
            {available.map((ride) => (
              <RideCard key={ride.id} ride={ride}>
                <button className="primary" disabled={busy} onClick={() => handleAccept(ride.id)}>
                  Accepter la course
                </button>
              </RideCard>
            ))}
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

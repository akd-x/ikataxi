import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { haversineKm, estimateFare } from '../utils/fare.js';

function publicUser(user) {
  if (!user) return null;
  const { password_hash, ...rest } = user;
  return rest;
}

function serializeRide(ride) {
  if (!ride) return null;
  const rider = db.prepare('SELECT * FROM users WHERE id = ?').get(ride.rider_id);
  const driver = ride.driver_id
    ? db.prepare('SELECT * FROM users WHERE id = ?').get(ride.driver_id)
    : null;
  return { ...ride, rider: publicUser(rider), driver: publicUser(driver) };
}

export function ridesRouter(io) {
  const router = Router();

  // Rider: request a new ride
  router.post('/', requireAuth, requireRole('rider'), (req, res) => {
    const { pickupAddress, pickupLat, pickupLng, dropoffAddress, dropoffLat, dropoffLng } =
      req.body || {};

    if (
      !pickupAddress ||
      !dropoffAddress ||
      [pickupLat, pickupLng, dropoffLat, dropoffLng].some(
        (v) => typeof v !== 'number' || Number.isNaN(v)
      )
    ) {
      return res.status(400).json({ error: 'Adresses et coordonnées de départ/arrivée requises' });
    }

    const activeRide = db
      .prepare(
        `SELECT id FROM rides WHERE rider_id = ? AND status IN ('requested','accepted','arrived','in_progress')`
      )
      .get(req.user.id);
    if (activeRide) {
      return res.status(409).json({ error: 'Vous avez déjà une course en cours' });
    }

    const distanceKm = haversineKm(pickupLat, pickupLng, dropoffLat, dropoffLng);
    const fare = estimateFare(distanceKm);

    const info = db
      .prepare(
        `INSERT INTO rides
          (rider_id, pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng, distance_km, fare, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'requested')`
      )
      .run(
        req.user.id,
        pickupAddress,
        pickupLat,
        pickupLng,
        dropoffAddress,
        dropoffLat,
        dropoffLng,
        Math.round(distanceKm * 100) / 100,
        fare
      );

    const ride = serializeRide(db.prepare('SELECT * FROM rides WHERE id = ?').get(info.lastInsertRowid));
    io.to('drivers').emit('ride:new', ride);
    res.status(201).json({ ride });
  });

  // Driver: list pending ride requests
  router.get('/available', requireAuth, requireRole('driver'), (req, res) => {
    const rides = db
      .prepare(`SELECT * FROM rides WHERE status = 'requested' ORDER BY created_at ASC`)
      .all()
      .map(serializeRide);
    res.json({ rides });
  });

  // Current user's rides (rider sees their rides, driver sees their assigned rides)
  router.get('/mine', requireAuth, (req, res) => {
    const column = req.user.role === 'driver' ? 'driver_id' : 'rider_id';
    const rides = db
      .prepare(`SELECT * FROM rides WHERE ${column} = ? ORDER BY created_at DESC`)
      .all(req.user.id)
      .map(serializeRide);
    res.json({ rides });
  });

  router.get('/:id', requireAuth, (req, res) => {
    const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(req.params.id);
    if (!ride) return res.status(404).json({ error: 'Course introuvable' });
    if (ride.rider_id !== req.user.id && ride.driver_id !== req.user.id) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    res.json({ ride: serializeRide(ride) });
  });

  // Driver: accept a pending ride
  router.post('/:id/accept', requireAuth, requireRole('driver'), (req, res) => {
    const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(req.params.id);
    if (!ride) return res.status(404).json({ error: 'Course introuvable' });
    if (ride.status !== 'requested') {
      return res.status(409).json({ error: 'Cette course a déjà été prise en charge' });
    }

    db.prepare(
      `UPDATE rides SET driver_id = ?, status = 'accepted', updated_at = datetime('now') WHERE id = ?`
    ).run(req.user.id, ride.id);

    const updated = serializeRide(db.prepare('SELECT * FROM rides WHERE id = ?').get(ride.id));
    io.to('drivers').emit('ride:taken', { id: ride.id });
    io.to(`user:${ride.rider_id}`).emit('ride:update', updated);
    res.json({ ride: updated });
  });

  const VALID_TRANSITIONS = {
    accepted: ['arrived', 'cancelled'],
    arrived: ['in_progress', 'cancelled'],
    in_progress: ['completed'],
    requested: ['cancelled'],
  };

  // Driver or rider: update ride status
  router.patch('/:id/status', requireAuth, (req, res) => {
    const { status } = req.body || {};
    const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(req.params.id);
    if (!ride) return res.status(404).json({ error: 'Course introuvable' });

    const isParticipant = ride.rider_id === req.user.id || ride.driver_id === req.user.id;
    if (!isParticipant) return res.status(403).json({ error: 'Accès refusé' });

    if (status === 'cancelled') {
      if (!['requested', 'accepted', 'arrived'].includes(ride.status)) {
        return res.status(409).json({ error: 'Cette course ne peut plus être annulée' });
      }
    } else {
      if (req.user.role !== 'driver') {
        return res.status(403).json({ error: 'Seul le chauffeur peut modifier ce statut' });
      }
      const allowed = VALID_TRANSITIONS[ride.status] || [];
      if (!allowed.includes(status)) {
        return res.status(409).json({ error: `Transition invalide: ${ride.status} -> ${status}` });
      }
    }

    db.prepare(`UPDATE rides SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(
      status,
      ride.id
    );

    const updated = serializeRide(db.prepare('SELECT * FROM rides WHERE id = ?').get(ride.id));
    io.to(`user:${ride.rider_id}`).emit('ride:update', updated);
    if (ride.driver_id) io.to(`user:${ride.driver_id}`).emit('ride:update', updated);
    if (status === 'cancelled' && ride.status === 'requested') {
      io.to('drivers').emit('ride:taken', { id: ride.id });
    }
    res.json({ ride: updated });
  });

  return router;
}

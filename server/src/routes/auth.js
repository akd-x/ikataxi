import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { signToken, requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

function publicUser(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

authRouter.post('/register', async (req, res) => {
  const { name, email, password, role, phone, vehicleMake, vehiclePlate } = req.body || {};

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Nom, email, mot de passe et rôle sont requis' });
  }
  if (!['rider', 'driver'].includes(role)) {
    return res.status(400).json({ error: "Le rôle doit être 'rider' ou 'driver'" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'Un compte existe déjà avec cet email' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const info = db
    .prepare(
      `INSERT INTO users (name, email, phone, password_hash, role, vehicle_make, vehicle_plate)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      name,
      email.toLowerCase(),
      phone || null,
      passwordHash,
      role,
      role === 'driver' ? vehicleMake || null : null,
      role === 'driver' ? vehiclePlate || null : null
    );

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

authRouter.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json({ user: publicUser(user) });
});

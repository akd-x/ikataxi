import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'rider',
    vehicleMake: '',
    vehiclePlate: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await register(form);
      navigate(user.role === 'driver' ? '/driver' : '/rider');
    } catch (err) {
      setError(err.response?.data?.error || "Échec de l'inscription");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>🚕 IkaTaxi</h1>
        <p className="subtitle">Créer un compte</p>
        {error && <div className="error-banner">{error}</div>}

        <div className="role-toggle">
          <button
            type="button"
            className={form.role === 'rider' ? 'active' : ''}
            onClick={() => setForm((f) => ({ ...f, role: 'rider' }))}
          >
            Client
          </button>
          <button
            type="button"
            className={form.role === 'driver' ? 'active' : ''}
            onClick={() => setForm((f) => ({ ...f, role: 'driver' }))}
          >
            Chauffeur
          </button>
        </div>

        <label>
          Nom complet
          <input required value={form.name} onChange={update('name')} placeholder="Jean Dupont" />
        </label>
        <label>
          Email
          <input
            type="email"
            required
            value={form.email}
            onChange={update('email')}
            placeholder="vous@example.com"
          />
        </label>
        <label>
          Téléphone
          <input value={form.phone} onChange={update('phone')} placeholder="+33 6 12 34 56 78" />
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={update('password')}
            placeholder="Au moins 6 caractères"
          />
        </label>

        {form.role === 'driver' && (
          <>
            <label>
              Véhicule
              <input
                value={form.vehicleMake}
                onChange={update('vehicleMake')}
                placeholder="Toyota Corolla"
              />
            </label>
            <label>
              Plaque d'immatriculation
              <input
                value={form.vehiclePlate}
                onChange={update('vehiclePlate')}
                placeholder="AB-123-CD"
              />
            </label>
          </>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Création…' : 'Créer mon compte'}
        </button>
        <p className="switch-link">
          Déjà un compte ? <Link to="/login">Connectez-vous</Link>
        </p>
      </form>
    </div>
  );
}

# IkaTaxi 🚕

Application de commande de taxi en ligne. Les clients réservent une course en
choisissant un point de départ et d'arrivée sur une carte, et les chauffeurs
disponibles reçoivent la demande en temps réel et peuvent l'accepter puis
suivre la course jusqu'à sa fin.

## Fonctionnalités

- Inscription / connexion en tant que **client** ou **chauffeur**
- Sélection du point de départ et d'arrivée sur une carte interactive (Leaflet
  / OpenStreetMap), avec géocodage inverse automatique des adresses
- Estimation du prix et de la distance avant la commande
- Notification en temps réel (Socket.io) des nouvelles demandes de course aux
  chauffeurs disponibles
- Suivi en direct du statut de la course côté client : en attente, chauffeur
  en route, chauffeur arrivé, course en cours, course terminée
- Annulation de course côté client tant qu'elle n'est pas commencée
- Historique des courses pour les clients et les chauffeurs

## Architecture

```
ikataxi/
├── server/   API Express + SQLite + Socket.io
└── client/   Application React (Vite) + Leaflet
```

### Backend (`server/`)

- **Express** pour l'API REST (authentification, gestion des courses)
- **SQLite** (via `better-sqlite3`) pour la persistance des données
- **Socket.io** pour les mises à jour en temps réel (nouvelle course, prise en
  charge, changement de statut)
- **JWT** pour l'authentification, mots de passe hashés avec `bcryptjs`

### Frontend (`client/`)

- **React** + **Vite**
- **react-router-dom** pour la navigation
- **react-leaflet** / **Leaflet** pour la carte (tuiles OpenStreetMap)
- **socket.io-client** pour les mises à jour temps réel
- **axios** pour les appels à l'API

## Démarrage rapide

### 1. Backend

```bash
cd server
cp .env.example .env
npm install
npm start          # ou `npm run dev` pour le rechargement automatique
```

L'API démarre par défaut sur `http://localhost:4000`.

### 2. Frontend

Dans un autre terminal :

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

L'application est accessible sur `http://localhost:5173`.

## Utilisation

1. Créez un compte **Client** pour réserver une course, ou un compte
   **Chauffeur** pour accepter des courses.
2. En tant que client : cliquez sur la carte pour définir le point de départ,
   puis le point d'arrivée, vérifiez l'estimation et cliquez sur
   "Commander un taxi".
3. En tant que chauffeur : les nouvelles demandes apparaissent automatiquement
   dans "Courses disponibles" ; acceptez-en une puis faites progresser son
   statut (arrivé → course en cours → terminée).
4. Le client voit le statut de sa course évoluer en temps réel.

## Notes

- Le calcul du prix est une estimation simple basée sur la distance à vol
  d'oiseau (tarif de base + prix au kilomètre), à titre de démonstration.
- Le géocodage inverse des adresses utilise l'API publique Nominatim
  (OpenStreetMap) ; en cas d'indisponibilité, les coordonnées GPS sont
  utilisées comme adresse de repli.

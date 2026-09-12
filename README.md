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

## Déploiement en production avec Docker

Le dépôt inclut une configuration Docker Compose complète et prête à l'emploi
pour un serveur personnel (VPS) : l'API et le frontend tournent dans des
conteneurs séparés, derrière **Caddy** qui sert les fichiers statiques,
reverse-proxy l'API/Socket.io, et obtient automatiquement un certificat
HTTPS (Let's Encrypt) pour votre nom de domaine.

```
ikataxi/
├── docker-compose.yml
├── Caddyfile
├── server/Dockerfile
└── client/Dockerfile
```

### Prérequis

- Un serveur Linux avec [Docker](https://docs.docker.com/engine/install/) et
  le plugin `docker compose` installés
- Un nom de domaine dont l'enregistrement DNS (A/AAAA) pointe vers l'IP du
  serveur (nécessaire pour que Let's Encrypt délivre le certificat)
- Les ports **80** et **443** ouverts sur le serveur

### Installation

```bash
git clone https://github.com/akd-x/ikataxi.git
cd ikataxi
cp .env.example .env
```

Éditez `.env` :

```
DOMAIN=votre-domaine.com
JWT_SECRET=<générez une valeur aléatoire, ex: openssl rand -hex 32>
```

Puis lancez toute la stack :

```bash
docker compose up -d --build
```

Docker Compose construit les images (API Node et frontend React buildé/servi
par Nginx), puis Caddy démarre, obtient automatiquement le certificat HTTPS
pour `DOMAIN` et route :

- `/api/*` et `/socket.io/*` → conteneur `api` (Express + Socket.io, port 4000
  interne, jamais exposé directement)
- tout le reste → conteneur `web` (fichiers statiques du build React)

L'application est accessible sur `https://votre-domaine.com`.

### Test local sans nom de domaine

En développement/test sur votre propre machine, mettez `DOMAIN=localhost`
dans `.env` : Caddy utilisera alors son autorité de certification interne
(certificat auto-signé) au lieu de Let's Encrypt.

### Commandes utiles

```bash
docker compose logs -f          # suivre les logs de tous les services
docker compose ps               # état des conteneurs
docker compose down             # arrêter la stack
docker compose up -d --build    # reconstruire et redémarrer après un git pull
```

### Persistance des données

La base SQLite est stockée dans le volume Docker nommé `ikataxi_api_data`
(`/app/data/data.sqlite` dans le conteneur `api`) et survit aux redémarrages
et reconstructions. Pour la sauvegarder :

```bash
docker compose cp api:/app/data/data.sqlite ./backup-$(date +%F).sqlite
```

### Mise à jour

```bash
git pull
docker compose up -d --build
```

## Notes

- Le calcul du prix est une estimation simple basée sur la distance à vol
  d'oiseau (tarif de base + prix au kilomètre), à titre de démonstration.
- Le géocodage inverse des adresses utilise l'API publique Nominatim
  (OpenStreetMap) ; en cas d'indisponibilité, les coordonnées GPS sont
  utilisées comme adresse de repli.

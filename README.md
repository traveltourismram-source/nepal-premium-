<<<<<<< HEAD
# nepal-premium-
fuck
=======
# 🏔️ Nepal Route Planner — Full-Stack

A full-stack Nepal tourism route planner with a **React + Vite** frontend and a **Node.js + Express + SQLite** backend.

---

## Project Structure

```
nepal-tourism-route-webapp/
├── backend/                  ← Express API server
│   ├── src/
│   │   ├── index.ts          ← Entry point
│   │   ├── db/
│   │   │   ├── schema.ts     ← SQLite schema + init
│   │   │   └── seed.ts       ← Demo data seed
│   │   ├── lib/
│   │   │   └── jwt.ts        ← Token helpers
│   │   ├── middleware/
│   │   │   └── auth.ts       ← JWT middleware
│   │   └── routes/
│   │       ├── auth.ts       ← /api/auth/*
│   │       ├── trips.ts      ← /api/trips/*
│   │       ├── tips.ts       ← /api/tips  (AI proxy)
│   │       └── contact.ts    ← /api/contact
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── src/                      ← React frontend (Vite + TypeScript)
│   ├── lib/
│   │   └── api.ts            ← Typed API client (all backend calls)
│   ├── contexts/
│   │   └── AuthContext.tsx   ← Auth state (uses real API)
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   ├── Signup.tsx
│   │   └── Profile.tsx
│   └── components/
│       ├── TopBar.tsx
│       ├── AiTravelTips.tsx
│       ├── WeatherWidget.tsx
│       ├── TrekkingPermits.tsx
│       ├── ItineraryPlanner.tsx
│       └── SiteFooter.tsx
│
├── .env.example              ← Frontend env vars
└── README.md
```

---

## Quick Start

### 1. Backend

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env — set JWT_SECRET and optionally ANTHROPIC_API_KEY

# Seed demo data (creates SQLite DB + demo user)
npm run db:reset
# → demo user: demo@nepalroute.com / Demo1234!

# Start dev server (hot reload)
npm run dev
# → http://localhost:4000
```

### 2. Frontend

```bash
# From the project root
npm install

# Configure environment
cp .env.example .env.local
# VITE_API_URL=http://localhost:4000

# Start dev server
npm run dev
# → http://localhost:5173
```

---

## API Reference

All endpoints are prefixed with `/api`.

### Auth — `/api/auth`

| Method | Path          | Auth | Description                        |
|--------|---------------|------|------------------------------------|
| POST   | `/register`   | —    | Create account                     |
| POST   | `/login`      | —    | Sign in, returns tokens            |
| POST   | `/refresh`    | —    | Rotate access + refresh tokens     |
| POST   | `/logout`     | —    | Revoke refresh token               |
| GET    | `/me`         | ✓    | Get current user                   |
| PATCH  | `/me`         | ✓    | Update name / email / password     |
| DELETE | `/me`         | ✓    | Delete account                     |

#### Register / Login response
```json
{
  "user": {
    "id": "...",
    "firstName": "Aarav",
    "lastName": "Sharma",
    "email": "aarav@example.com",
    "role": "solo-trekker",
    "newsletter": true,
    "avatar": "https://api.dicebear.com/...",
    "joinedAt": 1700000000000
  },
  "accessToken": "eyJ...",
  "refreshToken": "abc123..."
}
```

### Trips — `/api/trips`  *(requires auth)*

| Method | Path      | Description             |
|--------|-----------|-------------------------|
| GET    | `/`       | List user's saved trips |
| POST   | `/`       | Save a new trip         |
| GET    | `/:id`    | Get single trip         |
| PATCH  | `/:id`    | Update trip notes/label |
| DELETE | `/:id`    | Delete single trip      |
| DELETE | `/`       | Clear all trips         |

#### Save trip body
```json
{
  "origin": "Kathmandu",
  "destination": "Pokhara",
  "mode": "tourist-bus",
  "distanceKm": 200,
  "durationMin": 390,
  "notes": "Optional text"
}
```

### AI Tips — `/api/tips`  *(optional auth)*

| Method | Path | Description                               |
|--------|------|-------------------------------------------|
| POST   | `/`  | Generate tips (server-side Claude proxy)  |

```json
// Request
{
  "origin": "Kathmandu",
  "destination": "Pokhara",
  "mode": "tourist-bus",
  "distanceKm": 200,
  "durationMin": 390
}
// Response
{
  "summary": "...",
  "tips": [{ "category": "Food", "tip": "..." }],
  "cached": false
}
```

Tips are **cached for 24 hours** by route to avoid duplicate API calls.

### Contact — `/api/contact`

| Method | Path | Description            |
|--------|------|------------------------|
| POST   | `/`  | Submit contact request |

---

## Authentication Flow

```
Client                          Server
  │                                │
  ├── POST /api/auth/login ────────►│
  │◄── { accessToken, refreshToken }│
  │                                │
  ├── GET /api/trips  ─────────────►│  (Authorization: Bearer <accessToken>)
  │                                │
  │  [access token expires]        │
  ├── POST /api/auth/refresh ──────►│  (body: { refreshToken })
  │◄── { new accessToken, new RT } │  (old RT is rotated/deleted)
```

- **Access tokens**: 7-day JWT (configurable via `JWT_EXPIRES_IN`)
- **Refresh tokens**: 30-day, stored hashed in SQLite, rotated on every use
- The frontend `api.ts` client handles refresh automatically on 401 responses

---

## Environment Variables

### Backend (`backend/.env`)

| Variable                 | Default              | Description                           |
|--------------------------|----------------------|---------------------------------------|
| `PORT`                   | `4000`               | Server port                           |
| `NODE_ENV`               | `development`        | `development` or `production`         |
| `JWT_SECRET`             | *(required)*         | Min 64 chars — use a strong random    |
| `JWT_EXPIRES_IN`         | `7d`                 | Access token lifetime                 |
| `JWT_REFRESH_EXPIRES_IN` | `30d`                | Refresh token lifetime                |
| `DB_PATH`                | `./data/nepal_route.db` | SQLite file path                  |
| `CORS_ORIGINS`           | `http://localhost:5173` | Comma-separated allowed origins   |
| `ANTHROPIC_API_KEY`      | —                    | For server-side AI tips proxy         |
| `RATE_LIMIT_MAX`         | `200`                | Requests per 15-min window            |

### Frontend (`.env.local`)

| Variable        | Default                    | Description              |
|-----------------|----------------------------|--------------------------|
| `VITE_API_URL`  | `http://localhost:4000`    | Backend base URL         |

---

## Production Deployment

### Backend
```bash
cd backend
npm run build          # Compile TypeScript → dist/
NODE_ENV=production node dist/index.js
```

Set `CORS_ORIGINS` to your frontend domain (e.g. `https://nepalroute.com`).

### Frontend
```bash
# Set VITE_API_URL to your production API domain
VITE_API_URL=https://api.nepalroute.com npm run build
# Serve the dist/ folder from any static host (Vercel, Netlify, S3, etc.)
```

---

## Database

SQLite via **better-sqlite3** — no extra database server needed.  
Tables: `users`, `refresh_tokens`, `saved_trips`, `tip_cache`, `contact_requests`.

To inspect:
```bash
sqlite3 backend/data/nepal_route.db
.tables
SELECT * FROM users;
```

---

## Data Sources

| Service | Purpose | Key required |
|---------|---------|-------------|
| [OSRM](https://project-osrm.org) | Road routing | No |
| [Photon](https://photon.komoot.io) | Geocoding / autocomplete | No |
| [Open-Meteo](https://open-meteo.com) | Weather | No |
| [Overpass API](https://overpass-api.de) | Hotel discovery (OSM) | No |
| [Anthropic Claude](https://anthropic.com) | AI travel tips | Yes — `ANTHROPIC_API_KEY` |

---

## License

MIT — free for personal and commercial use.  
© 2025 Nepal Route Planner
>>>>>>> 3eec897 (Add OAuth integration and AuthContext updates)

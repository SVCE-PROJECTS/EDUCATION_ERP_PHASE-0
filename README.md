# EDUCATION_ERP_PHASE-0

This is the official repo.

A department ERP system: one shared PostgreSQL database and Express API
(`unified_backend`) behind three separate React Native / Expo apps —
`admin-frontend` (admin), `hod-portal` (HOD) and `faculty-portal` (faculty).

## Prerequisites

- Node.js 18+
- PostgreSQL running locally (or reachable over the network)
- Expo Go app (or an Android/iOS simulator) to run the frontends

## Backend setup

```bash
cd unified_backend
cp .env.example .env      # set PG_* to your local Postgres credentials
npm install
npm run db:create         # creates the `education_erp` database (skip if it already exists)
npm run dev
```

The schema, all `database/migrations/*.sql` files, and the empty seed data
are applied **automatically every time the server starts** (`src/config/dbBootstrap.js`) —
every statement is written to be safe to re-run, so there's no separate
manual migration step. A fresh clone only needs `npm run db:create` once and
then `npm run dev`.

## Frontend setup

Each portal is an independent Expo app pointed at `unified_backend` via its
own `.env`:

```bash
cd admin-frontend   # or hod-portal / faculty-portal
cp .env.example .env      # set EXPO_PUBLIC_API_URL
npm install
npm start
```

`EXPO_PUBLIC_API_URL` should point at wherever `unified_backend` is running:

| Environment | URL |
|---|---|
| Android emulator | `http://10.0.2.2:5000/api` |
| iOS simulator / Web | `http://localhost:5000/api` |
| Physical device | `http://<your-LAN-IP>:5000/api` |

## Uploaded files

`unified_backend/uploads/` holds user-uploaded documents/photos at runtime
and is git-ignored — it's local, per-environment state, not part of the repo.

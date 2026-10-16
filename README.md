# Education ERP System - Phase 0

A unified department ERP system with a shared PostgreSQL database and Express API backend, powering a React Native/Expo frontend that covers Admin, HOD, and Faculty portals.

## 🚀 Features

- Multi-portal system (Admin, HOD, Faculty)
- Student and Faculty management
- Attendance tracking with analytics
- Assignment and IA marks management
- Department-wide analytics dashboards
- Activity and event management
- Role-based access control
- Document upload and management

## 📦 Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL 14+
- **Authentication**: JWT

### Frontend
- **Framework**: React Native + Expo
- **State Management**: TanStack Query (React Query)
- **Navigation**: React Navigation
- **UI**: Custom components with Expo Linear Gradient

## ⚡ Quick Setup

### Prerequisites

- Node.js 18+
- PostgreSQL running locally
- npm or yarn

### Backend

```bash
cd unified_backend
cp .env.example .env      # Configure your database credentials
npm install
npm run dev               # Starts on http://localhost:5000
```

### Frontend

```bash
cd unified-frontend
cp .env.example .env      # Set EXPO_PUBLIC_API_URL
npm install --legacy-peer-deps
npx expo start --clear --web
```

## 🔐 Default Credentials

The backend auto-seeds an **Admin** account on first start (see [Database Migrations](#-database-migrations) below):

- **Admin**: `admin` / `Admin@123`

HOD and Faculty logins aren't auto-seeded — they come from a separate seed file:

```bash
psql -U postgres -d education_erp -f database/seed_faculty_users.sql
```

Default password for all seeded faculty is `Faculty@123`. See [LOGIN_CREDENTIALS.md](./LOGIN_CREDENTIALS.md) for the full list of usernames/department codes.

## 📚 Documentation

- **[MEETING_MANAGEMENT_SETUP.md](./MEETING_MANAGEMENT_SETUP.md)** - Meeting management feature setup
- **[LOGIN_CREDENTIALS.md](./LOGIN_CREDENTIALS.md)** - Full list of seeded test accounts

## 🗂️ Project Structure

```
EDUCATION_ERP_PHASE-0/
├── unified_backend/          # Express.js Backend
│   ├── src/
│   │   ├── controllers/      # Route controllers
│   │   ├── services/         # Business logic
│   │   ├── repositories/     # Database queries
│   │   ├── routes/           # API routes
│   │   └── middleware/       # Auth, validation, etc.
│   └── uploads/              # User-uploaded files (git-ignored)
│
├── unified-frontend/         # React Native Frontend
│   ├── src/
│   │   ├── screens/          # Screen components (admin, hod, faculty)
│   │   ├── components/       # Reusable components
│   │   ├── services/         # API services
│   │   ├── hooks/            # Custom React hooks
│   │   ├── context/          # React Context (Auth, Theme)
│   │   └── navigation/       # Navigation configuration
│
└── database/                 # SQL schema and seeds
```

## 🌐 API Base URL Configuration

Set `EXPO_PUBLIC_API_URL` in `unified-frontend/.env`:

| Environment | URL |
|---|---|
| Android emulator | `http://10.0.2.2:5000/api` |
| iOS simulator / Web | `http://localhost:5000/api` |
| Physical device | `http://<your-LAN-IP>:5000/api` |

## 🔄 Database Migrations

The schema and seeds are applied **automatically on server start** via `src/config/dbBootstrap.js`. All migrations are idempotent (safe to re-run).

### Manual Database Reset

```bash
psql -U postgres -c "DROP DATABASE IF EXISTS education_erp;"
psql -U postgres -c "CREATE DATABASE education_erp;"
```

Then just start the backend (`npm run dev`) — `dbBootstrap.js` applies the schema, every file under `database/migrations/`, and the base seed automatically. To also get test HOD/Faculty logins, run `database/seed_faculty_users.sql` (and optionally `database/seed_test_data.sql`) afterward.

## 🐛 Troubleshooting

### Common Issues

**Backend won't start**: Check PostgreSQL is running and credentials in `.env`

**Frontend can't connect**: Verify `EXPO_PUBLIC_API_URL` points to backend

**Dependency conflicts**: Use `npm install --legacy-peer-deps` for frontend

## 🤝 Contributing

This is an educational project developed by SVCE ERP Team.

## 📄 License

Educational use only.

---

**Need help?** Check the Troubleshooting section above, or [LOGIN_CREDENTIALS.md](./LOGIN_CREDENTIALS.md) for test accounts.

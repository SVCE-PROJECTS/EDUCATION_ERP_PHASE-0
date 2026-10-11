# Education ERP System - Phase 0

A unified department ERP system with a shared PostgreSQL database and Express API backend, powering a React Native/Expo frontend that covers Admin, HOD, and Faculty portals.

## 📋 Quick Start

**For detailed setup instructions, dependencies, and troubleshooting, see [SETUP_GUIDE.md](./SETUP_GUIDE.md)**

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

After running database seeds:

- **Admin**: `ADMIN001` / `password123`
- **HOD**: `HOD001` / `password123`
- **Faculty**: `FAC001` / `password123`

## 📚 Documentation

- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Complete installation guide with dependencies
- **[ATTENDANCE_CHART_BUGS_FIXED.md](./ATTENDANCE_CHART_BUGS_FIXED.md)** - Attendance chart implementation details
- **[TASK_COMPLETION_REPORT.md](./TASK_COMPLETION_REPORT.md)** - Recent feature additions

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
├── database/                 # SQL schema and seeds
├── prisma/                   # Prisma ORM schema
└── SETUP_GUIDE.md           # Detailed setup instructions
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
psql -U postgres -d education_erp -f database/unified_schema.sql
psql -U postgres -d education_erp -f database/seed_faculty_users.sql
```

## 📊 Recent Updates

### Faculty Dashboard
- ✅ Class Attendance Chart with tooltips
- ✅ Click navigation to Attendance screen
- ✅ Real-time attendance statistics per class

### HOD Dashboard
- ✅ Department Attendance Chart (Semester × Section)
- ✅ Fixed data extraction from student list
- ✅ Skeleton rendering for empty states

### Backend
- ✅ New endpoint: `GET /api/attendance/class-statistics`
- ✅ Faculty-scoped attendance aggregation

## 🐛 Troubleshooting

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed troubleshooting steps.

### Common Issues

**Backend won't start**: Check PostgreSQL is running and credentials in `.env`

**Frontend can't connect**: Verify `EXPO_PUBLIC_API_URL` points to backend

**Dependency conflicts**: Use `npm install --legacy-peer-deps` for frontend

## 🤝 Contributing

This is an educational project developed by SVCE ERP Team.

## 📄 License

Educational use only.

---

**Need help?** Check [SETUP_GUIDE.md](./SETUP_GUIDE.md) for comprehensive documentation.

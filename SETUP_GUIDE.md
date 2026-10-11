# Education ERP - Setup Guide

## Prerequisites

Before running this project, ensure you have the following installed:

### Required Software
- **Node.js**: v18.x or higher ([Download](https://nodejs.org/))
- **npm**: v9.x or higher (comes with Node.js)
- **PostgreSQL**: v14.x or higher ([Download](https://www.postgresql.org/download/))
- **Git**: Latest version ([Download](https://git-scm.com/downloads))

### Recommended Tools
- **VS Code**: For code editing ([Download](https://code.visualstudio.com/))
- **Postman**: For API testing ([Download](https://www.postman.com/))
- **pgAdmin**: PostgreSQL GUI tool ([Download](https://www.pgadmin.org/))

---

## Project Structure

```
EDUCATION_ERP_PHASE-0/
├── unified_backend/          # Node.js Backend (Express + PostgreSQL)
├── unified-frontend/         # React Native Frontend (Expo)
├── database/                 # SQL schema and seed files
├── prisma/                   # Prisma ORM schema
└── documentation files       # .md files
```

---

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/Anushka5-code/MY_ERP.git
cd MY_ERP
```

### 2. Database Setup

#### Create PostgreSQL Database

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE education_erp;

# Exit psql
\q
```

#### Run Schema Migration

```bash
# Navigate to project root
cd EDUCATION_ERP_PHASE-0

# Run unified schema
psql -U postgres -d education_erp -f database/unified_schema.sql

# Run seed data (optional - creates test data)
psql -U postgres -d education_erp -f database/seed_faculty_users.sql
psql -U postgres -d education_erp -f database/seed_test_data.sql
```

### 3. Backend Setup

```bash
# Navigate to backend directory
cd unified_backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

#### Configure Backend Environment Variables

Edit `unified_backend/.env`:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres123
DB_NAME=education_erp

# JWT Secret (change this in production)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# CORS Configuration
CORS_ORIGIN=http://localhost:8081
```

#### Start Backend Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Backend will run on: **http://localhost:5000**

### 4. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd unified-frontend

# Install dependencies (use legacy peer deps flag)
npm install --legacy-peer-deps

# Create .env file
cp .env.example .env
```

#### Configure Frontend Environment Variables

Edit `unified-frontend/.env`:

```env
# Backend API URL
EXPO_PUBLIC_API_URL=http://localhost:5000/api

# Environment
EXPO_PUBLIC_ENV=development
```

#### Start Frontend Development Server

```bash
# Clear cache and start Expo
npx expo start --clear --web

# Or for specific platforms:
npx expo start --clear --android
npx expo start --clear --ios
npx expo start --clear --web
```

Frontend will run on: **http://localhost:8081**

---

## Default Login Credentials

After running seed scripts, you can login with:

### Admin Portal
- Username: `ADMIN001`
- Password: `password123`

### HOD Portal
- Username: `HOD001`
- Password: `password123`

### Faculty Portal
- Username: `FAC001`
- Password: `password123`

---

## Dependencies

### Backend Dependencies

```json
{
  "express": "^4.18.2",
  "pg": "^8.11.3",
  "bcryptjs": "^2.4.3",
  "jsonwebtoken": "^9.0.2",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "multer": "^1.4.5-lts.1",
  "express-validator": "^7.0.1",
  "winston": "^3.11.0",
  "helmet": "^7.1.0",
  "compression": "^1.7.4"
}
```

#### Dev Dependencies
```json
{
  "nodemon": "^3.0.2",
  "jest": "^29.7.0",
  "supertest": "^6.3.3"
}
```

### Frontend Dependencies

```json
{
  "expo": "~50.0.0",
  "react": "18.2.0",
  "react-native": "0.73.0",
  "react-native-web": "~0.19.6",
  "@react-navigation/native": "^6.1.9",
  "@react-navigation/stack": "^6.3.20",
  "@tanstack/react-query": "^5.17.19",
  "react-native-reanimated": "~3.6.2",
  "expo-linear-gradient": "~12.7.0",
  "axios": "^1.6.5"
}
```

---

## Troubleshooting

### Backend Issues

#### Port Already in Use
```bash
# Kill process on port 5000 (Windows)
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Kill process on port 5000 (Mac/Linux)
lsof -ti:5000 | xargs kill -9
```

#### Database Connection Error
- Verify PostgreSQL is running
- Check DB credentials in `.env`
- Ensure database `education_erp` exists
- Test connection: `psql -U postgres -d education_erp`

#### Module Not Found
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Frontend Issues

#### Expo Start Fails
```bash
# Clear Expo cache
npx expo start --clear

# Reset Metro bundler cache
npx expo start --reset-cache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

#### Cannot Connect to Backend
- Ensure backend is running on port 5000
- Check `EXPO_PUBLIC_API_URL` in `.env`
- Verify CORS settings in backend
- Check firewall settings

#### Peer Dependency Conflicts
```bash
# Always use legacy peer deps flag
npm install --legacy-peer-deps
```

---

## Running Tests

### Backend Tests
```bash
cd unified_backend
npm test
```

### Frontend Tests
```bash
cd unified-frontend
npm test
```

---

## Building for Production

### Backend
```bash
cd unified_backend
npm run build
npm start
```

### Frontend

#### Web Build
```bash
cd unified-frontend
npx expo export --platform web
```

#### Android Build
```bash
npx expo build:android
```

#### iOS Build
```bash
npx expo build:ios
```

---

## Database Migrations

### Reset Database
```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS education_erp;"
psql -U postgres -c "CREATE DATABASE education_erp;"

# Run schema
psql -U postgres -d education_erp -f database/unified_schema.sql

# Run seeds
psql -U postgres -d education_erp -f database/seed_faculty_users.sql
psql -U postgres -d education_erp -f database/seed_test_data.sql
```

### Backup Database
```bash
# Create backup
pg_dump -U postgres education_erp > backup.sql

# Restore backup
psql -U postgres -d education_erp < backup.sql
```

---

## Common Commands

### Backend
```bash
npm run dev          # Start development server
npm start            # Start production server
npm test             # Run tests
npm run lint         # Run ESLint
```

### Frontend
```bash
npx expo start --clear --web    # Start web dev server
npx expo start --clear          # Start with device selection
npm test                        # Run tests
npm run lint                    # Run ESLint
```

---

## Project Features

### Implemented Features
- ✅ Multi-portal system (Admin, HOD, Faculty)
- ✅ Role-based authentication and authorization
- ✅ Student management with attendance tracking
- ✅ Faculty allocation and management
- ✅ Assignment and IA marks management
- ✅ Department attendance analytics with charts
- ✅ Class-wise attendance tracking for faculty
- ✅ Activity and event management
- ✅ Real-time notifications
- ✅ Document upload and management
- ✅ Audit logging
- ✅ Export functionality (Excel, PDF)

### Charts & Analytics
- Faculty Dashboard: Weekly Attendance Trend + Class Attendance Chart
- HOD Dashboard: Department Attendance by Semester & Section
- Performance analytics and student tracking

---

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh token

### Faculty
- `GET /api/faculty/me` - Get logged-in faculty profile
- `GET /api/faculty/me/classes` - Get allocated classes
- `GET /api/attendance/class-statistics` - Get class attendance stats

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Mark single attendance
- `POST /api/attendance/bulk` - Mark bulk attendance

### Assignments
- `GET /api/assignments` - Get assignments
- `POST /api/assignments` - Create assignment
- `PUT /api/assignments/:id` - Update assignment
- `DELETE /api/assignments/:id` - Delete assignment

### IA Marks
- `GET /api/ia-marks` - Get IA marks
- `POST /api/ia-marks` - Create IA marks entry
- `PUT /api/ia-marks/:id` - Update IA marks

---

## Support

For issues or questions:
- Check the troubleshooting section above
- Review console logs for error messages
- Check browser Network tab for API errors
- Verify database has required data

---

## License

This project is for educational purposes.

---

## Contributors

Developed by SVCE ERP Team

---

Last Updated: October 2026

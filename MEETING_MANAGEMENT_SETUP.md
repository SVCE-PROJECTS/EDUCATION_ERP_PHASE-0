# Meeting Management Setup Guide

This document helps you set up and run the Meeting Management feature locally. The feature supports both online and offline meetings across Admin, HOD, and Faculty portals with role-based permissions and approval workflows.

## Overview

The Meeting Management system provides:
- **Online Meetings**: Video conferences with Jitsi integration and approval workflows
- **Offline Meetings**: In-person meetings with venue and availability management
- **Role-Based Access**: Admin, HOD, and Faculty permissions with appropriate approval chains
- **Three Portal Integration**: Consistent experience across Admin, HOD, and Faculty interfaces

## Prerequisites

Ensure you have the following installed:
- **Node.js** (≥18.0.0) - Check with `node --version`
- **npm** (comes with Node.js)
- **PostgreSQL** (≥12.0) - Running and accessible
- **Git** (to clone the repository)

## Database Setup

### 1. Create Database

The system uses PostgreSQL with database name `education_erp`:

```bash
# Option A: Using createdb command
createdb -U postgres education_erp

# Option B: Using psql
psql -U postgres -c "CREATE DATABASE education_erp;"
```

### 2. Verify Database Connection

Test your PostgreSQL connection:
```bash
psql -U postgres -d education_erp -c "SELECT version();"
```

## Environment Configuration

### Backend Configuration

1. **Copy environment template**:
   ```bash
   cd unified_backend
   cp .env.example .env
   ```

2. **Edit `.env` file** with your settings:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   CORS_ORIGIN=*

   # PostgreSQL Database
   PG_HOST=localhost
   PG_PORT=5432
   PG_DATABASE=education_erp
   PG_USER=postgres
   PG_PASSWORD=your_actual_password_here

   # Database URL (update password)
   DATABASE_URL="postgresql://postgres:your_actual_password_here@localhost:5432/education_erp"

   # JWT Configuration
   JWT_SECRET=change-this-to-a-long-random-secret
   JWT_EXPIRES_IN=8h

   # File Upload Settings
   UPLOAD_DIR=uploads
   MAX_PHOTO_SIZE=5242880
   MAX_DOCUMENT_SIZE=10485760
   BASE_URL=http://localhost:5000

   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX=200

   # Logging
   LOG_LEVEL=debug
   ENABLE_FILE_LOGS=false
   ```

   **⚠️ Important**: Replace `your_actual_password_here` with your actual PostgreSQL password.

### Frontend Configuration

1. **Copy environment template**:
   ```bash
   cd unified-frontend
   cp .env.example .env
   ```

2. **Edit `.env` file**:
   ```env
   EXPO_PUBLIC_API_URL=http://localhost:5000/api
   ```

## Database Migration and Initialization

### Automatic Setup (Recommended)

The backend automatically handles database initialization on startup:

1. **Install backend dependencies**:
   ```bash
   cd unified_backend
   npm install
   ```

2. **Start the backend** - This automatically:
   - Applies `database/unified_schema.sql`
   - Runs `database/migrations/add_meeting_management.sql`
   - Applies `database/unified_seed_empty.sql`
   - Creates admin user account
   ```bash
   npm start
   ```

   You should see:
   ```
   Database bootstrap completed successfully
   Server running on port 5000
   ```

### Manual Setup (Alternative)

If you prefer manual database setup, use these npm scripts:

```bash
cd unified_backend

# Create database structure
npm run db:schema

# Apply meeting management migration
psql -U postgres -d education_erp -f ../database/migrations/add_meeting_management.sql

# Add seed data
npm run db:seed
```

### ⚠️ Existing Database Safety

**The migration is safe to run on existing databases:**
- Uses `CREATE TABLE IF NOT EXISTS` - won't overwrite existing tables
- Uses `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` - won't break existing schemas
- No data is deleted or modified
- Can be run multiple times safely

**However, as a precaution:**
- Back up your database before running migrations
- Test in a development environment first
- The automatic bootstrap runs on every server start and is designed to be idempotent

## Run the Backend

```bash
cd unified_backend

# Install dependencies (if not done already)
npm install

# Start the backend server
npm start

# For development with auto-restart:
npm run dev
```

**Health Check**: Verify backend is running:
```bash
curl http://localhost:5000/health
```
Should return: `{"status":"OK","timestamp":"..."}`

## Run the Frontend

```bash
cd unified-frontend

# Install dependencies
npm install

# Start the development server (runs on port 8081)
npm run web
```

**Access the application**: Open http://localhost:8081 in your browser

## Verify the Setup

### 1. Check Health Endpoints

**Backend Health**:
```bash
curl http://localhost:5000/health
# Expected: {"status":"OK","timestamp":"..."}
```

**Database Connection**:
```bash
curl http://localhost:5000/api/health
# Expected: {"status":"OK","database":"connected","timestamp":"..."}
```

### 2. Test Login and Navigation

1. **Open frontend**: http://localhost:8081
2. **Login as Admin**:
   - Username: `admin`
   - Password: `Admin@123`
3. **Access Meeting Management**:
   - Click "Meeting Management" in the admin sidebar
   - Verify you can switch between "Online Meetings" and "Offline Meetings"
4. **Test Faculty Login** (see LOGIN_CREDENTIALS.md for faculty accounts):
   - Department: `CSE`
   - Username: `amit.patel`
   - Password: `Faculty@123`

### 3. Test Meeting Creation

1. **As Admin**: Create a meeting without approval requirements
2. **As Faculty**: Create a meeting that requires HOD approval
3. **Switch between Online and Offline** meeting types
4. **Verify role-based access** - faculty should only see department meetings

## Troubleshooting

### Database Connection Issues

**Error**: `database "education_erp" does not exist`
```bash
# Create the database
createdb -U postgres education_erp
```

**Error**: `password authentication failed`
- Verify your PostgreSQL password in `.env`
- Test connection: `psql -U postgres -d education_erp`
- Check PostgreSQL is running: `pg_isready`

**Error**: `relation "meetings" does not exist`
- The migration didn't run properly
- Check backend logs for bootstrap errors
- Try manual migration: `psql -U postgres -d education_erp -f database/migrations/add_meeting_management.sql`

### Environment Variable Issues

**Error**: `JWT_SECRET not configured`
- Edit `unified_backend/.env`
- Set `JWT_SECRET=your-long-random-string-here`

**Error**: `Cannot connect to API`
- Verify backend is running on port 5000
- Check `unified-frontend/.env` has correct `EXPO_PUBLIC_API_URL=http://localhost:5000/api`
- Check CORS settings in backend `.env`

### Migration Errors

**Error**: `duplicate key value violates unique constraint`
- This is normal when re-running migrations
- The bootstrap process handles this automatically

**Error**: `column "meeting_type" already exists`
- Migration was partially applied before
- Safe to ignore - the system uses `IF NOT EXISTS` patterns

### Authentication Issues

**Error**: `Authentication token missing`
- Clear browser storage/cookies
- Verify login credentials
- Check JWT configuration in backend `.env`

**Error**: `Access denied`
- Verify user role and department permissions
- Check that faculty users have proper department assignment

### Port Conflicts

**Error**: `Port 5000 is already in use`
```bash
# Find process using port 5000
netstat -ano | findstr :5000
# Kill the process or change PORT in .env
```

**Error**: `Port 8081 is already in use`
- Expo will offer alternative port (8082, 8083, etc.)
- Accept the alternative port when prompted

### Meeting Feature Issues

**Error**: Meeting screens show "filter is not defined"
- This was a previous issue that has been fixed
- Ensure you're on the latest version of the meeting management branch

**Error**: "Objects are not valid as React child"
- This rendering error has been resolved
- Clear browser cache and reload

**Error**: HTTP 500 when updating availability
- This FAC002/BIGINT issue has been fixed in the backend
- Restart the backend server to apply the fix

## Development Commands Reference

### Backend Commands
```bash
cd unified_backend

npm start              # Start production server
npm run dev           # Start with nodemon (development)
npm run db:create     # Create education_erp database
npm run db:schema     # Apply unified schema
npm run db:seed       # Apply seed data
npm run db:reset      # Full database reset (⚠️ destructive)
```

### Frontend Commands
```bash
cd unified-frontend

npm start             # Start Expo development server
npm run web           # Start web development (port 8081)
npm run android       # Start Android development
npm run ios           # Start iOS development
```

## Port Configuration

- **Backend**: http://localhost:5000
- **Frontend**: http://localhost:8081 (or next available port)
- **PostgreSQL**: localhost:5432 (default)

**Do not change these ports** without updating:
- Backend `.env` PORT setting
- Frontend `.env` EXPO_PUBLIC_API_URL setting
- Any hardcoded references in the codebase

## Default Login Credentials

After successful setup, use these accounts for testing:

**Admin Account**:
- Username: `admin`
- Password: `Admin@123`

**Faculty Accounts** (see LOGIN_CREDENTIALS.md for complete list):
- Department: `CSE`
- Username: `amit.patel`
- Password: `Faculty@123`

**HOD Account**:
- Department: `CSE`
- Username: `rajesh.kumar`
- Password: `Faculty@123`

## Next Steps

1. **Test the complete workflow**:
   - Create meetings as different user roles
   - Test approval workflows
   - Verify online/offline meeting functionality

2. **Explore the features**:
   - Meeting creation and editing
   - Participant management
   - Availability responses
   - Document uploads (if implemented)

3. **Review the implementation**:
   - Check `MEETING_MANAGEMENT_IMPLEMENTATION_COMPLETE.md`
   - Understand role-based permissions
   - Learn about the database schema

## Getting Help

If you encounter issues not covered in this guide:

1. **Check the logs**:
   - Backend: Console output from `npm start`
   - Frontend: Browser developer tools console
   - Database: PostgreSQL logs

2. **Verify the implementation**:
   - Ensure you're on the `feature/meeting-management` branch
   - Check that all files from the implementation are present

3. **Test with different browsers**:
   - The frontend is optimized for web browsers
   - Try Chrome, Firefox, or Safari if issues persist

---

**Last Updated**: October 2026
**Feature Branch**: `feature/meeting-management`
**Status**: ✅ Ready for Development
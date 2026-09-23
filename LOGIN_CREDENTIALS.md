# SVCE ERP - Login Credentials

## Database Setup Complete ✅

All seed files have been successfully run. The database now contains:
- 8 Roles (super_admin, admin, hod, faculty, and coordinators)
- 8 Departments (CSE, CSE-AI, CSE-DS, CSE-CY, ISE, ECE, CIVIL, MECHANICAL)
- 1 Admin user
- 8 Faculty users (including 4 HODs)

---

## 🔐 ADMIN PORTAL LOGIN

**URL:** http://localhost:5000/api (Backend) + Admin Frontend

**Credentials:**
```
Username: admin
Password: Admin@123
```

**Access Level:** Full system access - student registry management

---

## 👨‍🏫 FACULTY PORTAL LOGIN

**URL:** Faculty Frontend + Backend API

**Department Code Required:** CSE (or other department code)

### CSE Department Faculty:

#### HOD (Dr. Rajesh Kumar):
```
Department Code: CSE
Username: rajesh.kumar
Password: Faculty@123
Role: Professor & HOD
Coordinator: Timetable Coordinator
```

#### Associate Professor (Dr. Priya Sharma):
```
Department Code: CSE
Username: priya.sharma
Password: Faculty@123
Role: Associate Professor
Coordinator: Exam Coordinator
```

#### Assistant Professor (Prof. Amit Patel):
```
Department Code: CSE
Username: amit.patel
Password: Faculty@123
Role: Assistant Professor
```

#### Associate Professor (Dr. Sunita Reddy):
```
Department Code: CSE
Username: sunita.reddy
Password: Faculty@123
Role: Associate Professor
Coordinator: Placement Coordinator
```

#### Assistant Professor (Prof. Meera Singh):
```
Department Code: CSE
Username: meera.singh
Password: Faculty@123
Role: Assistant Professor
Coordinator: Cultural Coordinator
```

---

## 👔 HOD PORTAL LOGIN

**URL:** HOD Frontend + Backend API

**Department Codes and HODs:**

### CSE - Computer Science and Engineering
```
Department Code: CSE
Username: rajesh.kumar
Password: Faculty@123
HOD: Dr. Rajesh Kumar
```

### CSE-AI - Computer Science and Engineering - AI
```
Department Code: CSE-AI
Username: arvind.menon
Password: Faculty@123
HOD: Dr. Arvind Menon
```

### ECE - Electronics and Communication Engineering
```
Department Code: ECE
Username: lakshmi.iyer
Password: Faculty@123
HOD: Dr. Lakshmi Iyer
```

### ISE - Information Science and Engineering
```
Department Code: ISE
Username: venkat.rao
Password: Faculty@123
HOD: Dr. Venkat Rao
```

---

## 📊 Authentication Architecture

```
┌─────────────────────────────────────────────────────┐
│              PostgreSQL Database                     │
│              education_erp                           │
│                                                      │
│  Tables:                                            │
│  • users (admin accounts) → username + password     │
│  • faculty (faculty accounts) → dept + username +   │
│           password                                   │
│  • roles (defines access levels)                    │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│            Unified Backend :5000                     │
│                                                      │
│  Auth Endpoints:                                    │
│  • POST /api/auth/admin/login                       │
│    (username + password)                            │
│                                                      │
│  • POST /api/auth/faculty/login                     │
│    (departmentCode + username + password)           │
│                                                      │
│  • POST /api/auth/login (universal)                 │
│    (auto-detects based on departmentCode presence)  │
└─────────────────────────────────────────────────────┘
           ↓                ↓                ↓
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  ADMIN   │    │   HOD    │    │ FACULTY  │
    │  Portal  │    │  Portal  │    │  Portal  │
    └──────────┘    └──────────┘    └──────────┘
```

---

## 🔄 How Faculty/HOD Authentication Works

1. **Faculty Table is the Source:** 
   - Faculty/HOD users are stored in the `faculty` table, NOT in the `users` table
   - The `users` table is only for admin accounts

2. **Department Code is Required:**
   - Faculty login requires: `departmentCode` + `username` + `password`
   - This ensures faculty can only access their own department data

3. **HOD is a Faculty Member:**
   - HODs are faculty with `is_hod = TRUE` in the faculty table
   - The same faculty user can access both Faculty Portal and HOD Portal
   - Backend checks the `is_hod` flag to determine portal access rights

4. **Coordinator Roles:**
   - Some faculty have additional coordinator roles
   - Stored in `coordinator_roles` field (e.g., "timetable_coordinator", "exam_coordinator")
   - These roles grant additional permissions within the portal

---

## ✅ Testing Steps

### Test Admin Portal:
1. Open admin frontend
2. Login with `admin` / `Admin@123`
3. Verify dashboard loads

### Test Faculty Portal:
1. Open faculty frontend
2. Select Department: `CSE`
3. Enter username: `amit.patel`
4. Enter password: `Faculty@123`
5. Click Login
6. Verify faculty dashboard loads

### Test HOD Portal:
1. Open HOD frontend
2. Select Department: `CSE`
3. Enter username: `rajesh.kumar`
4. Enter password: `Faculty@123`
5. Click Login
6. Verify HOD dashboard loads with department-wide data

---

## 🐛 Troubleshooting

### "Invalid credentials" Error:
- ✅ **Fixed!** Faculty users now exist in database
- Verify you're using the correct department code
- Verify you're entering `Faculty@123` (case-sensitive)
- Check backend is running: http://localhost:5000/health

### Backend Not Connecting:
- Verify PostgreSQL is running
- Check .env file has correct database credentials
- Run: `npm start` in unified_backend folder

### Frontend Not Connecting to Backend:
- Check frontend API configuration points to http://localhost:5000
- Verify CORS_ORIGIN in backend .env allows frontend origin
- Check browser console for network errors

---

## 📝 Notes

- All passwords use bcrypt hashing (10 rounds)
- Default password for all faculty is `Faculty@123` - **CHANGE IN PRODUCTION!**
- JWT tokens expire in 8 hours (configurable in .env)
- The same backend and database serve all three portals
- Data entered in one portal is immediately available to others (with appropriate permissions)

---

## 🔧 Next Steps

1. ✅ Database seeded with users
2. ✅ Backend running and connected
3. ⏳ Test Faculty Portal login
4. ⏳ Fix any remaining API endpoint bugs
5. ⏳ Update Faculty Portal branding to "Welcome to Faculty"
6. ⏳ Add SVCE logo to all portals
7. ⏳ Implement data visualization charts
8. ⏳ Implement assignment allocation feature
9. ⏳ Connect and test HOD Portal
10. ⏳ Test all three portals with the same backend

---

**Last Updated:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Database:** education_erp
**Backend:** localhost:5000
**Status:** ✅ Ready for testing

# Faculty Portal

A React Native / Expo app for faculty members, built as an **isolated** portal alongside the existing `admin-frontend` and `hod-portal` apps. It shares the same `unified_backend` without modifying any existing code.

---

## Tech Stack

Identical to `hod-portal`:

| Concern | Library |
|---|---|
| Framework | React Native 0.76 + Expo ~54 |
| Language | TypeScript strict |
| Navigation | React Navigation v6 — Stack + Drawer |
| Server state | TanStack Query v5 |
| Forms | react-hook-form v7 |
| UI | react-native-paper v5 + custom components |
| HTTP | axios v1.7 |
| Auth storage | AsyncStorage (key: `faculty-erp-auth-v1`) |
| Icons | react-native-vector-icons (MaterialCommunityIcons) |
| Animations | react-native-reanimated |
| Gradients | expo-linear-gradient |

---

## Quick Start

```bash
cd faculty-portal
cp .env.example .env          # set EXPO_PUBLIC_API_URL
npm install
npm start                     # or: npm run android / ios / web
```

> Make sure `unified_backend` is running on the URL you configured in `.env`.

---

## Configuration

The **only** place you need to set the backend URL is `.env`:

```
EXPO_PUBLIC_API_URL=http://<your-backend-host>:5000/api
```

| Environment | URL |
|---|---|
| Android emulator | `http://10.0.2.2:5000/api` |
| iOS simulator / Web | `http://localhost:5000/api` |
| Physical device | `http://<your-LAN-IP>:5000/api` |
| Production | `https://your-api.example.com/api` |

No other files need editing to point at a different backend.

---

## How Authentication Works

1. Faculty open the app → **Login screen** (`POST /api/auth/faculty/login`).
2. On success the backend returns `{ faculty, token, isHOD }`.
3. `AuthContext` stores the JWT in `AsyncStorage` (key `faculty-erp-auth-v1`) and mirrors it in a module-level ref so the Axios interceptor can read it synchronously.
4. Every subsequent request carries `Authorization: Bearer <token>`.
5. A 401 response triggers automatic logout and redirect to the login screen.
6. `AuthContext` storage key is unique to this portal — it does not conflict with `dept-erp-auth-v3` (hod-portal) or `auth_token` (admin-frontend).

---

## Folder Structure

```
faculty-portal/
├── index.ts                    ← Expo entry (registerRootComponent)
├── app.json                    ← Expo config
├── .env.example                ← Environment variable template
└── src/
    ├── App.tsx                 ← Provider tree + RootNavigator
    ├── theme/
    │   ├── colors.ts           ← Design tokens (same palette as hod-portal)
    │   └── paperTheme.ts       ← Light/dark Paper themes
    ├── types/index.ts          ← Shared TypeScript types
    ├── navigation/
    │   ├── routes.ts           ← ROUTES constants + SCREEN_TITLES
    │   └── navigationRef.ts    ← Programmatic navigation (used by Axios interceptor)
    ├── context/
    │   ├── AuthContext.tsx     ← Auth state + persistence + authRef mirror
    │   └── ThemeContext.tsx    ← Light/dark toggle
    ├── services/
    │   ├── api.ts              ← Axios instance (baseURL, JWT interceptor, 401 handler)
    │   ├── toast.ts            ← Module-level toast queue consumed by SnackbarHost
    │   ├── auth.service.ts     ← /api/auth/* calls
    │   ├── faculty.service.ts  ← /api/faculty/:id + /api/dashboard/*
    │   └── academic.service.ts ← /api/assignments, /attendance, /ia-marks
    ├── hooks/
    │   ├── useDebounce.ts
    │   ├── useRBAC.ts
    │   ├── useAssignments.ts
    │   ├── useAttendance.ts
    │   └── useIAMarks.ts
    ├── layouts/
    │   ├── ScreenWrapper.tsx        ← Authenticated screen shell (Topbar + SafeArea + Scroll)
    │   └── FacultyDrawerContent.tsx ← Drawer sidebar
    ├── components/
    │   ├── icons.tsx               ← All icon components (MaterialCommunityIcons)
    │   ├── navigation/Topbar.tsx   ← Top bar with drawer toggle + profile dropdown
    │   └── ui/
    │       ├── Avatar.tsx
    │       ├── Badge.tsx           ← RoleBadge + StatusBadge
    │       ├── Button.tsx
    │       ├── SearchBar.tsx
    │       └── SnackbarHost.tsx    ← Toast renderer (consumes toast.ts queue)
    └── pages/
        ├── LoginPage.tsx
        ├── NotFound.tsx
        └── faculty/
            ├── Dashboard.tsx   ← Welcome + quick-action tiles
            ├── MyProfile.tsx   ← Faculty's own profile from /api/faculty/:id
            ├── Assignments.tsx ← CRUD via /api/assignments
            ├── Attendance.tsx  ← Mark + view via /api/attendance
            └── IAMarks.tsx     ← CRUD via /api/ia-marks
```

---

## Backend Integration

All calls go to the **existing** `unified_backend`. No backend files were modified.

| Feature | Endpoint |
|---|---|
| Login | `POST /api/auth/faculty/login` |
| Logout | `POST /api/auth/logout` |
| My profile | `GET /api/faculty/:id` |
| Dashboard stats | `GET /api/dashboard/stats` |
| Weekly attendance | `GET /api/dashboard/weekly-attendance` |
| Assignments list | `GET /api/assignments?semester=&section=&search=` |
| Create assignment | `POST /api/assignments` |
| Update assignment | `PUT /api/assignments/:id` |
| Delete assignment | `DELETE /api/assignments/:id` |
| Attendance records | `GET /api/attendance?subject=&date=` |
| Mark attendance | `POST /api/attendance` |
| Bulk attendance | `POST /api/attendance/bulk` |
| IA marks list | `GET /api/ia-marks?subject=&semester=` |
| Add IA marks | `POST /api/ia-marks` |
| Update IA marks | `PUT /api/ia-marks/:id` |
| Delete IA marks | `DELETE /api/ia-marks/:id` |

---

## Isolation Guarantee

- **No file in `admin-frontend/` or `hod-portal/` was modified.**
- AsyncStorage key `faculty-erp-auth-v1` is unique — sessions do not bleed between portals.
- No shared npm workspace or symlinks — each portal installs its own `node_modules`.
- The faculty portal reads from the same backend routes that were already there; it adds zero new routes or schema changes.

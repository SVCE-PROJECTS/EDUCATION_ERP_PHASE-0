// @ts-nocheck
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

// ── Portal URLs ───────────────────────────────────────────────────────────────
// Each portal runs on its own port. The unified login passes the JWT token
// as a query param so the portal can auto-authenticate without re-login.
const PORTAL_URLS = {
  admin:   'http://localhost:8082',
  hod:     'http://localhost:8083',
  faculty: 'http://localhost:8084',
};

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  navy:      '#0F2044',
  navyLight: '#1E3A5F',
  white:     '#FFFFFF',
  slate50:   '#F8FAFC',
  slate100:  '#F1F5F9',
  slate200:  '#E2E8F0',
  slate400:  '#94A3B8',
  slate500:  '#64748B',
  slate700:  '#334155',
  admin:     '#7C3AED',
  hod:       '#0891B2',
  faculty:   '#059669',
};

const ROLE_META = {
  admin:   { label: 'Administrator',  color: C.admin,   icon: '🛡️',  bg: '#F5F3FF', border: '#DDD6FE' },
  hod:     { label: 'Department HOD', color: C.hod,     icon: '🏛️',  bg: '#ECFEFF', border: '#A5F3FC' },
  faculty: { label: 'Faculty Member', color: C.faculty, icon: '👨‍🏫', bg: '#ECFDF5', border: '#A7F3D0' },
};

const PORTAL_LINKS = {
  admin: [
    { icon: '📊', label: 'Dashboard',           route: '/' },
    { icon: '👥', label: 'Student Registry',    route: '/StudentList' },
    { icon: '🔄', label: 'Transfer Students',   route: '/TransferStudent' },
    { icon: '💳', label: 'Fee Management',      route: '/Fee' },
    { icon: '📁', label: 'Export Data',         route: '/ExportStudentData' },
    { icon: '⚙️',  label: 'Settings',           route: '/Settings' },
  ],
  hod: [
    { icon: '📊', label: 'HOD Dashboard',       route: '/' },
    { icon: '👨‍🏫', label: 'Faculty Management',  route: '/HODFaculty' },
    { icon: '👥', label: 'Student Management',  route: '/HODStudents' },
    { icon: '📋', label: 'Coordinator Roles',   route: '/HODCoordinators' },
    { icon: '📅', label: 'Faculty Allocation',  route: '/HODFacultyAllocation' },
    { icon: '🗒️', label: 'Activity Log',        route: '/HODActivityLog' },
  ],
  faculty: [
    { icon: '📊', label: 'My Dashboard',        route: '/' },
    { icon: '📝', label: 'Assignments',         route: '/Assignments' },
    { icon: '✅', label: 'Attendance',          route: '/Attendance' },
    { icon: '📈', label: 'IA Marks',            route: '/IAMarks' },
    { icon: '👤', label: 'My Profile',          route: '/MyProfile' },
  ],
};

// ── Open portal in browser ────────────────────────────────────────────────────
function openPortal(role: string, token: string, route = '/') {
  const base = PORTAL_URLS[role];
  if (!base) return;
  // Pass token as query param so the portal can pick it up and skip login
  const url = `${base}?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(route)}`;
  if (Platform.OS === 'web') {
    window.open(url, '_blank');
  } else {
    Linking.openURL(url);
  }
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function PortalDashboard() {
  const { user, token, logout } = useAuth();
  const { width } = useWindowDimensions();
  const isWide = width >= 720;

  const role    = user?.role ?? 'faculty';
  const meta    = ROLE_META[role] ?? ROLE_META.faculty;
  const links   = PORTAL_LINKS[role] ?? [];
  const name    = user?.fullName ?? user?.name ?? user?.username ?? 'User';
  const dept    = user?.departmentCode ? ` · ${user.departmentCode}` : '';

  return (
    <View style={d.root}>
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <View style={[d.topbar, { backgroundColor: C.navy }]}>
        <View style={{ flex: 1 }}>
          <Text style={d.topbarTitle}>SVCE ERP · Unified Portal</Text>
          <Text style={d.topbarSub}>{meta.icon}  {meta.label}{dept}</Text>
        </View>
        <TouchableOpacity
          style={[d.launchBtn, { backgroundColor: meta.color }]}
          onPress={() => openPortal(role, token)}
          activeOpacity={0.8}
        >
          <Text style={d.launchText}>Open Full Portal ↗</Text>
        </TouchableOpacity>
        <TouchableOpacity style={d.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <Text style={d.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={d.scroll} showsVerticalScrollIndicator={false}>
        {/* Welcome banner */}
        <View style={[d.welcomeBanner, { backgroundColor: meta.bg, borderColor: meta.border }]}>
          <Text style={d.welcomeIcon}>{meta.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[d.welcomeTitle, { color: meta.color }]}>
              Welcome back, {name.split(' ').slice(0, 2).join(' ')}
            </Text>
            <Text style={d.welcomeSub}>
              Signed in as <Text style={{ fontWeight: '700' }}>{meta.label}</Text>.
              Click any module to open it in the full portal.
            </Text>
          </View>
        </View>

        {/* Module grid */}
        <Text style={d.sectionTitle}>PORTAL MODULES</Text>
        <View style={[d.grid, isWide && d.gridWide]}>
          {links.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[d.moduleCard, isWide && d.moduleCardWide, { borderColor: meta.border }]}
              activeOpacity={0.75}
              onPress={() => openPortal(role, token, item.route)}
            >
              <View style={[d.moduleIconWrap, { backgroundColor: meta.bg }]}>
                <Text style={d.moduleIcon}>{item.icon}</Text>
              </View>
              <Text style={[d.moduleLabel, { color: meta.color }]}>{item.label}</Text>
              <Text style={d.moduleArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info note */}
        <View style={[d.infoBox, { borderLeftColor: meta.color }]}>
          <Text style={d.infoTitle}>How it works</Text>
          <Text style={d.infoText}>
            This unified portal handles login for all roles. Clicking a module opens the full portal in a new tab on its dedicated port ({PORTAL_URLS[role]}). Make sure that portal is running.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const d = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.slate50 },

  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingTop: 50,
  },
  topbarTitle: { fontSize: 15, fontWeight: '700', color: C.white },
  topbarSub:   { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  launchBtn: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  launchText: { fontSize: 12, fontWeight: '700', color: C.white },

  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  logoutText: { fontSize: 12, fontWeight: '600', color: C.white },

  scroll: { padding: 16, paddingBottom: 48 },

  welcomeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 18,
    marginBottom: 24,
  },
  welcomeIcon:  { fontSize: 36 },
  welcomeTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  welcomeSub:   { fontSize: 13, color: C.slate500, lineHeight: 19 },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: C.slate400,
    letterSpacing: 1,
    marginBottom: 12,
  },

  grid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridWide: { gap: 14 },

  moduleCard: {
    width: '47%',
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  moduleCardWide: { width: '31%' },
  moduleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  moduleIcon:  { fontSize: 20 },
  moduleLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
  moduleArrow: { fontSize: 16, color: C.slate400 },

  infoBox: {
    marginTop: 24,
    backgroundColor: C.white,
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  infoTitle: { fontSize: 13, fontWeight: '700', color: C.slate700, marginBottom: 6 },
  infoText:  { fontSize: 12, color: C.slate500, lineHeight: 18 },
});

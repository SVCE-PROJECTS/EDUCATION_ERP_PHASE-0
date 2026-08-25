import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import Colors from '../../theme/colors';

interface MenuItem {
  title: string;
  path: string;
  icon: string;
  activeIcon: string;
}

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
}

const menuItems: MenuItem[] = [
  { title: 'Dashboard',   path: '/dashboard',   icon: 'home-outline',          activeIcon: 'home' },
  { title: 'Students',    path: '/students',    icon: 'people-outline',        activeIcon: 'people' },
  { title: 'Attendance',  path: '/attendance',  icon: 'checkbox-outline',      activeIcon: 'checkbox' },
  { title: 'Assignments', path: '/assignments', icon: 'book-outline',          activeIcon: 'book' },
  { title: 'IA Marks',    path: '/iamarks',     icon: 'bar-chart-outline',     activeIcon: 'bar-chart' },
  { title: 'Timetable',   path: '/timetable',   icon: 'calendar-outline',      activeIcon: 'calendar' },
  { title: 'AI Checker',  path: '/aichecker',   icon: 'hardware-chip-outline', activeIcon: 'hardware-chip' },
  { title: 'Profile',     path: '/profile',     icon: 'person-outline',        activeIcon: 'person' },
];

export default function Sidebar({ visible, onClose }: SidebarProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const insets   = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const navigate = (path: string) => { onClose(); router.push(path as any); };

  const handleLogout = () => {
    onClose();
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.drawer, { paddingTop: insets.top > 0 ? insets.top : 44 }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>🎓 Student ERP</Text>
            <Text style={styles.facultyName}>{user?.name ?? 'Faculty'}</Text>
            <Text style={styles.facultyRole}>{user?.designation ?? 'Faculty'} — {user?.department?.split(' ')[0] ?? 'CSE'} Dept</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.menu} showsVerticalScrollIndicator={false}>
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <TouchableOpacity
                key={item.path}
                style={[styles.menuItem, isActive && styles.menuItemActive]}
                onPress={() => navigate(item.path)}
              >
                <Ionicons
                  name={(isActive ? item.activeIcon : item.icon) as any}
                  size={20}
                  color={Colors.white}
                  style={styles.menuIcon}
                />
                <Text style={styles.menuText}>{item.title}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity
          style={[styles.logoutBtn, { marginBottom: insets.bottom > 0 ? insets.bottom : 16 }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.white} style={styles.menuIcon} />
          <Text style={styles.menuText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  drawer:   { position: 'absolute', top: 0, left: 0, bottom: 0, width: 270, backgroundColor: Colors.sidebarBg, paddingBottom: 20 },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.15)' },
  logo:         { fontSize: 20, fontWeight: '700', color: Colors.white },
  facultyName:  { fontSize: 14, fontWeight: '700', color: Colors.white, marginTop: 4 },
  facultyRole:  { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  menu:         { flex: 1, paddingTop: 12, paddingHorizontal: 12 },
  menuItem:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14, borderRadius: 10, marginBottom: 6 },
  menuItemActive:{ backgroundColor: Colors.sidebarActive },
  menuIcon:     { marginRight: 12 },
  menuText:     { color: Colors.white, fontSize: 15, fontWeight: '500' },
  logoutBtn:    { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, paddingVertical: 13, paddingHorizontal: 14, borderRadius: 10, backgroundColor: Colors.danger },
});

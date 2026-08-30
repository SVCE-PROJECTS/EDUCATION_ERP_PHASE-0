import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Home, ArrowLeft } from '../components/icons';
import Button from '../components/ui/Button';
import { colors, neutral } from '../theme/colors';
import { ROUTES } from '../navigation/routes';

export default function NotFoundScreen() {
  const navigation = useNavigation<any>();
  const { isAuthenticated, user } = useAuth();

  const handleHome = () => {
    if (isAuthenticated && user?.isHOD) {
      navigation.navigate(ROUTES.HOD_DASHBOARD);
    } else {
      navigation.navigate(ROUTES.LOGIN);
    }
  };

  return (
    <View style={s.root}>
      <Text style={s.giant}>404</Text>
      <Text style={s.heading}>Page not found</Text>
      <Text style={s.body}>The page you're looking for doesn't exist or has been moved.</Text>

      <View style={s.btnRow}>
        <Button variant="outline" onPress={() => navigation.goBack()}>
          <View style={s.btnInner}>
            <ArrowLeft size={16} color={neutral[700]} />
            <Text style={s.btnOutlineText}>Go Back</Text>
          </View>
        </Button>

        <Button onPress={handleHome}>
          <View style={s.btnInner}>
            <Home size={16} color={colors.white} />
            <Text style={s.btnText}>{isAuthenticated ? 'Dashboard' : 'Login'}</Text>
          </View>
        </Button>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: neutral[50],
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  giant: {
    fontSize: 120,
    fontWeight: '800',
    color: neutral[100],
    lineHeight: 130,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: neutral[900],
    marginTop: -12,
  },
  body: {
    fontSize: 14,
    color: neutral[500],
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 280,
    lineHeight: 20,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  btnOutlineText: {
    fontSize: 13,
    fontWeight: '600',
    color: neutral[700],
  },
});

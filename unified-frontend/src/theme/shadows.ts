// @ts-nocheck
import { Platform } from 'react-native';

// react-native-web ignores the native shadow* props, so every level needs a
// parallel boxShadow for the elevation to actually render on web (where this
// app spends most of its life).
export const shadows = {
  soft: Platform.select({
    web: { boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 4px 14px rgba(15,23,42,0.05)' },
    default: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
  }),
  card: Platform.select({
    web: { boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 10px 28px rgba(15,23,42,0.07)' },
    default: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    },
  }),
  raised: Platform.select({
    web: { boxShadow: '0 4px 10px rgba(37,99,235,0.18), 0 12px 32px rgba(37,99,235,0.12)' },
    default: {
      shadowColor: '#1D4ED8',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 18,
      elevation: 6,
    },
  }),
  button: Platform.select({
    web: { boxShadow: '0 2px 8px rgba(37,99,235,0.28)' },
    default: {
      shadowColor: '#1D4ED8',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.28,
      shadowRadius: 6,
      elevation: 4,
    },
  }),
};

export default shadows;

/**
 * index.tsx — Root redirect
 *
 * The root "/" route is not user-facing. The root _layout.tsx handles
 * navigation based on auth state (authenticated → dashboard, not → login).
 * This file exists only to satisfy Expo Router's file-based routing.
 *
 * The home components (Hero, Stats, Features) in src/components/home/ are
 * currently unreachable from the authenticated app. They are kept in place
 * in case a public landing page is added in the future.
 */
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/login" />;
}

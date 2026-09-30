import { createNavigationContainerRef } from '@react-navigation/native';

/**
 * A ref to the NavigationContainer.
 * Used outside React components (e.g. the axios 401 interceptor).
 */
export const navigationRef = createNavigationContainerRef();

export function navigate(name: string, params?: object): void {
  if (navigationRef.isReady()) {
    // @ts-expect-error — dynamic route name
    navigationRef.navigate(name, params);
  }
}

/** Reset to Login after a 401 — called from api.ts interceptor. */
export function resetToLogin(): void {
  if (navigationRef.isReady()) {
    navigationRef.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  }
}

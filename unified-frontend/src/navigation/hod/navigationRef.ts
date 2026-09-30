import { createNavigationContainerRef } from '@react-navigation/native';

/**
 * A ref to the NavigationContainer.
 * Use this anywhere outside a component (e.g. api.js interceptors)
 * to call navigation.reset() or navigation.navigate().
 */
export const navigationRef = createNavigationContainerRef();

/**
 * Navigate programmatically from outside React tree.
 */
export function navigate(name: string, params?: object): void {
  if (navigationRef.isReady()) {
    // @ts-expect-error — screen names are dynamic strings from ROUTES
    navigationRef.navigate(name, params);
  }
}

/**
 * Reset the navigation stack — used to redirect to Login after 401.
 */
export function resetToLogin(): void {
  if (navigationRef.isReady()) {
    navigationRef.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  }
}

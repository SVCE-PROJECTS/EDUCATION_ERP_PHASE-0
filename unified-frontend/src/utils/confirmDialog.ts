/**
 * confirmDialog.ts
 *
 * Cross-platform alert/confirm helpers.
 *
 * Problem: Alert.alert() with a buttons array is a no-op on react-native-web —
 * the destructive callback is never invoked, so deletes / saves silently fail.
 *
 * Solution:
 *  - On web  → window.confirm() / window.alert()  (synchronous, always works)
 *  - On native → Alert.alert()  (asynchronous, buttons array)
 */

import { Alert, Platform } from 'react-native';

/**
 * Show a confirmation dialog for a destructive action (e.g. Delete).
 * Calls onConfirm() only when the user presses the confirm button.
 */
export function confirmDelete(
  title: string,
  message: string,
  onConfirm: () => void,
): void {
  if (Platform.OS === 'web') {
    // window.confirm returns true/false synchronously
    const ok = window.confirm(`${title}\n\n${message}`);
    if (ok) onConfirm();
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

/**
 * Show an error alert.
 */
export function showError(title: string, message: string): void {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
}

/**
 * Generic confirm with custom button label (for non-destructive confirmations).
 */
export function confirmAction(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void,
): void {
  if (Platform.OS === 'web') {
    const ok = window.confirm(`${title}\n\n${message}`);
    if (ok) onConfirm();
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, onPress: onConfirm },
  ]);
}

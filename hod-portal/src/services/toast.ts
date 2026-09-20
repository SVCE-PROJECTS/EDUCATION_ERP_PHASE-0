// Replaces react-native-toast-message. Renders via React Native Paper's
// Snackbar (see components/ui/SnackbarHost.tsx, mounted once in App.tsx),
// but keeps the same imperative `Toast.show({ type, text1, text2 })` shape
// so existing call sites don't need to change — including calls made
// outside a component (e.g. the axios interceptor in services/api.ts),
// which is why this is a plain listener/singleton rather than a hook.

export type ToastType = 'success' | 'error' | 'info';

export interface ToastOptions {
  type?: ToastType;
  text1?: string;
  text2?: string;
  visibilityTime?: number;
  autoHide?: boolean;
}

type Listener = (opts: ToastOptions | null) => void;

let listener: Listener | null = null;

export function _registerToastListener(fn: Listener | null) {
  listener = fn;
}

export function showToast(opts: ToastOptions) {
  if (listener) listener(opts);
}

export function hideToast() {
  if (listener) listener(null);
}

// Default export mimics react-native-toast-message's `Toast.show(...)` /
// `Toast.hide()` API so `import Toast from '.../toast'; Toast.show({...})`
// works exactly like before.
const Toast = { show: showToast, hide: hideToast };
export default Toast;

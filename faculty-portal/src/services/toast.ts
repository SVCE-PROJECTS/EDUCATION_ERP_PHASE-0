/**
 * Faculty Portal — Toast service shim.
 * Module-level queue so api.ts and hooks can call Toast.show()
 * without being inside a React component.
 * <SnackbarHost /> registers via _registerToastListener and renders the UI.
 */

export type ToastType = 'success' | 'error' | 'info';

export interface ToastOptions {
  type?: ToastType;
  text1: string;
  text2?: string;
  visibilityTime?: number;
  autoHide?: boolean;
}

type Listener = ((opts: ToastOptions | null) => void) | null;

let _listener: Listener = null;

export function _registerToastListener(fn: Listener): void {
  _listener = fn;
}

const Toast = {
  show(opts: ToastOptions): void {
    _listener?.(opts);
  },
};

export default Toast;

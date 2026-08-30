/**
 * authErrorBus — breaks the circular dependency:
 *   AuthContext → authApi → axiosInstance → AuthContext
 *
 * Instead of importing AuthContext inside axiosInstance, axiosInstance
 * calls the handler registered here. AuthContext registers its handler
 * on mount. No circular import.
 */

type Handler = (message: string) => void;

let _handler: Handler | null = null;

export function registerAuthErrorHandler(fn: Handler): void {
  _handler = fn;
}

export function unregisterAuthErrorHandler(): void {
  _handler = null;
}

export function callAuthErrorHandler(message: string): void {
  _handler?.(message);
}

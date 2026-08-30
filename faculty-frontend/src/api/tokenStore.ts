/**
 * Module-level token store — not React state — so the axios request
 * interceptor can read the current token synchronously without importing
 * React / context.  AuthContext is the only caller of setToken().
 */
let currentToken: string | null = null;

export const setToken = (token: string | null): void => {
  currentToken = token;
};

export const getToken = (): string | null => currentToken;

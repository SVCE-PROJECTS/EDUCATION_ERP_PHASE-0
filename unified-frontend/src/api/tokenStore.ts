// @ts-nocheck
// Plain module-level store (not React state) so the axios request interceptor
// can read the current token synchronously without importing React/context.
// AuthContext is the only thing that calls setToken(); everything else reads.
//
// logoutHandler lives here (rather than importing AuthContext directly into
// axiosInstance.ts) to avoid a circular import: AuthContext -> authService ->
// axiosInstance. This mirrors hod-portal/faculty-portal's
// getAuthToken()/logoutFromOutsideReact() pattern for handling 401s outside React.
let currentToken = null;
let logoutHandler = () => {};

export const setToken = (token) => {
  currentToken = token;
};

export const getToken = () => currentToken;

export const setLogoutHandler = (fn) => {
  logoutHandler = fn;
};

export const triggerLogout = () => logoutHandler();

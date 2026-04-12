export const msalConfig = {
  auth: {
    clientId:             import.meta.env.VITE_ENTRA_CLIENT_ID,
    authority:            `https://login.microsoftonline.com/${import.meta.env.VITE_ENTRA_TENANT_ID}`,
    redirectUri:          window.location.origin,
    postLogoutRedirectUri: window.location.origin,
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation:          'sessionStorage',
    storeAuthStateInCookie: false,
  },
}

// Scopes used for getting the ID token
export const loginRequest = {
  scopes: ['openid', 'profile'],
}

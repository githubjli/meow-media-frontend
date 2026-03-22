const ACCESS_TOKEN_KEY = 'media_stream_access_token';
const REFRESH_TOKEN_KEY = 'media_stream_refresh_token';

export type AuthTokens = {
  access: string;
  refresh: string;
};

export const getAccessToken = () =>
  localStorage.getItem(ACCESS_TOKEN_KEY) || '';

export const getRefreshToken = () =>
  localStorage.getItem(REFRESH_TOKEN_KEY) || '';

export const getStoredTokens = (): AuthTokens | null => {
  const access = getAccessToken();
  const refresh = getRefreshToken();

  if (!access || !refresh) {
    return null;
  }

  return { access, refresh };
};

export const setStoredTokens = ({ access, refresh }: AuthTokens) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
};

export const clearStoredTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

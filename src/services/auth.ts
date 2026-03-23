import {
  clearStoredTokens,
  getAccessToken,
  getRefreshToken,
  setStoredTokens,
} from '@/utils/auth';

export type AuthTokens = {
  access: string;
  refresh: string;
};

export type CurrentUser = {
  id?: number | string;
  email: string;
  username?: string;
  [key: string]: any;
};

export type AuthResponse = Partial<AuthTokens> & {
  user?: CurrentUser;
  detail?: string;
  message?: string;
  non_field_errors?: string[];
  email?: string[];
  password?: string[];
};

const API_BASE_URL =
  process.env.UMI_APP_API_BASE_URL || process.env.REACT_APP_API_BASE_URL || '';

const buildUrl = (path: string) => `${API_BASE_URL}${path}`;

const getErrorMessage = async (response: Response) => {
  try {
    const data = await response.json();
    return (
      data?.detail ||
      data?.message ||
      data?.non_field_errors?.[0] ||
      data?.email?.[0] ||
      data?.password?.[0] ||
      'Request failed.'
    );
  } catch (error) {
    return 'Request failed.';
  }
};

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(buildUrl(path), {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export async function loginWithEmail(payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return requestJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function registerWithEmail(payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return requestJson('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function refreshAccessToken(
  refresh: string,
): Promise<AuthResponse> {
  return requestJson('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh }),
  });
}

export async function getCurrentUser(access: string): Promise<CurrentUser> {
  return requestJson('/api/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${access}`,
    },
  });
}

export const resolveCurrentUser = async (): Promise<CurrentUser | null> => {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  if (!accessToken) {
    return null;
  }

  try {
    return await getCurrentUser(accessToken);
  } catch (error) {
    if (!refreshToken) {
      clearStoredTokens();
      return null;
    }

    try {
      const refreshed = await refreshAccessToken(refreshToken);

      if (!refreshed.access) {
        clearStoredTokens();
        return null;
      }

      setStoredTokens({
        access: refreshed.access,
        refresh: refreshed.refresh || refreshToken,
      });

      return await getCurrentUser(refreshed.access);
    } catch (refreshError) {
      clearStoredTokens();
      return null;
    }
  }
};

export const getValidAccessToken = async (): Promise<string> => {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  if (!accessToken) {
    throw new Error('Please log in to continue.');
  }

  try {
    await getCurrentUser(accessToken);
    return accessToken;
  } catch (error) {
    if (!refreshToken) {
      clearStoredTokens();
      throw new Error('Please log in to continue.');
    }

    const refreshed = await refreshAccessToken(refreshToken);

    if (!refreshed.access) {
      clearStoredTokens();
      throw new Error('Please log in to continue.');
    }

    setStoredTokens({
      access: refreshed.access,
      refresh: refreshed.refresh || refreshToken,
    });

    return refreshed.access;
  }
};

export { API_BASE_URL, buildUrl, requestJson };

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authAPI, errorMessage, tokenStore } from '../services/api';

const AuthContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // Only show the loading screen when there is a stored token to verify.
  const [loading, setLoading] = useState(() => !!tokenStore.get());

  useEffect(() => {
    if (!tokenStore.get()) return;
    let active = true;
    authAPI
      .getMe()
      .then((res) => active && setUser(res.data))
      .catch(() => {
        tokenStore.clear();
        if (active) setUser(null);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const { data } = await authAPI.login({ email, password });
      tokenStore.set(data.token);
      setUser(data.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: errorMessage(error, 'Login failed') };
    }
  }, []);

  const register = useCallback(async (name, email, password, fieldOfStudy) => {
    try {
      const { data } = await authAPI.register({ name, email, password, fieldOfStudy });
      tokenStore.set(data.token);
      setUser(data.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: errorMessage(error, 'Registration failed') };
    }
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  // Keep the sidebar name/field in sync after the profile is edited in Settings.
  const patchUser = useCallback((fields) => {
    setUser((prev) => (prev ? { ...prev, ...fields } : prev));
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, patchUser }),
    [user, loading, login, register, logout, patchUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

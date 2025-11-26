import { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Synchronize user state with localStorage
  const syncUserState = (userData) => {
    if (!userData) {
      localStorage.removeItem('user');
      setUser(null);
      return null;
    }

    const normalizedUser = {
      id: userData.user_id ?? userData.id,
      full_name: userData.full_name ?? userData.name,
      name: userData.full_name ?? userData.name,
      email: userData.email,
      role: userData.role,
      created_at: userData.created_at,
      backup_code: userData.backup_code ?? null,
      code_generation_timestamp: userData.code_generation_timestamp ?? null
    };

    if (normalizedUser.id !== undefined && normalizedUser.id !== null) {
      normalizedUser.id = Number(normalizedUser.id);
    }

    localStorage.setItem('user', JSON.stringify(normalizedUser));
    setUser(normalizedUser);
    return normalizedUser;
  };

  const initAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (!token && !storedUser) {
        localStorage.clear();
        setUser(null);
        return;
      }

      if (token) {
        try {
          const response = await authService.getProfile();
          if (response?.data) {
            syncUserState(response.data);
          } else if (storedUser) {
            // fallback to stored user
            syncUserState(JSON.parse(storedUser));
          } else {
            // no profile and no stored user -> clear
            localStorage.clear();
            setUser(null);
          }
        } catch (err) {
          console.error('Profile validation failed:', err);
          if (err.response?.status === 401 || err.response?.status === 403) {
            localStorage.clear();
            setUser(null);
            // redirect to login to force re-auth
            window.location.href = '/login';
            return;
          }
          if (storedUser) {
            syncUserState(JSON.parse(storedUser));
          }
        }
      } else if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          syncUserState(parsedUser);
          // try to refresh in background
          await refreshProfile();
        } catch (err) {
          console.error('Failed to restore stored user:', err);
          localStorage.clear();
          setUser(null);
        }
      }
    } catch (err) {
      console.error('Auth initialization error:', err);
      localStorage.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email, password) => {
    try {
      // Clear existing state
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);

      const data = await authService.login(email, password);

      // Prefer server-sent user object; fallback to localStorage
      const token = data?.token || localStorage.getItem('token');
      const userPayload = data?.user || JSON.parse(localStorage.getItem('user') || 'null');

      if (token) {
        if (userPayload) {
          syncUserState(userPayload);
        }
        localStorage.setItem('token', token);
        return data;
      }

      throw new Error('Invalid login response');
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      throw error.response?.data || error;
    }
  };

  const register = async (userData) => {
    try {
      const data = await authService.register(userData);
      const token = data?.token || localStorage.getItem('token');
      const userPayload = data?.user || JSON.parse(localStorage.getItem('user') || 'null');
      if (token) {
        if (userPayload) syncUserState(userPayload);
        localStorage.setItem('token', token);
      }
      return data;
    } catch (error) {
      throw error.response?.data || error;
    }
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    window.location.href = '/login';
  };

  const refreshProfile = async () => {
    try {
      const response = await authService.getProfile();
      if (response?.data) {
        return syncUserState(response.data);
      }
      return null;
    } catch (err) {
      console.error('Failed to refresh profile', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.clear();
        setUser(null);
        window.location.href = '/login';
      }
      return null;
    }
  };

  // Expose synchronization function for other components to update user state
  const setUserState = (userData) => syncUserState(userData);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, refreshProfile, setUserState }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
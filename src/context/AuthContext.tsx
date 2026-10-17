import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { INITIAL_USERS } from '../data/mockData';
import { api } from '../services/api';

interface AuthContextType {
  currentUser: User;
  users: User[];
  role: UserRole;
  isAuthenticated: boolean;
  switchRole: (role: UserRole) => void;
  loginAs: (userId: string) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  register: (userData: { name: string; email: string; password: string; role: UserRole; company?: string }) => Promise<{ success: boolean; error?: string; user?: User }>;
  updateCurrentUser: (data: Partial<User>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_USER = 'techrescue_auth_user';
const STORAGE_KEY_TOKEN = 'techrescue_auth_token';
const STORAGE_KEY_AUTH = 'techrescue_is_authenticated';

const GUEST_USER: User = {
  id: 'usr-guest',
  name: 'Guest User',
  email: 'guest@techrescue.io',
  role: 'CLIENT',
  company: 'Unauthenticated Session',
  rating: 5.0,
  reviewsCount: 0,
  hourlyRate: 0,
  experienceYears: 0,
  verified: false,
  isAvailable: false,
  completedJobsCount: 0,
  totalEarnings: 0
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('techrescue_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  // Track explicit authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY_AUTH) === 'true';
  });

  const [activeUser, setActiveUser] = useState<User | null>(() => {
    const isAuth = localStorage.getItem(STORAGE_KEY_AUTH) === 'true';
    if (!isAuth) return null;
    const saved = localStorage.getItem(STORAGE_KEY_USER);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Ensure currentUser is always defined as a User for type safety
  const currentUser: User = activeUser || GUEST_USER;
  const role: UserRole = currentUser.role;

  // Persist users list changes
  useEffect(() => {
    localStorage.setItem('techrescue_users', JSON.stringify(users));
  }, [users]);

  // Sync session with backend API /auth/me on mount if token is present
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const isAuth = localStorage.getItem(STORAGE_KEY_AUTH) === 'true';
    if (token && isAuth) {
      api.get('/auth/me').then(res => {
        if (res.success && res.data?.user) {
          setActiveUser(res.data.user);
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(res.data.user));
        }
      }).catch(() => {
        // Keep cached user if network temporarily unavailable
      });
    }
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> => {
    try {
      // 1. Attempt Real Backend API Authentication
      const res = await api.post('/auth/login', { email: email.trim().toLowerCase(), password });

      if (res.success && res.data) {
        const token = res.data.token;
        const user = res.data.user;

        if (token) {
          localStorage.setItem(STORAGE_KEY_TOKEN, token);
        }
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
        localStorage.setItem(STORAGE_KEY_AUTH, 'true');
        setActiveUser(user);
        setIsAuthenticated(true);
        return { success: true, user };
      }

      // If backend returned explicit authentication error
      if (res.error && !res.error.includes('Network') && !res.error.includes('Failed to fetch')) {
        return { success: false, error: res.error };
      }
    } catch (err: any) {
      console.warn('Backend login endpoint unavailable, checking fallback:', err.message);
    }

    // 2. Offline / Demo Fallback Mode
    const localUser = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (localUser) {
      if (password === 'password123' || password === '••••••••••••' || password.length >= 6) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(localUser));
        localStorage.setItem(STORAGE_KEY_TOKEN, `mock-jwt-token-${localUser.id}`);
        localStorage.setItem(STORAGE_KEY_AUTH, 'true');
        setActiveUser(localUser);
        setIsAuthenticated(true);
        return { success: true, user: localUser };
      }
      return { success: false, error: 'Incorrect password. (For demo accounts, use password123)' };
    }

    return { success: false, error: 'User with this email not found. Please register or check credentials.' };
  };

  const register = async (userData: { name: string; email: string; password: string; role: UserRole; company?: string }) => {
    try {
      // 1. Attempt Backend API Registration
      const res = await api.post('/auth/register', userData);
      if (res.success && res.data) {
        const token = res.data.token;
        const user = res.data.user;
        if (token) localStorage.setItem(STORAGE_KEY_TOKEN, token);
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
        localStorage.setItem(STORAGE_KEY_AUTH, 'true');
        setActiveUser(user);
        setIsAuthenticated(true);
        setUsers(prev => [user, ...prev]);
        return { success: true, user };
      }
      if (res.error && !res.error.includes('Network') && !res.error.includes('Failed to fetch')) {
        return { success: false, error: res.error };
      }
    } catch (err: any) {
      console.warn('Backend register unavailable, creating local user:', err.message);
    }

    // 2. Offline Fallback
    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      company: userData.company,
      rating: 5.0,
      completedJobsCount: 0,
      totalEarnings: 0,
      verified: true,
      isAvailable: true,
    };

    setUsers(prev => [newUser, ...prev]);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser));
    localStorage.setItem(STORAGE_KEY_TOKEN, `mock-jwt-token-${newUser.id}`);
    localStorage.setItem(STORAGE_KEY_AUTH, 'true');
    setActiveUser(newUser);
    setIsAuthenticated(true);
    return { success: true, user: newUser };
  };

  const loginAs = (userId: string) => {
    const found = users.find(u => u.id === userId);
    if (found) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(found));
      localStorage.setItem(STORAGE_KEY_TOKEN, `mock-jwt-token-${found.id}`);
      localStorage.setItem(STORAGE_KEY_AUTH, 'true');
      setActiveUser(found);
      setIsAuthenticated(true);
    }
  };

  const switchRole = (newRole: UserRole) => {
    const targetUser = users.find(u => u.role === newRole);
    if (targetUser) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(targetUser));
      localStorage.setItem(STORAGE_KEY_TOKEN, `mock-jwt-token-${targetUser.id}`);
      localStorage.setItem(STORAGE_KEY_AUTH, 'true');
      setActiveUser(targetUser);
      setIsAuthenticated(true);
    }
  };

  const updateCurrentUser = (data: Partial<User>) => {
    if (!activeUser) return;
    const updated = { ...activeUser, ...data };
    setActiveUser(updated);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
    setUsers(prev => prev.map(u => u.id === activeUser.id ? updated : u));
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_AUTH);
    setActiveUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        role,
        isAuthenticated,
        switchRole,
        loginAs,
        login,
        register,
        updateCurrentUser,
        logout
      }}
    >
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

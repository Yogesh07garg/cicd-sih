import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'FACULTY' | 'STUDENT' | 'ACCOUNTANT' | 'LIBRARIAN' | 'WARDEN';
  profileImage?: string;
  department?: string;
  studentId?: string;
  employeeId?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  department?: string;
  studentId?: string;
  employeeId?: string;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Set default axios config
  useEffect(() => {
    const token = Cookies.get('access_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);

  // Check authentication status on app load
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = Cookies.get('access_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await axios.get('/api/auth/me');
      setUser(response.data.user);
    } catch (error) {
      // Clear invalid token
      Cookies.remove('access_token');
      Cookies.remove('refresh_token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { user, accessToken, refreshToken } = response.data;

      // Store tokens
      Cookies.set('access_token', accessToken, { expires: 1 }); // 1 day
      Cookies.set('refresh_token', refreshToken, { expires: 7 }); // 7 days

      // Set default authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      setUser(user);
      toast.success('Login successful!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
      throw error;
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      await axios.post('/api/auth/register', userData);
      toast.success('Registration successful! Please login.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Registration failed');
      throw error;
    }
  };

  const logout = () => {
    // Clear tokens and user data
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    toast.success('Logged out successfully');
  };

  const forgotPassword = async (email: string) => {
    try {
      await axios.post('/api/auth/forgot-password', { email });
      toast.success('Password reset email sent!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send reset email');
      throw error;
    }
  };

  const resetPassword = async (token: string, password: string) => {
    try {
      await axios.post('/api/auth/reset-password', { token, password });
      toast.success('Password reset successful!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Password reset failed');
      throw error;
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { AuthContext };
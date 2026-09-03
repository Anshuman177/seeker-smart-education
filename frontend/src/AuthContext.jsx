import React, { createContext, useState, useEffect } from 'react';
import API from './api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('seeker_token');
    const savedUser = localStorage.getItem('seeker_user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    localStorage.setItem('seeker_token', res.data.token);
    localStorage.setItem('seeker_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const signup = async (data) => {
    const res = await API.post('/auth/signup', data);
    localStorage.setItem('seeker_token', res.data.token);
    localStorage.setItem('seeker_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('seeker_token');
    localStorage.removeItem('seeker_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
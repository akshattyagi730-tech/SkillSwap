import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

// Normalize user — always use _id field
const normalizeUser = (userData) => {
  if (!userData) return null;
  return {
    ...userData,
    _id: userData._id || userData.id,
  };
};

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try { setUser(normalizeUser(JSON.parse(savedUser))); } catch (_) {}
    }
    setLoading(false);
  }, []);

  const login = (userData, jwtToken) => {
    const normalized = normalizeUser(userData);
    setUser(normalized);
    setToken(jwtToken);
    localStorage.setItem('token', jwtToken);
    localStorage.setItem('user', JSON.stringify(normalized));
  };

  const logout = () => {
    setUser(null); setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const updateUser = (data) => {
    const merged = normalizeUser({ ...user, ...data });
    setUser(merged);
    localStorage.setItem('user', JSON.stringify(merged));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

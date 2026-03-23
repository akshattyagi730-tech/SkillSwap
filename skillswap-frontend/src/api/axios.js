import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const API = axios.create({
  baseURL: BASE,
  timeout: 60000, // 60 seconds — handles Render cold start
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default API;
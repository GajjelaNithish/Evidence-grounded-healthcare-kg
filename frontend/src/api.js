import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  // Do NOT set a global Content-Type here.
  // For FormData (file uploads), the browser must set it automatically
  // with the correct multipart boundary. A global JSON header overrides this.
});

// Request interceptor — attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('clinickg_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/login') &&
      !window.location.pathname.includes('/login')
    ) {
      localStorage.removeItem('clinickg_token');
      localStorage.removeItem('clinickg_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

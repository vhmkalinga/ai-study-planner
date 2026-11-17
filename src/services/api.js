import axios from 'axios';

const TOKEN_KEY = 'sf-token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY)
};

const api = axios.create({ baseURL: '/api', timeout: 60000 });

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    // A wrong password on the login form is not an expired session.
    const isAuthForm = url.startsWith('/auth/login') || url.startsWith('/auth/register');
    if (error.response?.status === 401 && !isAuthForm) {
      tokenStore.clear();
      if (window.location.pathname !== '/login') window.location.assign('/login');
    }
    return Promise.reject(error);
  }
);

// Turn any axios error into a message that can be shown to the user.
export function errorMessage(error, fallback = 'Something went wrong') {
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
  if (error?.request && !error.response) return 'Cannot reach the server. Is the backend running?';
  return fallback;
}

export default api;

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me')
};

export const sessionsAPI = {
  getByDate: (date) => api.get('/sessions', { params: { date } }),
  getRange: (from, to) => api.get('/sessions', { params: { from, to } }),
  create: (data) => api.post('/sessions', data),
  createMany: (sessions) => api.post('/sessions/bulk', { sessions }),
  update: (id, data) => api.put(`/sessions/${id}`, data),
  delete: (id) => api.delete(`/sessions/${id}`)
};

export const subjectsAPI = {
  getAll: () => api.get('/subjects'),
  create: (data) => api.post('/subjects', data),
  update: (id, data) => api.put(`/subjects/${id}`, data),
  delete: (id) => api.delete(`/subjects/${id}`)
};

export const progressAPI = {
  getWeekly: (date) => api.get('/progress/weekly', { params: { date } }),
  getStreak: (today) => api.get('/progress/streak', { params: { today } }),
  getSubjects: (range) => api.get('/progress/subjects', { params: range || {} }),
  getSummary: () => api.get('/progress/summary')
};

export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  exportData: () => api.get('/settings/export'),
  deleteAccount: (password) => api.delete('/settings/account', { data: { password } })
};

export const aiAPI = {
  generatePlan: (data) => api.post('/ai/generate-plan', data),
  getSuggestions: (data) => api.post('/ai/suggestions', data),
  getTips: (data) => api.post('/ai/tips', data)
};

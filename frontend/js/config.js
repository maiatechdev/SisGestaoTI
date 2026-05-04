// Configuração global do frontend
const CONFIG = {
  API_URL: 'http://localhost:3000/api',
  WS_URL:  'ws://localhost:3000',
};

// Helpers de autenticação
const Auth = {
  getToken()   { return localStorage.getItem('token'); },
  getUser()    { const u = localStorage.getItem('user'); return u ? JSON.parse(u) : null; },
  setSession(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  isLoggedIn() { return !!this.getToken(); },
  hasRole(...roles) {
    const user = this.getUser();
    return user && roles.includes(user.role);
  },
};

// Wrapper de fetch autenticado
async function apiFetch(path, options = {}) {
  const token = Auth.getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  const res = await fetch(`${CONFIG.API_URL}${path}`, { ...options, headers });
  if (res.status === 401) {
    Auth.clear();
    window.location.href = '/index.html';
    return;
  }
  return res;
}

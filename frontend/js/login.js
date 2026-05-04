// Redireciona se já logado
if (Auth.isLoggedIn()) {
  window.location.href = 'pages/dashboard.html';
}

const form    = document.getElementById('loginForm');
const errDiv  = document.getElementById('loginError');
const loginBtn = document.getElementById('loginBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errDiv.classList.add('hidden');
  loginBtn.disabled = true;
  loginBtn.textContent = 'Entrando...';

  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const res = await fetch(`${CONFIG.API_URL}/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Credenciais inválidas');
    }

    Auth.setSession(data.token, data.user);
    window.location.href = 'pages/dashboard.html';
  } catch (err) {
    errDiv.textContent = err.message;
    errDiv.classList.remove('hidden');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Entrar';
  }
});

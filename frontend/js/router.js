// Roteador hash simples — sem dependências externas
const Router = (() => {
  // { pattern: RegExp, keys: string[], handler: Function, roles?: string[] }
  const routes = [];

  function _pathToRegex(path) {
    const keys = [];
    const pattern = path
      .replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })
      .replace(/\//g, '\\/');
    return { regex: new RegExp(`^${pattern}$`), keys };
  }

  // Registra uma rota
  function on(path, handler, roles = null) {
    const { regex, keys } = _pathToRegex(path);
    routes.push({ regex, keys, handler, roles });
  }

  // Resolve a rota atual
  function resolve() {
    // Separa path de query string: #/tickets?status=open → path=/tickets
    const full = window.location.hash.slice(1) || '/dashboard';
    const hash = full.split('?')[0];
    const user = Auth.getUser();

    for (const route of routes) {
      const match = hash.match(route.regex);
      if (!match) continue;

      // Verifica role
      if (route.roles && user && !route.roles.includes(user.role)) {
        _render404('Acesso negado para este perfil.');
        return;
      }

      // Monta params de rota dinâmica  (ex: /tickets/:id)
      const params = {};
      route.keys.forEach((k, i) => { params[k] = match[i + 1]; });

      route.handler(params);
      return;
    }

    _render404('Página não encontrada.');
  }

  function _render404(msg) {
    document.getElementById('pageTitle').textContent = 'Não encontrado';
    document.getElementById('headerActions').innerHTML = '';
    document.getElementById('content').innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p>${msg}</p>
      </div>`;
  }

  // Navega para uma rota
  function navigate(path) {
    window.location.hash = path;
  }

  // Inicia o roteador
  function start() {
    window.addEventListener('hashchange', resolve);
    resolve();
  }

  return { on, navigate, start, resolve };
})();

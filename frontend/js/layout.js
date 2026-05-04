// ─── Ícones SVG reutilizáveis ────────────────────────────────────────────────
const Icons = {
  home: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>`,

  ticket: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"/>
    <path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
    <path d="M9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5z"/>
    <path d="M3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14z"/>
    <path d="M14 14.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5z"/>
    <path d="M15.5 19H14v1.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z"/>
    <path d="M10 9.5C10 8.67 9.33 8 8.5 8h-5C2.67 8 2 8.67 2 9.5S2.67 11 3.5 11h5c.83 0 1.5-.67 1.5-1.5z"/>
    <path d="M8.5 5H10V3.5C10 2.67 9.33 2 8.5 2S7 2.67 7 3.5 7.67 5 8.5 5z"/>
  </svg>`,

  plus: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/>
    <line x1="8" y1="12" x2="16" y2="12"/>
  </svg>`,

  megaphone: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M3 11l19-9-9 19-2-8-8-2z"/>
  </svg>`,

  users: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>`,

  list: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6"  x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/>
    <line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>`,
};

// ─── Definição dos itens de menu ─────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    label: 'Principal',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: Icons.home,      hash: '/dashboard', roles: ['user', 'ti', 'admin'] },
    ],
  },
  {
    label: 'Chamados',
    items: [
      { id: 'tickets',     label: 'Chamados',      icon: Icons.list,   hash: '/tickets',     roles: ['user', 'ti', 'admin'] },
      { id: 'tickets-new', label: 'Abrir Chamado', icon: Icons.plus,   hash: '/tickets/new', roles: ['user', 'ti', 'admin'] },
    ],
  },
  {
    label: 'Comunicados',
    items: [
      { id: 'announcements',     label: 'Comunicados', icon: Icons.megaphone, hash: '/announcements',     roles: ['user', 'ti', 'admin'] },
      { id: 'announcements-new', label: 'Novo C.I',    icon: Icons.plus,      hash: '/announcements/new', roles: ['ti', 'admin'] },
    ],
  },
];

// ─── Labels de role humanizados ──────────────────────────────────────────────
const ROLE_LABELS = { user: 'Usuário', ti: 'TI', admin: 'Administrador' };

// ─── Constrói a sidebar ──────────────────────────────────────────────────────
function buildSidebar() {
  const user = Auth.getUser();
  if (!user) return;

  // Avatar e info do usuário
  document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();
  document.getElementById('userName').textContent   = user.name;
  document.getElementById('userRole').textContent   = ROLE_LABELS[user.role] || user.role;

  // Monta itens de navegação filtrados por role
  const nav = document.getElementById('sidebarNav');
  nav.innerHTML = '';

  for (const section of NAV_SECTIONS) {
    const visibleItems = section.items.filter(item => item.roles.includes(user.role));
    if (visibleItems.length === 0) continue;

    const label = document.createElement('div');
    label.className = 'nav-section-label';
    label.textContent = section.label;
    nav.appendChild(label);

    for (const item of visibleItems) {
      const el = document.createElement('div');
      el.className  = 'nav-item';
      el.dataset.id = item.id;
      el.innerHTML  = `${item.icon}<span>${item.label}</span>`;
      el.addEventListener('click', () => Router.navigate(item.hash));
      nav.appendChild(el);
    }
  }

  // Logout
  document.getElementById('btnLogout').addEventListener('click', () => {
    Auth.clear();
    window.location.href = '../index.html';
  });
}

// ─── Atualiza item ativo na sidebar ─────────────────────────────────────────
function setActiveNav(id) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === id);
  });
}

// ─── Atualiza título e ações do header ──────────────────────────────────────
function setHeader(title, actionsHtml = '') {
  document.getElementById('pageTitle').textContent   = title;
  document.getElementById('headerActions').innerHTML = actionsHtml;
}

// ─── Renderiza conteúdo na área principal ────────────────────────────────────
function setContent(html) {
  document.getElementById('content').innerHTML = html;
}

// ─── Spinner de carregamento ─────────────────────────────────────────────────
function loadingHTML() {
  return `<div class="empty-state"><p>Carregando...</p></div>`;
}

// ─── Estado vazio genérico ───────────────────────────────────────────────────
function emptyHTML(msg = 'Nenhum item encontrado.') {
  return `<div class="empty-state">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="9" y1="9"  x2="15" y2="15"/>
      <line x1="15" y1="9" x2="9"  y2="15"/>
    </svg>
    <p>${msg}</p>
  </div>`;
}

// ─── Formata data ISO para leitura humana ────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso.replace(' ', 'T') + (iso.includes('T') ? '' : 'Z'));
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// ─── Escape HTML (previne XSS) ───────────────────────────────────────────────
function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Labels humanizados ───────────────────────────────────────────────────────
const STATUS_LABELS   = { open:'Aberto', in_progress:'Em Andamento', resolved:'Resolvido', closed:'Fechado' };
const PRIORITY_LABELS = { low:'Baixa', medium:'Média', high:'Alta', critical:'Crítica' };
const ANN_LABELS      = { pending:'Pendente', approved:'Aprovado', rejected:'Rejeitado' };

function statusBadge(s)   { return `<span class="badge badge-${s}">${STATUS_LABELS[s]   || s}</span>`; }
function priorityBadge(p) { return `<span class="badge badge-${p}">${PRIORITY_LABELS[p] || p}</span>`; }
function annBadge(s)      { return `<span class="badge badge-${s}">${ANN_LABELS[s]       || s}</span>`; }

// ─── Ícones para stat cards ───────────────────────────────────────────────────
const ICON_INBOX  = '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>';
const ICON_CLOCK  = '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>';
const ICON_CHECK  = '<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>';
const ICON_ALERT  = '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>';
const ICON_GRID   = '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>';
const ICON_MSG    = '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>';

function statCard(value, label, color, iconPath) {
  return `
  <div class="stat-card">
    <div class="stat-icon ${color}">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${iconPath}</svg>
    </div>
    <div class="stat-info">
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
    </div>
  </div>`;
}

// ─── Mini-tabela de chamados ─────────────────────────────────────────────────
function ticketTable(tickets, limit = 8) {
  if (!tickets.length) return emptyHTML('Nenhum chamado encontrado.');
  const rows = tickets.slice(0, limit).map(t => `
    <tr style="cursor:pointer" onclick="Router.navigate('/tickets/${t.id}')">
      <td style="color:var(--text-muted);font-size:12px">#${t.id}</td>
      <td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.title)}</td>
      <td>${statusBadge(t.status)}</td>
      <td>${priorityBadge(t.priority)}</td>
      <td style="font-size:12px;color:var(--text-muted)">${esc(t.user_name || '—')}</td>
      <td style="font-size:12px;color:var(--text-muted)">${fmtDate(t.created_at)}</td>
    </tr>`).join('');
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>#</th><th>Título</th><th>Status</th><th>Prioridade</th><th>Solicitante</th><th>Aberto em</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

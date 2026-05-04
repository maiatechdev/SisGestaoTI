async function renderDashboard() {
  setActiveNav('dashboard');
  setHeader('Dashboard');
  setContent(loadingHTML());

  const user = Auth.getUser();
  try {
    const r = await apiFetch('/tickets');
    if (!r) return;
    const { tickets } = await r.json();

    if (user.role === 'user') {
      _dashUser(tickets);
    } else if (user.role === 'ti') {
      _dashTi(tickets, user);
    } else {
      const rA = await apiFetch('/announcements');
      const { announcements } = await rA.json();
      _dashAdmin(tickets, announcements);
    }
  } catch {
    setContent(emptyHTML('Erro ao carregar dashboard.'));
  }
}

// ─── Dashboard: User ─────────────────────────────────────────────────────────
function _dashUser(tickets) {
  const open       = tickets.filter(t => t.status === 'open').length;
  const inProgress = tickets.filter(t => t.status === 'in_progress').length;
  const resolved   = tickets.filter(t => t.status === 'resolved').length;

  setContent(`
    <div class="stats-grid">
      ${statCard(tickets.length, 'Total de Chamados',  'blue',   ICON_GRID)}
      ${statCard(open,           'Abertos',            'yellow', ICON_INBOX)}
      ${statCard(inProgress,     'Em Andamento',       'purple', ICON_CLOCK)}
      ${statCard(resolved,       'Resolvidos',         'green',  ICON_CHECK)}
    </div>

    <div class="card">
      <div class="card-header">
        <h3>Meus Chamados Recentes</h3>
        <button class="btn btn-primary btn-sm" onclick="Router.navigate('/tickets/new')">+ Abrir Chamado</button>
      </div>
      <div class="card-body" style="padding:0">
        ${ticketTable(tickets)}
      </div>
    </div>
  `);
}

// ─── Dashboard: TI ───────────────────────────────────────────────────────────
function _dashTi(tickets, user) {
  const open       = tickets.filter(t => t.status === 'open').length;
  const inProgress = tickets.filter(t => t.status === 'in_progress').length;
  const mine       = tickets.filter(t => String(t.assigned_to) === String(user.id)).length;
  const critical   = tickets.filter(t => t.priority === 'critical' &&
                     t.status !== 'closed' && t.status !== 'resolved').length;

  const unassigned = tickets.filter(t => !t.assigned_to &&
                     (t.status === 'open' || t.status === 'in_progress'));
  const myTickets  = tickets.filter(t => String(t.assigned_to) === String(user.id) &&
                     (t.status === 'open' || t.status === 'in_progress'));

  setContent(`
    <div class="stats-grid">
      ${statCard(open,       'Abertos',          'blue',   ICON_INBOX)}
      ${statCard(inProgress, 'Em Andamento',     'yellow', ICON_CLOCK)}
      ${statCard(mine,       'Atribuídos a Mim', 'purple', ICON_GRID)}
      ${statCard(critical,   'Críticos Ativos',  'red',    ICON_ALERT)}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card">
        <div class="card-header"><h3>Sem Atribuição</h3></div>
        <div class="card-body" style="padding:0">${ticketTable(unassigned)}</div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Atribuídos a Mim</h3></div>
        <div class="card-body" style="padding:0">${ticketTable(myTickets)}</div>
      </div>
    </div>
  `);
}

// ─── Dashboard: Admin ────────────────────────────────────────────────────────
function _dashAdmin(tickets, announcements) {
  const open     = tickets.filter(t => t.status === 'open').length;
  const critical = tickets.filter(t =>
    (t.priority === 'critical' || t.priority === 'high') &&
    t.status !== 'closed' && t.status !== 'resolved').length;
  const pending  = announcements.filter(a => a.status === 'pending').length;

  const criticalList = tickets.filter(t =>
    (t.priority === 'critical' || t.priority === 'high') &&
    t.status !== 'closed' && t.status !== 'resolved');
  const pendingList  = announcements.filter(a => a.status === 'pending');

  setContent(`
    <div class="stats-grid">
      ${statCard(tickets.length, 'Total Chamados',     'blue',   ICON_GRID)}
      ${statCard(open,           'Abertos',            'yellow', ICON_INBOX)}
      ${statCard(critical,       'Alta/Crítica Ativos','red',    ICON_ALERT)}
      ${statCard(pending,        'CIs Pendentes',      'purple', ICON_MSG)}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card">
        <div class="card-header">
          <h3>Chamados Alta/Crítica</h3>
          <button class="btn btn-secondary btn-sm" onclick="Router.navigate('/tickets')">Ver todos</button>
        </div>
        <div class="card-body" style="padding:0">${ticketTable(criticalList)}</div>
      </div>
      <div class="card">
        <div class="card-header">
          <h3>CIs Aguardando Aprovação</h3>
          <button class="btn btn-secondary btn-sm" onclick="Router.navigate('/announcements')">Ver todos</button>
        </div>
        <div class="card-body" style="padding:0">${_annApprovalTable(pendingList)}</div>
      </div>
    </div>
  `);
}

function _annApprovalTable(list) {
  if (!list.length) return emptyHTML('Nenhum CI pendente.');
  const rows = list.map(a => `
    <tr>
      <td>${esc(a.title)}</td>
      <td style="font-size:12px">${esc(a.created_by_name)}</td>
      <td>
        <div class="table-action">
          <button class="btn btn-success btn-sm" onclick="_adminApprove(${a.id})">Aprovar</button>
          <button class="btn btn-danger  btn-sm" onclick="_adminReject(${a.id})">Rejeitar</button>
        </div>
      </td>
    </tr>`).join('');
  return `<div class="table-wrap"><table>
    <thead><tr><th>Título</th><th>Autor</th><th>Ação</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

async function _adminApprove(id) {
  await apiFetch(`/announcements/${id}/review`, {
    method: 'PATCH', body: JSON.stringify({ action: 'approve' }),
  });
  renderDashboard();
}

async function _adminReject(id) {
  await apiFetch(`/announcements/${id}/review`, {
    method: 'PATCH', body: JSON.stringify({ action: 'reject' }),
  });
  renderDashboard();
}

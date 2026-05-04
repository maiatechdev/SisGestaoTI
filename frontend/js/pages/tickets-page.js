// ─── Lista de Chamados ───────────────────────────────────────────────────────
async function renderTickets() {
  setActiveNav('tickets');
  setHeader('Chamados', `
    <button class="btn btn-primary btn-sm" onclick="Router.navigate('/tickets/new')">+ Abrir Chamado</button>
  `);
  setContent(loadingHTML());

  const params = _getFilterParams();
  const qs = new URLSearchParams(params).toString();

  try {
    const r = await apiFetch('/tickets' + (qs ? '?' + qs : ''));
    if (!r) return;
    const { tickets, total } = await r.json();
    _renderTicketList(tickets, total, params);
  } catch {
    setContent(emptyHTML('Erro ao carregar chamados.'));
  }
}

function _getFilterParams() {
  const sp = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const p = {};
  if (sp.get('status'))   p.status   = sp.get('status');
  if (sp.get('priority')) p.priority = sp.get('priority');
  return p;
}

function _renderTicketList(tickets, total, filters) {
  const statusOpts = ['', 'open', 'in_progress', 'resolved', 'closed']
    .map(s => `<option value="${s}" ${filters.status === s ? 'selected' : ''}>${s ? (STATUS_LABELS[s] || s) : 'Todos os status'}</option>`)
    .join('');
  const priorityOpts = ['', 'low', 'medium', 'high', 'critical']
    .map(p => `<option value="${p}" ${filters.priority === p ? 'selected' : ''}>${p ? (PRIORITY_LABELS[p] || p) : 'Todas as prioridades'}</option>`)
    .join('');

  setContent(`
    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="padding:12px 16px">
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <span style="font-size:13px;color:var(--text-muted)">${total} chamado(s)</span>
          <select id="filterStatus"   onchange="_applyFilters()" style="padding:6px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px">${statusOpts}</select>
          <select id="filterPriority" onchange="_applyFilters()" style="padding:6px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px">${priorityOpts}</select>
          <button class="btn btn-secondary btn-sm" onclick="_clearFilters()">Limpar</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-body" style="padding:0">
        ${ticketTable(tickets)}
      </div>
    </div>
  `);
}

function _applyFilters() {
  const status   = document.getElementById('filterStatus').value;
  const priority = document.getElementById('filterPriority').value;
  const qs = new URLSearchParams();
  if (status)   qs.set('status',   status);
  if (priority) qs.set('priority', priority);
  const q = qs.toString();
  window.location.hash = '/tickets' + (q ? '?' + q : '');
}

function _clearFilters() {
  window.location.hash = '/tickets';
}

// ─── Abrir Chamado ───────────────────────────────────────────────────────────
function renderTicketNew() {
  setActiveNav('tickets-new');
  setHeader('Abrir Chamado');

  setContent(`
    <div class="card" style="max-width:640px;margin:0 auto">
      <div class="card-header"><h3>Novo Chamado</h3></div>
      <div class="card-body">
        <div id="ticketNewError" class="error-message hidden"></div>
        <form id="ticketNewForm">
          <div class="form-group">
            <label>Título *</label>
            <input type="text" id="tnTitle" placeholder="Descreva o problema brevemente" required />
          </div>
          <div class="form-group">
            <label>Descrição *</label>
            <textarea id="tnDesc" placeholder="Detalhe o problema, quando ocorreu, o que foi tentado..." required></textarea>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <div class="form-group">
              <label>Prioridade</label>
              <select id="tnPriority">
                <option value="low">Baixa</option>
                <option value="medium" selected>Média</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
            </div>
            <div class="form-group">
              <label>Categoria</label>
              <select id="tnCategory">
                <option value="hardware">Hardware</option>
                <option value="software">Software</option>
                <option value="rede">Rede / Internet</option>
                <option value="acesso">Acesso / Senha</option>
                <option value="email">E-mail</option>
                <option value="impressora">Impressora</option>
                <option value="geral" selected>Geral</option>
              </select>
            </div>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button type="button" class="btn btn-secondary" onclick="Router.navigate('/tickets')">Cancelar</button>
            <button type="submit" class="btn btn-primary" id="tnSubmit">Abrir Chamado</button>
          </div>
        </form>
      </div>
    </div>
  `);

  document.getElementById('ticketNewForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('tnSubmit');
    const err = document.getElementById('ticketNewError');
    btn.disabled = true;
    btn.textContent = 'Enviando...';
    err.classList.add('hidden');

    try {
      const r = await apiFetch('/tickets', {
        method: 'POST',
        body: JSON.stringify({
          title:       document.getElementById('tnTitle').value.trim(),
          description: document.getElementById('tnDesc').value.trim(),
          priority:    document.getElementById('tnPriority').value,
          category:    document.getElementById('tnCategory').value,
        }),
      });
      if (!r) return;
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Erro ao criar chamado');
      Router.navigate('/tickets/' + data.ticket.id);
    } catch (ex) {
      err.textContent = ex.message;
      err.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Abrir Chamado';
    }
  });
}

// ─── Detalhe do Chamado + Chat ───────────────────────────────────────────────
async function renderTicketDetail(params) {
  const ticketId = Number(params.id);
  setActiveNav('tickets');
  setHeader('Carregando...');
  setContent(loadingHTML());

  try {
    const r = await apiFetch(`/tickets/${ticketId}`);
    if (!r) return;
    if (r.status === 404 || r.status === 403) {
      setContent(emptyHTML('Chamado não encontrado ou acesso negado.'));
      return;
    }
    const { ticket } = await r.json();
    const user = Auth.getUser();

    setHeader(
      `#${ticket.id} — ${esc(ticket.title)}`,
      `<button class="btn btn-secondary btn-sm" onclick="Router.navigate('/tickets')">← Voltar</button>`
    );

    const canManage = user.role === 'ti' || user.role === 'admin';

    const mgmtHtml = canManage ? `
      <div class="card">
        <div class="card-header"><h3>Gerenciar</h3></div>
        <div class="card-body">
          <div class="form-group">
            <label>Status</label>
            <select id="statusSelect">
              ${['open','in_progress','resolved','closed'].map(s =>
                `<option value="${s}" ${ticket.status === s ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`
              ).join('')}
            </select>
          </div>
          <button class="btn btn-primary" style="width:100%" id="btnSaveStatus">Salvar Status</button>
          <hr style="margin:16px 0;border:none;border-top:1px solid var(--border)">
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px">Atribuído a</div>
          <div style="font-size:13px;font-weight:500;margin-bottom:10px" id="assigneeLabel">
            ${esc(ticket.assigned_name || 'Ninguém')}
          </div>
          <button class="btn btn-secondary" style="width:100%;font-size:13px" id="btnAssign">
            ${ticket.assigned_to == user.id ? 'Remover minha atribuição' : 'Atribuir a mim'}
          </button>
        </div>
      </div>` : '';

    setContent(`
      <div style="display:grid;grid-template-columns:1fr ${canManage ? '240px' : ''};gap:16px;align-items:start">
        <div style="display:flex;flex-direction:column;gap:16px">

          <!-- Info do chamado -->
          <div class="card">
            <div class="card-header">
              <h3>Detalhes</h3>
              <div style="display:flex;gap:6px">
                ${statusBadge(ticket.status)}
                ${priorityBadge(ticket.priority)}
              </div>
            </div>
            <div class="card-body">
              <div style="margin-bottom:12px">
                <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">Descrição</div>
                <div style="font-size:14px;white-space:pre-wrap">${esc(ticket.description)}</div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;font-size:13px">
                <div><div style="color:var(--text-muted);font-size:11px;margin-bottom:2px">CATEGORIA</div>${esc(ticket.category)}</div>
                <div><div style="color:var(--text-muted);font-size:11px;margin-bottom:2px">SOLICITANTE</div>${esc(ticket.user_name)}</div>
                <div><div style="color:var(--text-muted);font-size:11px;margin-bottom:2px">ABERTO EM</div>${fmtDate(ticket.created_at)}</div>
              </div>
            </div>
          </div>

          <!-- Chat -->
          <div class="card">
            <div class="card-header">
              <h3>Mensagens</h3>
              <span id="wsStatus" style="font-size:11px;color:var(--text-muted)">Conectando...</span>
            </div>
            <div class="card-body">
              <div class="chat-container">
                <div id="chatMessages" class="chat-messages"></div>
                <div class="chat-input-area">
                  <input id="chatInput" type="text" placeholder="Digite sua mensagem e pressione Enter..." />
                  <button class="btn btn-primary" id="chatSend">Enviar</button>
                </div>
              </div>
            </div>
          </div>

        </div>
        ${mgmtHtml}
      </div>
    `);

    // ── Status management ────────────────────────────────────────────────────
    if (canManage) {
      document.getElementById('btnSaveStatus').addEventListener('click', async () => {
        const btn = document.getElementById('btnSaveStatus');
        const newStatus = document.getElementById('statusSelect').value;
        btn.disabled = true; btn.textContent = 'Salvando...';
        const r2 = await apiFetch(`/tickets/${ticketId}/status`, {
          method: 'PATCH', body: JSON.stringify({ status: newStatus }),
        });
        if (r2 && r2.ok) {
          btn.textContent = '✓ Salvo!';
          setTimeout(() => { btn.disabled = false; btn.textContent = 'Salvar Status'; }, 1500);
        } else {
          btn.disabled = false; btn.textContent = 'Salvar Status';
        }
      });

      document.getElementById('btnAssign').addEventListener('click', async () => {
        const btn = document.getElementById('btnAssign');
        const isAssigned = ticket.assigned_to == user.id;
        btn.disabled = true;
        const r2 = await apiFetch(`/tickets/${ticketId}/assign`, {
          method: 'PATCH',
          body: JSON.stringify({ assigned_to: isAssigned ? null : user.id }),
        });
        if (r2 && r2.ok) {
          const { ticket: t2 } = await r2.json();
          ticket.assigned_to   = t2.assigned_to;
          ticket.assigned_name = t2.assigned_name;
          document.getElementById('assigneeLabel').textContent = t2.assigned_name || 'Ninguém';
          btn.textContent = t2.assigned_to == user.id ? 'Remover minha atribuição' : 'Atribuir a mim';
        }
        btn.disabled = false;
      });
    }

    // ── WebSocket Chat ───────────────────────────────────────────────────────
    _initChat(ticketId, user);

  } catch {
    setContent(emptyHTML('Erro ao carregar chamado.'));
  }
}

function _initChat(ticketId, user) {
  const token    = Auth.getToken();
  const ws       = new WebSocket(`${CONFIG.WS_URL}/ws?token=${token}&ticket=${ticketId}`);
  const msgBox   = document.getElementById('chatMessages');
  const input    = document.getElementById('chatInput');
  const sendBtn  = document.getElementById('chatSend');
  const wsStatus = document.getElementById('wsStatus');

  // Fecha WS ao navegar para outra rota
  window.addEventListener('hashchange', () => ws.close(), { once: true });

  ws.onopen = () => {
    if (wsStatus) wsStatus.textContent = 'Conectado';
  };

  ws.onclose = () => {
    if (wsStatus) wsStatus.textContent = 'Desconectado';
  };

  ws.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.type === 'history') {
      if (!msgBox) return;
      msgBox.innerHTML = '';
      if (!data.messages.length) {
        msgBox.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:13px;padding:24px">Sem mensagens ainda. Seja o primeiro a escrever!</div>';
        return;
      }
      data.messages.forEach(m => _appendMsg(msgBox, m, user));
    } else if (data.type === 'message') {
      if (!msgBox) return;
      // Remove placeholder se existir
      const placeholder = msgBox.querySelector('[data-placeholder]');
      if (placeholder) placeholder.remove();
      _appendMsg(msgBox, data.message, user);
    } else if (data.type === 'error') {
      if (wsStatus) wsStatus.textContent = 'Erro: ' + data.error;
    }
  };

  function send() {
    const txt = input.value.trim();
    if (!txt || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'message', content: txt }));
    input.value = '';
  }

  if (sendBtn) sendBtn.addEventListener('click', send);
  if (input)   input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
}

function _appendMsg(container, msg, currentUser) {
  const mine = String(msg.user_id) === String(currentUser.id);
  const el = document.createElement('div');
  el.className = 'msg ' + (mine ? 'mine' : 'theirs');
  el.innerHTML = `
    ${!mine ? `<div class="msg-author">${esc(msg.user_name)}</div>` : ''}
    <div class="msg-bubble">${esc(msg.content)}</div>
    <div class="msg-time">${fmtDate(msg.created_at)}</div>
  `;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

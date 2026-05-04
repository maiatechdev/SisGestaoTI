// ─── Lista de Comunicados ────────────────────────────────────────────────────
async function renderAnnouncements() {
  setActiveNav('announcements');
  const user = Auth.getUser();
  const canCreate = user.role === 'ti' || user.role === 'admin';

  setHeader('Comunicados Internos', canCreate
    ? `<button class="btn btn-primary btn-sm" onclick="Router.navigate('/announcements/new')">+ Novo C.I</button>`
    : ''
  );
  setContent(loadingHTML());

  try {
    const r = await apiFetch('/announcements');
    if (!r) return;
    const { announcements } = await r.json();
    _renderAnnList(announcements, user);
  } catch {
    setContent(emptyHTML('Erro ao carregar comunicados.'));
  }
}

function _renderAnnList(list, user) {
  if (!list.length) {
    setContent(emptyHTML('Nenhum comunicado disponível.'));
    return;
  }

  const cards = list.map(a => {
    const isAdmin   = user.role === 'admin';
    const isPending = a.status === 'pending';

    const adminActions = isAdmin && isPending ? `
      <div style="display:flex;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">
        <button class="btn btn-success btn-sm" onclick="_annApprove(${a.id})">✓ Aprovar</button>
        <button class="btn btn-danger  btn-sm" onclick="_annReject(${a.id})">✗ Rejeitar</button>
      </div>` : '';

    return `
      <div class="card" style="margin-bottom:14px">
        <div class="card-body">
          <div style="display:flex;align-items:flex-start;gap:12px">
            <div style="flex:1">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <span style="font-size:15px;font-weight:600">${esc(a.title)}</span>
                ${annBadge(a.status)}
              </div>
              <div style="font-size:13px;color:var(--text);white-space:pre-wrap;line-height:1.6;margin-bottom:10px">${esc(a.content)}</div>
              <div style="display:flex;gap:16px;font-size:11px;color:var(--text-muted)">
                <span>Por <strong>${esc(a.created_by_name)}</strong></span>
                <span>${fmtDate(a.created_at)}</span>
                ${a.reviewed_by_name ? `<span>Revisado por <strong>${esc(a.reviewed_by_name)}</strong></span>` : ''}
              </div>
            </div>
          </div>
          ${adminActions}
        </div>
      </div>`;
  }).join('');

  setContent(`<div style="max-width:720px">${cards}</div>`);
}

async function _annApprove(id) {
  const r = await apiFetch(`/announcements/${id}/review`, {
    method: 'PATCH', body: JSON.stringify({ action: 'approve' }),
  });
  if (r && r.ok) renderAnnouncements();
}

async function _annReject(id) {
  const r = await apiFetch(`/announcements/${id}/review`, {
    method: 'PATCH', body: JSON.stringify({ action: 'reject' }),
  });
  if (r && r.ok) renderAnnouncements();
}

// ─── Novo Comunicado ─────────────────────────────────────────────────────────
function renderAnnouncementNew() {
  setActiveNav('announcements-new');
  setHeader('Novo Comunicado Interno');

  const user = Auth.getUser();
  const note = user.role === 'ti'
    ? '<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:6px;padding:10px 14px;font-size:13px;margin-bottom:16px">⚠ Comunicados criados por TI ficam pendentes até aprovação do admin.</div>'
    : '';

  setContent(`
    <div class="card" style="max-width:640px;margin:0 auto">
      <div class="card-header"><h3>Criar Comunicado Interno</h3></div>
      <div class="card-body">
        ${note}
        <div id="annNewError" class="error-message hidden"></div>
        <form id="annNewForm">
          <div class="form-group">
            <label>Título *</label>
            <input type="text" id="anTitle" placeholder="Título do comunicado" required />
          </div>
          <div class="form-group">
            <label>Conteúdo *</label>
            <textarea id="anContent" style="min-height:140px" placeholder="Escreva o comunicado aqui..." required></textarea>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button type="button" class="btn btn-secondary" onclick="Router.navigate('/announcements')">Cancelar</button>
            <button type="submit" class="btn btn-primary" id="anSubmit">Publicar</button>
          </div>
        </form>
      </div>
    </div>
  `);

  document.getElementById('annNewForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('anSubmit');
    const err = document.getElementById('annNewError');
    btn.disabled = true;
    btn.textContent = 'Enviando...';
    err.classList.add('hidden');

    try {
      const r = await apiFetch('/announcements', {
        method: 'POST',
        body: JSON.stringify({
          title:   document.getElementById('anTitle').value.trim(),
          content: document.getElementById('anContent').value.trim(),
        }),
      });
      if (!r) return;
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Erro ao criar comunicado');
      Router.navigate('/announcements');
    } catch (ex) {
      err.textContent = ex.message;
      err.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Publicar';
    }
  });
}

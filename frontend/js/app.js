// Ponto de entrada da SPA — inicializa layout e roteador
(function () {
  // Redireciona para login se não autenticado
  if (!Auth.isLoggedIn()) {
    window.location.href = '../index.html';
    return;
  }

  // Constrói sidebar e popula info do usuário
  buildSidebar();

  // ── Registro de rotas ───────────────────────────────────────────────────
  Router.on('/dashboard',          renderDashboard);
  Router.on('/tickets',            renderTickets);
  Router.on('/tickets/new',        renderTicketNew);
  Router.on('/tickets/:id',        renderTicketDetail);
  Router.on('/announcements',      renderAnnouncements);
  Router.on('/announcements/new',  renderAnnouncementNew, ['ti', 'admin']);

  // Redireciona rota raiz para dashboard
  if (!window.location.hash || window.location.hash === '#') {
    Router.navigate('/dashboard');
  }

  Router.start();
})();

import { Router, Request, Response } from 'express';
import { query, queryOne, run } from '../config/database';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// Todas as rotas exigem autenticação
router.use(authenticate);

// ─── Helpers ────────────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

const BASE_SELECT = `
  SELECT
    t.id, t.title, t.description, t.status, t.priority, t.category,
    t.created_at, t.updated_at,
    t.user_id,    u.name  AS user_name,
    t.assigned_to, a.name AS assigned_name
  FROM tickets t
  JOIN users u ON u.id = t.user_id
  LEFT JOIN users a ON a.id = t.assigned_to
`;

// ─── POST /api/tickets ───────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { title, description, priority = 'medium', category = 'general' } = req.body;
  const user = req.user!;

  if (!title || !description) {
    res.status(400).json({ error: 'Título e descrição são obrigatórios' });
    return;
  }

  const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];
  if (!VALID_PRIORITIES.includes(priority)) {
    res.status(400).json({ error: 'Prioridade inválida' });
    return;
  }

  const ts = now();
  const id = run(
    `INSERT INTO tickets (title, description, priority, category, user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [title, description, priority, category, user.id, ts, ts]
  );

  const ticket = queryOne(`${BASE_SELECT} WHERE t.id = ?`, [id]);
  res.status(201).json({ ticket });
});

// ─── GET /api/tickets ────────────────────────────────────────────────────────
router.get('/', (req: Request, res: Response): void => {
  const user = req.user!;

  // Filtros opcionais via query string
  const { status, priority, category } = req.query as Record<string, string>;

  let sql = BASE_SELECT;
  const params: (string | number)[] = [];
  const conditions: string[] = [];

  // user só vê os próprios chamados
  if (user.role === 'user') {
    conditions.push('t.user_id = ?');
    params.push(user.id);
  }

  if (status)   { conditions.push('t.status = ?');   params.push(status); }
  if (priority) { conditions.push('t.priority = ?'); params.push(priority); }
  if (category) { conditions.push('t.category = ?'); params.push(category); }

  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY t.created_at DESC';

  const tickets = query(sql, params);
  res.json({ tickets, total: tickets.length });
});

// ─── GET /api/tickets/:id ────────────────────────────────────────────────────
router.get('/:id', (req: Request, res: Response): void => {
  const user   = req.user!;
  const ticketId = Number(req.params.id);

  const ticket = queryOne<Record<string, unknown>>(`${BASE_SELECT} WHERE t.id = ?`, [ticketId]);

  if (!ticket) {
    res.status(404).json({ error: 'Chamado não encontrado' });
    return;
  }

  // user só acessa o próprio chamado
  if (user.role === 'user' && ticket.user_id !== user.id) {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  // Busca mensagens do chamado
  const messages = query<Record<string, unknown>>(`
    SELECT m.id, m.content, m.created_at, m.user_id, u.name AS user_name
    FROM messages m
    JOIN users u ON u.id = m.user_id
    WHERE m.ticket_id = ?
    ORDER BY m.created_at ASC
  `, [ticketId]);

  res.json({ ticket, messages });
});

// ─── PATCH /api/tickets/:id/status (ti, admin) ───────────────────────────────
router.patch(
  '/:id/status',
  authorize('ti', 'admin'),
  (req: Request, res: Response): void => {
    const ticketId = Number(req.params.id);
    const { status } = req.body;

    const VALID = ['open', 'in_progress', 'resolved', 'closed'];
    if (!VALID.includes(status)) {
      res.status(400).json({ error: 'Status inválido. Use: ' + VALID.join(', ') });
      return;
    }

    const exists = queryOne('SELECT id FROM tickets WHERE id = ?', [ticketId]);
    if (!exists) {
      res.status(404).json({ error: 'Chamado não encontrado' });
      return;
    }

    run('UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?', [status, now(), ticketId]);

    const ticket = queryOne(`${BASE_SELECT} WHERE t.id = ?`, [ticketId]);
    res.json({ ticket });
  }
);

// ─── PATCH /api/tickets/:id/assign (ti, admin) ───────────────────────────────
router.patch(
  '/:id/assign',
  authorize('ti', 'admin'),
  (req: Request, res: Response): void => {
    const ticketId  = Number(req.params.id);
    const { assigned_to } = req.body;

    const exists = queryOne('SELECT id FROM tickets WHERE id = ?', [ticketId]);
    if (!exists) {
      res.status(404).json({ error: 'Chamado não encontrado' });
      return;
    }

    // assigned_to pode ser null para remover atribuição
    const assignee = assigned_to ?? null;

    if (assignee !== null) {
      const tech = queryOne(
        "SELECT id FROM users WHERE id = ? AND role IN ('ti','admin')",
        [assignee]
      );
      if (!tech) {
        res.status(400).json({ error: 'Técnico não encontrado' });
        return;
      }
    }

    run(
      'UPDATE tickets SET assigned_to = ?, updated_at = ? WHERE id = ?',
      [assignee, now(), ticketId]
    );

    const ticket = queryOne(`${BASE_SELECT} WHERE t.id = ?`, [ticketId]);
    res.json({ ticket });
  }
);

export default router;

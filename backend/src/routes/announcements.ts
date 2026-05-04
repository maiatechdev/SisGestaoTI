import { Router, Request, Response } from 'express';
import { query, queryOne, run } from '../config/database';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

function now(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

const BASE_SELECT = `
  SELECT
    a.id, a.title, a.content, a.status,
    a.created_at, a.updated_at,
    a.created_by, u.name  AS created_by_name,
    a.reviewed_by, r.name AS reviewed_by_name
  FROM announcements a
  JOIN  users u ON u.id = a.created_by
  LEFT JOIN users r ON r.id = a.reviewed_by
`;

// ─── POST /api/announcements  (ti, admin) ────────────────────────────────────
router.post(
  '/',
  authorize('ti', 'admin'),
  (req: Request, res: Response): void => {
    const { title, content } = req.body;
    const user = req.user!;

    if (!title?.trim() || !content?.trim()) {
      res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
      return;
    }

    const ts = now();
    // admin publica direto como 'approved'; ti precisa de aprovação
    const status = user.role === 'admin' ? 'approved' : 'pending';
    const reviewed_by   = user.role === 'admin' ? user.id : null;

    const id = run(
      `INSERT INTO announcements (title, content, status, created_by, reviewed_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title.trim(), content.trim(), status, user.id, reviewed_by, ts, ts]
    );

    const announcement = queryOne(`${BASE_SELECT} WHERE a.id = ?`, [id]);
    res.status(201).json({ announcement });
  }
);

// ─── GET /api/announcements ──────────────────────────────────────────────────
router.get('/', (req: Request, res: Response): void => {
  const user = req.user!;

  let sql = BASE_SELECT;
  const params: (string | number)[] = [];
  const conditions: string[] = [];

  if (user.role === 'user') {
    // user: apenas aprovados
    conditions.push("a.status = 'approved'");
  } else if (user.role === 'ti') {
    // ti: aprovados + os próprios pendentes/rejeitados
    conditions.push("(a.status = 'approved' OR a.created_by = ?)");
    params.push(user.id);
  }
  // admin: sem filtro — vê todos

  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY a.created_at DESC';

  const announcements = query(sql, params);
  res.json({ announcements, total: announcements.length });
});

// ─── GET /api/announcements/:id ──────────────────────────────────────────────
router.get('/:id', (req: Request, res: Response): void => {
  const user = req.user!;
  const id   = Number(req.params.id);

  const announcement = queryOne<Record<string, unknown>>(`${BASE_SELECT} WHERE a.id = ?`, [id]);

  if (!announcement) {
    res.status(404).json({ error: 'Comunicado não encontrado' });
    return;
  }

  // user só lê aprovados
  if (user.role === 'user' && announcement.status !== 'approved') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  // ti só lê os aprovados ou os próprios
  if (
    user.role === 'ti' &&
    announcement.status !== 'approved' &&
    announcement.created_by !== user.id
  ) {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  res.json({ announcement });
});

// ─── PATCH /api/announcements/:id/review  (admin) ────────────────────────────
router.patch(
  '/:id/review',
  authorize('admin'),
  (req: Request, res: Response): void => {
    const user   = req.user!;
    const id     = Number(req.params.id);
    const { action, reason } = req.body;   // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      res.status(400).json({ error: "action deve ser 'approve' ou 'reject'" });
      return;
    }

    const announcement = queryOne<Record<string, unknown>>(
      'SELECT id, status FROM announcements WHERE id = ?',
      [id]
    );

    if (!announcement) {
      res.status(404).json({ error: 'Comunicado não encontrado' });
      return;
    }

    if (announcement.status !== 'pending') {
      res.status(409).json({ error: `Comunicado já está '${announcement.status}'` });
      return;
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const ts = now();

    run(
      'UPDATE announcements SET status = ?, reviewed_by = ?, updated_at = ? WHERE id = ?',
      [newStatus, user.id, ts, id]
    );

    const updated = queryOne(`${BASE_SELECT} WHERE a.id = ?`, [id]);
    res.json({ announcement: updated, reason: reason ?? null });
  }
);

// ─── DELETE /api/announcements/:id  (admin) ──────────────────────────────────
router.delete(
  '/:id',
  authorize('admin'),
  (req: Request, res: Response): void => {
    const id = Number(req.params.id);

    const exists = queryOne('SELECT id FROM announcements WHERE id = ?', [id]);
    if (!exists) {
      res.status(404).json({ error: 'Comunicado não encontrado' });
      return;
    }

    run('DELETE FROM announcements WHERE id = ?', [id]);
    res.json({ message: 'Comunicado removido' });
  }
);

export default router;

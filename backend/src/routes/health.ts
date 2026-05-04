import { Router, Request, Response } from 'express';
import { query } from '../config/database';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  try {
    const rows = query<{ ts: string }>('SELECT datetime("now") as ts');
    res.json({
      status: 'ok',
      message: 'Helpdesk API funcionando',
      db_time: rows[0]?.ts,
    });
  } catch {
    res.status(500).json({ status: 'error', message: 'Falha na conexão com o banco' });
  }
});

export default router;

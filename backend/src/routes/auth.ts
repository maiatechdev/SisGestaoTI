import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { queryOne } from '../config/database';
import { authenticate } from '../middlewares/auth';
import { User, JwtPayload } from '../types';

const router = Router();
const SECRET = process.env.JWT_SECRET || 'fallback_secret';

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    return;
  }

  const user = queryOne<User>('SELECT * FROM users WHERE email = ?', [email]);

  if (!user) {
    res.status(401).json({ error: 'Credenciais inválidas' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Credenciais inválidas' });
    return;
  }

  const payload: JwtPayload = {
    id:    user.id,
    name:  user.name,
    email: user.email,
    role:  user.role,
  };

  const token = jwt.sign(payload, SECRET, { expiresIn: '8h' });

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

// GET /api/auth/me  — retorna dados do usuário logado
router.get('/me', authenticate, (req: Request, res: Response): void => {
  res.json({ user: req.user });
});

export default router;

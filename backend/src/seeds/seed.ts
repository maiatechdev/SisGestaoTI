import bcrypt from 'bcryptjs';
import { initializeDatabase, query, run } from '../config/database';

async function seed(): Promise<void> {
  await initializeDatabase();

  const users = [
    { name: 'Admin Sistema', email: 'admin@helpdesk.com', password: 'admin123', role: 'admin' },
    { name: 'Técnico TI',    email: 'ti@helpdesk.com',    password: 'ti123456', role: 'ti'    },
    { name: 'João Usuário',  email: 'user@helpdesk.com',  password: 'user1234', role: 'user'  },
  ];

  for (const u of users) {
    const exists = query('SELECT id FROM users WHERE email = ?', [u.email]);
    if (exists.length > 0) {
      console.log(`[Seed] Já existe: ${u.email}`);
      continue;
    }
    const password_hash = await bcrypt.hash(u.password, 10);
    run(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [u.name, u.email, password_hash, u.role]
    );
    console.log(`[Seed] Criado: ${u.email} (${u.role})`);
  }

  console.log('[Seed] Concluído.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('[Seed] Erro:', err);
  process.exit(1);
});

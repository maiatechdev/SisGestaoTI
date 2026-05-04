import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './config/database';
import healthRouter  from './routes/health';
import authRouter    from './routes/auth';
import ticketsRouter       from './routes/tickets';
import announcementsRouter from './routes/announcements';
import { initWebSocket }   from './ws/chat';

dotenv.config();

const app    = express();
const server = http.createServer(app);   // HTTP server compartilhado com WS
const PORT   = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/health',  healthRouter);
app.use('/api/auth',    authRouter);
app.use('/api/tickets',       ticketsRouter);
app.use('/api/announcements', announcementsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

initializeDatabase().then(() => {
  initWebSocket(server);          // anexa WS ao mesmo servidor HTTP
  server.listen(PORT, () => {
    console.log(`[Server] Helpdesk API rodando em http://localhost:${PORT}`);
    console.log(`[Server] WebSocket disponível em  ws://localhost:${PORT}/ws`);
  });
}).catch((err) => {
  console.error('[Server] Erro ao inicializar banco:', err);
  process.exit(1);
});

export default app;

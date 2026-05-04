import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { URL } from 'url';
import { query, queryOne, run } from '../config/database';
import { JwtPayload } from '../types';

// ─── Tipos internos ──────────────────────────────────────────────────────────

interface AuthedSocket extends WebSocket {
  user:     JwtPayload;
  ticketId: number;
}

interface InboundMsg {
  type:    string;
  content?: string;
}

interface OutboundMsg {
  type:      string;
  message?:  Record<string, unknown>;
  messages?: Record<string, unknown>[];
  error?:    string;
}

// ─── Rooms: Map<ticketId, Set<socket>> ───────────────────────────────────────
const rooms = new Map<number, Set<AuthedSocket>>();

function joinRoom(ticketId: number, ws: AuthedSocket): void {
  if (!rooms.has(ticketId)) rooms.set(ticketId, new Set());
  rooms.get(ticketId)!.add(ws);
}

function leaveRoom(ticketId: number, ws: AuthedSocket): void {
  rooms.get(ticketId)?.delete(ws);
  if (rooms.get(ticketId)?.size === 0) rooms.delete(ticketId);
}

function broadcast(ticketId: number, payload: OutboundMsg, exclude?: WebSocket): void {
  const room = rooms.get(ticketId);
  if (!room) return;
  const data = JSON.stringify(payload);
  for (const client of room) {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

function send(ws: WebSocket, payload: OutboundMsg): void {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}

// ─── Autenticação via query string (?token=...&ticket=...) ───────────────────
function parseConnection(req: IncomingMessage): { user: JwtPayload; ticketId: number } | null {
  const secret = process.env.JWT_SECRET || 'fallback_secret';

  try {
    const url      = new URL(req.url!, `http://${req.headers.host}`);
    const token    = url.searchParams.get('token');
    const ticketId = Number(url.searchParams.get('ticket'));

    if (!token || !ticketId || isNaN(ticketId)) return null;

    const user = jwt.verify(token, secret) as JwtPayload;
    return { user, ticketId };
  } catch {
    return null;
  }
}

// ─── Validação de acesso ao ticket ───────────────────────────────────────────
function canAccessTicket(user: JwtPayload, ticketId: number): boolean {
  const ticket = queryOne<{ user_id: number }>(
    'SELECT user_id FROM tickets WHERE id = ?',
    [ticketId]
  );
  if (!ticket) return false;
  if (user.role !== 'user') return true;          // ti/admin acessam qualquer um
  return ticket.user_id === user.id;              // user só acessa o próprio
}

// ─── Inicializa o servidor WebSocket ─────────────────────────────────────────
export function initWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const conn = parseConnection(req);

    if (!conn) {
      send(ws, { type: 'error', error: 'Token ou ticketId inválido' });
      ws.close(4001, 'Unauthorized');
      return;
    }

    const { user, ticketId } = conn;

    if (!canAccessTicket(user, ticketId)) {
      send(ws, { type: 'error', error: 'Acesso negado ao chamado' });
      ws.close(4003, 'Forbidden');
      return;
    }

    const socket = ws as AuthedSocket;
    socket.user     = user;
    socket.ticketId = ticketId;

    joinRoom(ticketId, socket);
    console.log(`[WS] ${user.name} (${user.role}) conectou ao ticket #${ticketId}`);

    // Envia histórico de mensagens ao conectar
    const history = query<Record<string, unknown>>(`
      SELECT m.id, m.content, m.created_at, m.user_id, u.name AS user_name
      FROM messages m
      JOIN users u ON u.id = m.user_id
      WHERE m.ticket_id = ?
      ORDER BY m.created_at ASC
    `, [ticketId]);

    send(socket, { type: 'history', messages: history });

    // ─── Mensagem recebida do cliente ─────────────────────────────────────
    socket.on('message', (raw) => {
      let msg: InboundMsg;

      try {
        msg = JSON.parse(raw.toString()) as InboundMsg;
      } catch {
        send(socket, { type: 'error', error: 'Mensagem inválida (JSON esperado)' });
        return;
      }

      if (msg.type !== 'message' || !msg.content?.trim()) {
        send(socket, { type: 'error', error: 'Conteúdo vazio ou tipo inválido' });
        return;
      }

      const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const messageId = run(
        'INSERT INTO messages (ticket_id, user_id, content, created_at) VALUES (?, ?, ?, ?)',
        [ticketId, user.id, msg.content.trim(), ts]
      );

      const saved = queryOne<Record<string, unknown>>(`
        SELECT m.id, m.content, m.created_at, m.user_id, u.name AS user_name
        FROM messages m
        JOIN users u ON u.id = m.user_id
        WHERE m.id = ?
      `, [messageId]);

      const outbound: OutboundMsg = { type: 'message', message: saved };

      // Envia de volta ao remetente + broadcast para a room
      send(socket, outbound);
      broadcast(ticketId, outbound, socket);
    });

    // ─── Desconexão ───────────────────────────────────────────────────────
    socket.on('close', () => {
      leaveRoom(ticketId, socket);
      console.log(`[WS] ${user.name} desconectou do ticket #${ticketId}`);
    });

    socket.on('error', (err) => {
      console.error(`[WS] Erro no socket de ${user.name}:`, err.message);
    });
  });

  console.log('[WS] Servidor WebSocket iniciado em ws://localhost:3000/ws');
  return wss;
}

// Expõe rooms para uso externo (ex: notificações futuras)
export { rooms };

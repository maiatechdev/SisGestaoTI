import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = path.resolve(process.env.DB_PATH || './helpdesk.db');

let SQL: SqlJsStatic;
let db: Database;

// Persiste o banco em disco após cada operação de escrita
export function saveDb(): void {
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

// Executa DDL sem retorno — e salva automaticamente
export function exec(sql: string): void {
  db.run(sql);
  saveDb();
}

// SELECT que retorna array de objetos
export function query<T = Record<string, unknown>>(
  sql: string,
  params: (string | number | null)[] = []
): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

// SELECT que retorna apenas a primeira linha (ou undefined)
export function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: (string | number | null)[] = []
): T | undefined {
  const rows = query<T>(sql, params);
  return rows[0];
}

// INSERT / UPDATE / DELETE — retorna lastInsertRowid
export function run(
  sql: string,
  params: (string | number | null)[] = []
): number {
  db.run(sql, params);
  const [{ id }] = query<{ id: number }>('SELECT last_insert_rowid() as id');
  saveDb();
  return id;
}

export async function initializeDatabase(): Promise<void> {
  SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'ti', 'admin')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open'
        CHECK(status IN ('open', 'in_progress', 'resolved', 'closed')),
      priority TEXT NOT NULL DEFAULT 'medium'
        CHECK(priority IN ('low', 'medium', 'high', 'critical')),
      category TEXT NOT NULL DEFAULT 'general',
      user_id INTEGER NOT NULL REFERENCES users(id),
      assigned_to INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending', 'approved', 'rejected')),
      created_by INTEGER NOT NULL REFERENCES users(id),
      reviewed_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  saveDb();
  console.log('[DB] Banco inicializado:', dbPath);
}

export function getDb(): Database {
  return db;
}

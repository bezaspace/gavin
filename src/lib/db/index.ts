import Database from "better-sqlite3";
import { join } from "path";
import { mkdirSync } from "fs";

const dataDir = join(process.cwd(), "data");
mkdirSync(dataDir, { recursive: true });

const dbPath = join(dataDir, "gavin.db");
const db = new Database(dbPath);

function hasColumn(table: string, column: string): boolean {
  const stmt = db.prepare(`PRAGMA table_info(${table})`);
  const columns = stmt.all() as Array<{ name: string }>;
  return columns.some((entry) => entry.name === column);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    serial_number INTEGER,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    start_time TEXT DEFAULT '',
    end_time TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    created_at TEXT NOT NULL
  );
`);

if (!hasColumn("tasks", "serial_number")) {
  db.exec(`ALTER TABLE tasks ADD COLUMN serial_number INTEGER`);
}
if (!hasColumn("tasks", "notes")) {
  db.exec(`ALTER TABLE tasks ADD COLUMN notes TEXT DEFAULT ''`);
}
if (!hasColumn("tasks", "start_time")) {
  db.exec(`ALTER TABLE tasks ADD COLUMN start_time TEXT DEFAULT ''`);
}
if (!hasColumn("tasks", "end_time")) {
  db.exec(`ALTER TABLE tasks ADD COLUMN end_time TEXT DEFAULT ''`);
}

const serials = db
  .prepare(
    `
      SELECT id
      FROM tasks
      WHERE serial_number IS NULL
      ORDER BY datetime(created_at) ASC, rowid ASC
    `
  )
  .all() as Array<{ id: string }>;

if (serials.length > 0) {
  const nextSerialStmt = db.prepare(`
    SELECT COALESCE(MAX(serial_number), 0) + 1 AS next_serial
    FROM tasks
    WHERE serial_number IS NOT NULL
  `);
  const updateSerialStmt = db.prepare(
    "UPDATE tasks SET serial_number = ? WHERE id = ?"
  );

  let nextSerial = (nextSerialStmt.get() as { next_serial: number }).next_serial;
  const assignSerials = db.transaction((rows: Array<{ id: string }>) => {
    for (const row of rows) {
      updateSerialStmt.run(nextSerial, row.id);
      nextSerial += 1;
    }
  });

  assignSerials(serials);
}

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_serial_number ON tasks(serial_number);
  CREATE INDEX IF NOT EXISTS idx_created_at ON tasks(created_at DESC);
`);

export { db };

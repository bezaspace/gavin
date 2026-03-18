import Database from "better-sqlite3";
import { join } from "path";
import { mkdirSync } from "fs";

const dataDir = join(process.cwd(), "data");
mkdirSync(dataDir, { recursive: true });

const dbPath = join(dataDir, "gavin.db");
const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

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
    project_id TEXT DEFAULT NULL,
    start_time TEXT DEFAULT '',
    end_time TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    current_attempt_number INTEGER DEFAULT 1,
    reassignment_count INTEGER DEFAULT 0,
    completed_at TEXT DEFAULT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    serial_number INTEGER,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS task_attempts (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    attempt_number INTEGER NOT NULL,
    scheduled_start_time TEXT NOT NULL,
    scheduled_end_time TEXT NOT NULL,
    outcome TEXT NOT NULL DEFAULT 'scheduled',
    reason TEXT DEFAULT '',
    completion_notes TEXT DEFAULT '',
    reassigned_start_time TEXT DEFAULT '',
    reassigned_end_time TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    resolved_at TEXT DEFAULT NULL,
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS task_subtasks (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    title TEXT NOT NULL,
    is_completed INTEGER NOT NULL DEFAULT 0,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    completed_at TEXT DEFAULT NULL,
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );
`);

if (!hasColumn("tasks", "serial_number")) {
  db.exec(`ALTER TABLE tasks ADD COLUMN serial_number INTEGER`);
}
if (!hasColumn("tasks", "notes")) {
  db.exec(`ALTER TABLE tasks ADD COLUMN notes TEXT DEFAULT ''`);
}
if (!hasColumn("tasks", "project_id")) {
  db.exec(`ALTER TABLE tasks ADD COLUMN project_id TEXT DEFAULT NULL`);
}
if (!hasColumn("tasks", "start_time")) {
  db.exec(`ALTER TABLE tasks ADD COLUMN start_time TEXT DEFAULT ''`);
}
if (!hasColumn("tasks", "end_time")) {
  db.exec(`ALTER TABLE tasks ADD COLUMN end_time TEXT DEFAULT ''`);
}
if (!hasColumn("tasks", "current_attempt_number")) {
  db.exec(`ALTER TABLE tasks ADD COLUMN current_attempt_number INTEGER DEFAULT 1`);
}
if (!hasColumn("tasks", "reassignment_count")) {
  db.exec(`ALTER TABLE tasks ADD COLUMN reassignment_count INTEGER DEFAULT 0`);
}
if (!hasColumn("tasks", "completed_at")) {
  db.exec(`ALTER TABLE tasks ADD COLUMN completed_at TEXT DEFAULT NULL`);
}

if (!hasColumn("projects", "serial_number")) {
  db.exec(`ALTER TABLE projects ADD COLUMN serial_number INTEGER`);
}
if (!hasColumn("projects", "description")) {
  db.exec(`ALTER TABLE projects ADD COLUMN description TEXT DEFAULT ''`);
}
if (!hasColumn("projects", "notes")) {
  db.exec(`ALTER TABLE projects ADD COLUMN notes TEXT DEFAULT ''`);
}
if (!hasColumn("projects", "updated_at")) {
  db.exec(`ALTER TABLE projects ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''`);
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

db.prepare(
  `
    UPDATE tasks
    SET current_attempt_number = 1
    WHERE current_attempt_number IS NULL OR current_attempt_number < 1
  `
).run();

db.prepare(
  `
    UPDATE tasks
    SET reassignment_count = 0
    WHERE reassignment_count IS NULL OR reassignment_count < 0
  `
).run();

const tasksMissingAttempts = db
  .prepare(
    `
      SELECT id, start_time, end_time, created_at
      FROM tasks
      WHERE NOT EXISTS (
        SELECT 1 FROM task_attempts WHERE task_attempts.task_id = tasks.id
      )
    `
  )
  .all() as Array<{
    id: string;
    start_time: string;
    end_time: string;
    created_at: string;
  }>;

if (tasksMissingAttempts.length > 0) {
  const insertAttemptStmt = db.prepare(`
    INSERT INTO task_attempts (
      id,
      task_id,
      attempt_number,
      scheduled_start_time,
      scheduled_end_time,
      outcome,
      reason,
      completion_notes,
      reassigned_start_time,
      reassigned_end_time,
      created_at,
      resolved_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seedAttempts = db.transaction(
    (rows: Array<{ id: string; start_time: string; end_time: string; created_at: string }>) => {
      for (const row of rows) {
        insertAttemptStmt.run(
          `attempt_${row.id}_1`,
          row.id,
          1,
          row.start_time ?? "",
          row.end_time ?? "",
          "scheduled",
          "",
          "",
          "",
          "",
          row.created_at,
          null
        );
      }
    }
  );

  seedAttempts(tasksMissingAttempts);
}

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_serial_number ON tasks(serial_number);
  CREATE INDEX IF NOT EXISTS idx_created_at ON tasks(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_serial_number ON projects(serial_number);
  CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_task_attempts_task_id ON task_attempts(task_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_task_attempts_task_attempt
    ON task_attempts(task_id, attempt_number);
  CREATE INDEX IF NOT EXISTS idx_task_attempts_created_at ON task_attempts(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_task_subtasks_task_id ON task_subtasks(task_id);
  CREATE INDEX IF NOT EXISTS idx_task_subtasks_order
    ON task_subtasks(task_id, order_index, created_at);
`);

export { db };

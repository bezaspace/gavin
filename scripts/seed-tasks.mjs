#!/usr/bin/env node

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const dataDir = join(process.cwd(), "data");
mkdirSync(dataDir, { recursive: true });

const dbPath = join(dataDir, "gavin.db");
const db = new Database(dbPath);

function hasColumn(table, column) {
  const stmt = db.prepare(`PRAGMA table_info(${table})`);
  const columns = stmt.all();
  return columns.some((entry) => entry.name === column);
}

function ensureSchema() {
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

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_serial_number ON tasks(serial_number);
    CREATE INDEX IF NOT EXISTS idx_created_at ON tasks(created_at DESC);
  `);
}

const tasks = [
  {
    title: "Draft weekly standup notes",
    description: "Summarize blockers and owner updates before the morning sync.",
    notes: "Pull in notes from Slack and last week's action items.",
    startTime: "08:00",
    endTime: "08:30",
    status: "pending",
    priority: "medium",
  },
  {
    title: "Review inbox triage",
    description: "Clear urgent mail and label follow-ups for later.",
    notes: "Focus on client replies first.",
    startTime: "08:45",
    endTime: "09:15",
    status: "pending",
    priority: "low",
  },
  {
    title: "Prepare project status update",
    description: "Refresh the delivery summary for leadership review.",
    notes: "Include timeline risks and completed milestones.",
    startTime: "09:30",
    endTime: "10:15",
    status: "in_progress",
    priority: "high",
  },
  {
    title: "Fix login bug",
    description: "Investigate the authentication failure on mobile Safari.",
    notes: "Check cookie handling and session expiry.",
    startTime: "10:30",
    endTime: "11:30",
    status: "in_progress",
    priority: "high",
  },
  {
    title: "Sync with design team",
    description: "Align on spacing updates for the new task card layout.",
    notes: "Ask for updated icon assets.",
    startTime: "11:45",
    endTime: "12:15",
    status: "pending",
    priority: "medium",
  },
  {
    title: "Write API integration tests",
    description: "Cover task creation, update, and delete endpoints.",
    notes: "Add payload validation cases too.",
    startTime: "13:00",
    endTime: "14:00",
    status: "pending",
    priority: "high",
  },
  {
    title: "Update onboarding docs",
    description: "Document the new notes and schedule fields.",
    notes: "Show both chat-based creation and API usage.",
    startTime: "14:15",
    endTime: "15:00",
    status: "pending",
    priority: "medium",
  },
  {
    title: "Plan sprint backlog",
    description: "Prioritize the next development cycle items.",
    notes: "Move the bug fixes above polish work.",
    startTime: "15:15",
    endTime: "16:00",
    status: "pending",
    priority: "medium",
  },
  {
    title: "Clean up task UI spacing",
    description: "Tighten alignment and spacing in the sidebar cards.",
    notes: "Check compact view on smaller screens.",
    startTime: "16:15",
    endTime: "17:00",
    status: "completed",
    priority: "low",
  },
  {
    title: "Reconcile analytics dashboard",
    description: "Compare chart totals against the source data export.",
    notes: "The revenue chart seems off by one day.",
    startTime: "09:00",
    endTime: "09:45",
    status: "pending",
    priority: "medium",
  },
  {
    title: "Refine task card shadows",
    description: "Make active cards feel slightly more lifted.",
    notes: "Keep the HUD style subtle.",
    startTime: "10:00",
    endTime: "10:30",
    status: "pending",
    priority: "low",
  },
  {
    title: "Review deployment checklist",
    description: "Confirm all pre-release steps are current.",
    notes: "Double-check env variables and migrations.",
    startTime: "10:45",
    endTime: "11:15",
    status: "completed",
    priority: "medium",
  },
  {
    title: "Prep demo script",
    description: "Outline the flow for the next product walkthrough.",
    notes: "Start with task creation, then editing notes.",
    startTime: "11:30",
    endTime: "12:00",
    status: "pending",
    priority: "high",
  },
  {
    title: "Validate mobile layout",
    description: "Check sidebar stacking and scrolling behavior.",
    notes: "Use a narrow viewport and long notes.",
    startTime: "12:15",
    endTime: "13:00",
    status: "pending",
    priority: "medium",
  },
  {
    title: "Audit task serial numbers",
    description: "Confirm ordering and numbering stay stable after inserts.",
    notes: "Watch for gaps after deletes.",
    startTime: "13:15",
    endTime: "13:45",
    status: "pending",
    priority: "low",
  },
  {
    title: "Clean obsolete data rows",
    description: "Remove stale fixtures and test entries from the database.",
    notes: "Take a backup snapshot before pruning anything.",
    startTime: "14:00",
    endTime: "14:30",
    status: "in_progress",
    priority: "high",
  },
  {
    title: "Schedule customer follow-up",
    description: "Pick a time to send the revised proposal.",
    notes: "Include a short summary of the changes.",
    startTime: "14:45",
    endTime: "15:15",
    status: "pending",
    priority: "medium",
  },
  {
    title: "Polish empty state messaging",
    description: "Improve the copy when no tasks are available.",
    notes: "Keep it direct and tactical.",
    startTime: "15:30",
    endTime: "16:00",
    status: "completed",
    priority: "low",
  },
  {
    title: "Review chat agent prompt",
    description: "Tighten instructions for task creation behavior.",
    notes: "Make sure it asks for time ranges.",
    startTime: "16:15",
    endTime: "16:45",
    status: "pending",
    priority: "high",
  },
  {
    title: "Archive finished sprint notes",
    description: "Move completed items to the reference folder.",
    notes: "Store the summary alongside the release checklist.",
    startTime: "17:00",
    endTime: "17:30",
    status: "completed",
    priority: "low",
  },
];

function resetAndSeed() {
  ensureSchema();

  db.prepare("DELETE FROM tasks").run();

  const insertStmt = db.prepare(`
    INSERT INTO tasks (
      id,
      serial_number,
      title,
      description,
      notes,
      start_time,
      end_time,
      status,
      priority,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = Date.now();
  const insertMany = db.transaction((rows) => {
    rows.forEach((task, index) => {
      const serialNumber = index + 1;
      insertStmt.run(
        `task_${serialNumber}_${randomUUID().slice(0, 8)}`,
        serialNumber,
        task.title,
        task.description,
        task.notes,
        task.startTime,
        task.endTime,
        task.status,
        task.priority,
        new Date(now - index * 60_000).toISOString()
      );
    });
  });

  insertMany(tasks);
}

resetAndSeed();
console.log(`Seeded ${tasks.length} tasks into ${dbPath}`);

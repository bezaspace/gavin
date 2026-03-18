#!/usr/bin/env node

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

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
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      serial_number INTEGER,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

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
      created_at TEXT NOT NULL
    );
  `);

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

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_serial_number ON projects(serial_number);
    CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_serial_number ON tasks(serial_number);
    CREATE INDEX IF NOT EXISTS idx_created_at ON tasks(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
  `);
}

const projects = [
  {
    title: "Atlas Console Refresh",
    description: "Revamp the project and task surfaces into a sharper tactical HUD flow.",
    notes:
      "Primary UI modernization effort. Focus on card clarity, modal hierarchy, and responsive layout discipline.",
  },
  {
    title: "Beacon API Hardening",
    description: "Stabilize task and project endpoints with validation and migration-safe behavior.",
    notes:
      "Track schema changes, payload validation, and safe fallbacks for old rows during iterative development.",
  },
  {
    title: "Cinder Mobile Pass",
    description: "Audit compact layouts and ensure tactical density still works on smaller screens.",
    notes:
      "Target mobile stacking, scroll handling, readable spacing, and low-friction task interaction patterns.",
  },
  {
    title: "Drift Ops Dashboard",
    description: "Build richer project-linked operations visibility across active work items.",
    notes:
      "This stream centers on linked tasks, status visibility, and keeping the operator informed at a glance.",
  },
  {
    title: "Ember Launch Prep",
    description: "Prepare release-facing polish, demo stories, and rollout confidence checks.",
    notes:
      "Use this project to validate that product narrative, QA evidence, and stakeholder prep all stay organized.",
  },
];

const tasksByProject = [
  [
    {
      title: "Map card hierarchy",
      description: "Define the final density and spacing rhythm for project cards.",
      notes: "Keep borders sharp and preserve the tactical HUD tone.",
      startTime: "08:00",
      endTime: "08:45",
      status: "in_progress",
      priority: "high",
    },
    {
      title: "Polish modal header actions",
      description: "Refine the placement of edit and create-task controls.",
      notes: "Header buttons should stay small, technical, and easy to scan.",
      startTime: "09:00",
      endTime: "09:30",
      status: "pending",
      priority: "medium",
    },
    {
      title: "Tune project empty state",
      description: "Make the no-project state feel purposeful instead of blank.",
      notes: "Keep the copy direct and avoid decorative filler.",
      startTime: "09:45",
      endTime: "10:15",
      status: "pending",
      priority: "low",
    },
    {
      title: "Review card hover feedback",
      description: "Confirm hover states stay subtle and readable on desktop.",
      notes: "No glow or heavy effects; just enough response to imply interactivity.",
      startTime: "10:30",
      endTime: "11:00",
      status: "completed",
      priority: "low",
    },
    {
      title: "Capture before-and-after screenshots",
      description: "Document the refreshed projects experience for review.",
      notes: "Include grid, modal, and create-task flows.",
      startTime: "11:15",
      endTime: "12:00",
      status: "pending",
      priority: "medium",
    },
  ],
  [
    {
      title: "Validate task payload contracts",
      description: "Check task creation and update requests for missing field edge cases.",
      notes: "Include project linkage validation and not-found responses.",
      startTime: "08:15",
      endTime: "09:00",
      status: "pending",
      priority: "high",
    },
    {
      title: "Audit migration safety",
      description: "Ensure added task columns work against older databases.",
      notes: "Pay attention to nullable project links and default values.",
      startTime: "09:15",
      endTime: "10:00",
      status: "in_progress",
      priority: "high",
    },
    {
      title: "Review delete project behavior",
      description: "Confirm linked tasks become unassigned instead of being lost.",
      notes: "This should be safe and predictable for operators.",
      startTime: "10:15",
      endTime: "10:45",
      status: "pending",
      priority: "medium",
    },
    {
      title: "Document project-aware task API",
      description: "Write usage notes for projectId in POST and PATCH routes.",
      notes: "Mention chat references by title and serial number.",
      startTime: "11:00",
      endTime: "11:45",
      status: "completed",
      priority: "medium",
    },
    {
      title: "Spot-check database indexes",
      description: "Verify the new project task index supports filtered reads cleanly.",
      notes: "Focus on task lookups scoped to a single project.",
      startTime: "12:00",
      endTime: "12:30",
      status: "pending",
      priority: "low",
    },
  ],
  [
    {
      title: "Check narrow modal layout",
      description: "Inspect the project modal on smaller viewport widths.",
      notes: "Ensure the tasks list and notes area stay legible.",
      startTime: "08:30",
      endTime: "09:00",
      status: "pending",
      priority: "medium",
    },
    {
      title: "Stress-test long task labels",
      description: "Use lengthy titles and descriptions to inspect wrapping behavior.",
      notes: "Look for collisions between timestamps and project badges.",
      startTime: "09:15",
      endTime: "09:45",
      status: "pending",
      priority: "medium",
    },
    {
      title: "Verify mobile scroll handoff",
      description: "Confirm nested modal and page scrolling remain stable.",
      notes: "Pay close attention to the linked tasks section.",
      startTime: "10:00",
      endTime: "10:45",
      status: "in_progress",
      priority: "high",
    },
    {
      title: "Review touch target sizing",
      description: "Make sure small tactical buttons still work on touch devices.",
      notes: "Edit, close, and create-task actions need a clean hit area.",
      startTime: "11:00",
      endTime: "11:30",
      status: "pending",
      priority: "medium",
    },
    {
      title: "Capture mobile QA notes",
      description: "Summarize the key viewport-specific issues and wins.",
      notes: "Use direct language and keep the report actionable.",
      startTime: "11:45",
      endTime: "12:15",
      status: "completed",
      priority: "low",
    },
  ],
  [
    {
      title: "Link active tasks to projects",
      description: "Assign operational work items to the right project streams.",
      notes: "Use this pass to validate project-aware task visibility.",
      startTime: "08:00",
      endTime: "08:30",
      status: "completed",
      priority: "medium",
    },
    {
      title: "Design task summary rows",
      description: "Make project modal task rows scannable at a glance.",
      notes: "Serial, time, title, status, and priority should read fast.",
      startTime: "08:45",
      endTime: "09:30",
      status: "pending",
      priority: "high",
    },
    {
      title: "Review project metrics framing",
      description: "Decide which numbers belong on the project card surface.",
      notes: "Task count and recency are the likely top candidates.",
      startTime: "09:45",
      endTime: "10:15",
      status: "pending",
      priority: "low",
    },
    {
      title: "Test project filtered API reads",
      description: "Make sure `/api/tasks?projectId=` returns only linked tasks.",
      notes: "This powers the modal task list directly.",
      startTime: "10:30",
      endTime: "11:00",
      status: "completed",
      priority: "high",
    },
    {
      title: "Prepare ops walkthrough",
      description: "Outline a short demo of linked projects and tasks working together.",
      notes: "Start in projects, then jump to the task queue.",
      startTime: "11:15",
      endTime: "12:00",
      status: "pending",
      priority: "medium",
    },
  ],
  [
    {
      title: "Assemble launch checklist",
      description: "Collect the final set of pre-release verification steps.",
      notes: "Include UI pass, API pass, and seeded data pass.",
      startTime: "08:30",
      endTime: "09:15",
      status: "pending",
      priority: "high",
    },
    {
      title: "Write demo talking points",
      description: "Frame the story for project-linked execution in the app.",
      notes: "Mention chat-based task creation and in-project task creation.",
      startTime: "09:30",
      endTime: "10:00",
      status: "in_progress",
      priority: "medium",
    },
    {
      title: "Review stakeholder screenshots",
      description: "Curate the cleanest views for the release summary.",
      notes: "Show projects with varied task states so the linkage is obvious.",
      startTime: "10:15",
      endTime: "10:45",
      status: "pending",
      priority: "medium",
    },
    {
      title: "Check final wording pass",
      description: "Tighten microcopy across modals and empty states.",
      notes: "Keep everything short, precise, and tactical.",
      startTime: "11:00",
      endTime: "11:30",
      status: "completed",
      priority: "low",
    },
    {
      title: "Run readiness review",
      description: "Do one last integrated pass over projects, tasks, and chat flows.",
      notes: "Use seeded data to confirm everything reads coherently.",
      startTime: "11:45",
      endTime: "12:30",
      status: "pending",
      priority: "high",
    },
  ],
];

function resetAndSeed() {
  ensureSchema();

  db.prepare("DELETE FROM tasks").run();
  db.prepare("DELETE FROM projects").run();

  const insertProjectStmt = db.prepare(`
    INSERT INTO projects (
      id,
      serial_number,
      title,
      description,
      notes,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTaskStmt = db.prepare(`
    INSERT INTO tasks (
      id,
      serial_number,
      title,
      description,
      notes,
      project_id,
      start_time,
      end_time,
      status,
      priority,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = Date.now();
  const seedAll = db.transaction(() => {
    projects.forEach((project, projectIndex) => {
      const projectId = `project_${projectIndex + 1}_${randomUUID().slice(0, 8)}`;
      const projectSerialNumber = projectIndex + 1;
      const projectCreatedAt = new Date(now - projectIndex * 3_600_000).toISOString();
      const projectUpdatedAt = new Date(now - projectIndex * 1_800_000).toISOString();

      insertProjectStmt.run(
        projectId,
        projectSerialNumber,
        project.title,
        project.description,
        project.notes,
        projectCreatedAt,
        projectUpdatedAt
      );

      tasksByProject[projectIndex].forEach((task, taskIndex) => {
        const serialNumber = projectIndex * 5 + taskIndex + 1;
        insertTaskStmt.run(
          `task_${serialNumber}_${randomUUID().slice(0, 8)}`,
          serialNumber,
          task.title,
          task.description,
          task.notes,
          projectId,
          task.startTime,
          task.endTime,
          task.status,
          task.priority,
          new Date(now - serialNumber * 60_000).toISOString()
        );
      });
    });
  });

  seedAll();
}

resetAndSeed();
console.log(`Seeded ${projects.length} projects and 25 tasks into ${dbPath}`);

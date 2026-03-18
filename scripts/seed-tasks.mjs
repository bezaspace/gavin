#!/usr/bin/env node

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

const dataDir = join(process.cwd(), "data");
mkdirSync(dataDir, { recursive: true });

const dbPath = join(dataDir, "gavin.db");
const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

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
      current_attempt_number INTEGER DEFAULT 1,
      reassignment_count INTEGER DEFAULT 0,
      completed_at TEXT DEFAULT NULL,
      created_at TEXT NOT NULL
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
  if (!hasColumn("tasks", "current_attempt_number")) {
    db.exec(`ALTER TABLE tasks ADD COLUMN current_attempt_number INTEGER DEFAULT 1`);
  }
  if (!hasColumn("tasks", "reassignment_count")) {
    db.exec(`ALTER TABLE tasks ADD COLUMN reassignment_count INTEGER DEFAULT 0`);
  }
  if (!hasColumn("tasks", "completed_at")) {
    db.exec(`ALTER TABLE tasks ADD COLUMN completed_at TEXT DEFAULT NULL`);
  }

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_serial_number ON projects(serial_number);
    CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_serial_number ON tasks(serial_number);
    CREATE INDEX IF NOT EXISTS idx_created_at ON tasks(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_task_attempts_task_id ON task_attempts(task_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_task_attempts_task_attempt
      ON task_attempts(task_id, attempt_number);
    CREATE INDEX IF NOT EXISTS idx_task_subtasks_task_id ON task_subtasks(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_subtasks_order
      ON task_subtasks(task_id, order_index, created_at);
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
      notes: "Captured spacing rules and card edge cases for the current attempt.",
      startTime: "08:00",
      endTime: "08:45",
      status: "in_progress",
      priority: "high",
      attempts: [
        {
          scheduledStartTime: "07:00",
          scheduledEndTime: "07:30",
          outcome: "missed",
          reason: "Pulled into a design review that overran.",
          reassignedStartTime: "08:00",
          reassignedEndTime: "08:45",
        },
        {
          scheduledStartTime: "08:00",
          scheduledEndTime: "08:45",
          outcome: "scheduled",
        },
      ],
      subtasks: [
        { title: "Review current project card density", isCompleted: true },
        { title: "List spacing exceptions", isCompleted: false },
        { title: "Capture updated hierarchy notes", isCompleted: false },
      ],
    },
    {
      title: "Polish modal header actions",
      description: "Refine the placement of edit and create-task controls.",
      notes: "Header buttons should stay small, technical, and easy to scan.",
      startTime: "09:00",
      endTime: "09:30",
      status: "pending",
      priority: "medium",
      subtasks: [
        { title: "Audit edit button position", isCompleted: false },
        { title: "Compare create-task button spacing", isCompleted: false },
      ],
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
      notes: "Validated hover behavior against the tactical palette.",
      startTime: "10:30",
      endTime: "11:00",
      status: "completed",
      priority: "low",
      attempts: [
        {
          scheduledStartTime: "10:30",
          scheduledEndTime: "11:00",
          outcome: "completed",
          completionNotes: "Reviewed hover borders and softened the inactive state without adding glow.",
        },
      ],
      subtasks: [
        { title: "Check hover border alpha", isCompleted: true },
        { title: "Verify hover state on card grid", isCompleted: true },
      ],
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
      subtasks: [
        { title: "Test missing startTime validation", isCompleted: false },
        { title: "Test missing endTime validation", isCompleted: false },
      ],
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
      notes: "Documented payload expectations and examples for linked tasks.",
      startTime: "11:00",
      endTime: "11:45",
      status: "completed",
      priority: "medium",
      attempts: [
        {
          scheduledStartTime: "10:00",
          scheduledEndTime: "10:30",
          outcome: "missed",
          reason: "Needed API examples from the project flow first.",
          reassignedStartTime: "11:00",
          reassignedEndTime: "11:45",
        },
        {
          scheduledStartTime: "11:00",
          scheduledEndTime: "11:45",
          outcome: "completed",
          completionNotes: "Wrote the request notes after validating POST and PATCH behavior with project references.",
        },
      ],
      subtasks: [
        { title: "Verify projectId docs", isCompleted: true },
        { title: "Add serial number example", isCompleted: true },
      ],
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
      subtasks: [
        { title: "Test modal body scroll", isCompleted: true },
        { title: "Test page-to-modal scroll handoff", isCompleted: false },
      ],
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
      notes: "Logged the viewport findings and next fixes.",
      startTime: "11:45",
      endTime: "12:15",
      status: "completed",
      priority: "low",
      attempts: [
        {
          scheduledStartTime: "11:45",
          scheduledEndTime: "12:15",
          outcome: "completed",
          completionNotes: "Summarized scroll, density, and touch-target findings into a short QA note set.",
        },
      ],
      subtasks: [
        { title: "Summarize touch findings", isCompleted: true },
        { title: "List viewport-specific issues", isCompleted: true },
      ],
    },
  ],
  [
    {
      title: "Link active tasks to projects",
      description: "Assign operational work items to the right project streams.",
      notes: "Validated project-aware task visibility with linked work items.",
      startTime: "08:00",
      endTime: "08:30",
      status: "completed",
      priority: "medium",
      attempts: [
        {
          scheduledStartTime: "08:00",
          scheduledEndTime: "08:30",
          outcome: "completed",
          completionNotes: "Matched the active task set to the project streams and verified the resulting visibility.",
        },
      ],
      subtasks: [
        { title: "Confirm linked task rows", isCompleted: true },
        { title: "Validate project counts manually", isCompleted: false },
      ],
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
      attempts: [
        {
          scheduledStartTime: "10:30",
          scheduledEndTime: "11:00",
          outcome: "completed",
          completionNotes: "Confirmed the filtered API only returns tasks bound to the active project id.",
        },
      ],
      subtasks: [
        { title: "Call filtered endpoint", isCompleted: true },
        { title: "Confirm unrelated tasks are excluded", isCompleted: true },
      ],
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
      subtasks: [
        { title: "Outline intro framing", isCompleted: true },
        { title: "Add task-history talking point", isCompleted: false },
      ],
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
      notes: "Tightened the remaining empty-state copy and action labels.",
      startTime: "11:00",
      endTime: "11:30",
      status: "completed",
      priority: "low",
      attempts: [
        {
          scheduledStartTime: "11:00",
          scheduledEndTime: "11:30",
          outcome: "completed",
          completionNotes: "Reviewed modal labels and empty-state copy to keep the language concise and tactical.",
        },
      ],
      subtasks: [
        { title: "Review modal microcopy", isCompleted: true },
        { title: "Review empty state wording", isCompleted: true },
      ],
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

function buildAttempts(task, taskCreatedAt) {
  const attempts = task.attempts ?? [
    {
      scheduledStartTime: task.startTime,
      scheduledEndTime: task.endTime,
      outcome: task.status === "completed" ? "completed" : "scheduled",
      completionNotes: task.status === "completed" ? task.notes : "",
    },
  ];

  return attempts.map((attempt, index) => ({
    id: `attempt_${randomUUID().slice(0, 8)}`,
    attemptNumber: index + 1,
    scheduledStartTime: attempt.scheduledStartTime,
    scheduledEndTime: attempt.scheduledEndTime,
    outcome: attempt.outcome,
    reason: attempt.reason ?? "",
    completionNotes: attempt.completionNotes ?? "",
    reassignedStartTime: attempt.reassignedStartTime ?? "",
    reassignedEndTime: attempt.reassignedEndTime ?? "",
    createdAt: new Date(new Date(taskCreatedAt).getTime() + index * 60_000).toISOString(),
    resolvedAt:
      attempt.outcome === "scheduled"
        ? null
        : new Date(new Date(taskCreatedAt).getTime() + index * 60_000 + 30_000).toISOString(),
  }));
}

function buildSubtasks(task, taskCreatedAt) {
  return (task.subtasks ?? []).map((subtask, index) => {
    const createdAt = new Date(
      new Date(taskCreatedAt).getTime() + (index + 1) * 15_000
    ).toISOString();

    return {
      id: `subtask_${randomUUID().slice(0, 8)}`,
      title: subtask.title,
      isCompleted: Boolean(subtask.isCompleted),
      orderIndex: index,
      createdAt,
      completedAt: subtask.isCompleted ? createdAt : null,
    };
  });
}

function resetAndSeed() {
  ensureSchema();

  db.prepare("DELETE FROM task_subtasks").run();
  db.prepare("DELETE FROM task_attempts").run();
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
      current_attempt_number,
      reassignment_count,
      completed_at,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

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

  const insertSubtaskStmt = db.prepare(`
    INSERT INTO task_subtasks (
      id,
      task_id,
      title,
      is_completed,
      order_index,
      created_at,
      completed_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
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
        const taskId = `task_${serialNumber}_${randomUUID().slice(0, 8)}`;
        const taskCreatedAt = new Date(now - serialNumber * 60_000).toISOString();
        const attempts = buildAttempts(task, taskCreatedAt);
        const subtasks = buildSubtasks(task, taskCreatedAt);
        const latestAttempt = attempts[attempts.length - 1];
        const reassignmentCount = attempts.filter((attempt) => attempt.outcome === "missed").length;
        const completionAttempt = attempts.findLast((attempt) => attempt.outcome === "completed");

        insertTaskStmt.run(
          taskId,
          serialNumber,
          task.title,
          task.description,
          task.notes,
          projectId,
          latestAttempt.scheduledStartTime,
          latestAttempt.scheduledEndTime,
          task.status,
          task.priority,
          latestAttempt.attemptNumber,
          reassignmentCount,
          completionAttempt?.resolvedAt ?? null,
          taskCreatedAt
        );

        attempts.forEach((attempt) => {
          insertAttemptStmt.run(
            attempt.id,
            taskId,
            attempt.attemptNumber,
            attempt.scheduledStartTime,
            attempt.scheduledEndTime,
            attempt.outcome,
            attempt.reason,
            attempt.completionNotes,
            attempt.reassignedStartTime,
            attempt.reassignedEndTime,
            attempt.createdAt,
            attempt.resolvedAt
          );
        });

        subtasks.forEach((subtask) => {
          insertSubtaskStmt.run(
            subtask.id,
            taskId,
            subtask.title,
            subtask.isCompleted ? 1 : 0,
            subtask.orderIndex,
            subtask.createdAt,
            subtask.completedAt
          );
        });
      });
    });
  });

  seedAll();
}

resetAndSeed();
console.log(`Seeded ${projects.length} projects and 25 tasks with attempt history into ${dbPath}`);

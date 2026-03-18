import { db } from "../db";
import type { Task, TaskAttempt, TaskPriority, TaskSubtask } from "./types";

let taskIdCounter = 0;
let attemptIdCounter = 0;
let subtaskIdCounter = 0;

function generateTaskId(): string {
  taskIdCounter += 1;
  return `task_${Date.now()}_${taskIdCounter}`;
}

function generateAttemptId(): string {
  attemptIdCounter += 1;
  return `attempt_${Date.now()}_${attemptIdCounter}`;
}

function generateSubtaskId(): string {
  subtaskIdCounter += 1;
  return `subtask_${Date.now()}_${subtaskIdCounter}`;
}

function getNextSerialNumber(): number {
  const stmt = db.prepare(`
    SELECT COALESCE(MAX(serial_number), 0) + 1 AS next_serial
    FROM tasks
  `);
  const row = stmt.get() as { next_serial: number } | undefined;
  return row?.next_serial ?? 1;
}

type TaskRow = {
  id: string;
  serial_number: number;
  title: string;
  description: string;
  notes: string;
  project_id: string | null;
  project_title: string | null;
  project_serial_number: number | null;
  start_time: string;
  end_time: string;
  status: string;
  priority: string;
  current_attempt_number: number;
  reassignment_count: number;
  created_at: string;
  completed_at: string | null;
};

type AttemptRow = {
  id: string;
  task_id: string;
  attempt_number: number;
  scheduled_start_time: string;
  scheduled_end_time: string;
  outcome: string;
  reason: string;
  completion_notes: string;
  reassigned_start_time: string;
  reassigned_end_time: string;
  created_at: string;
  resolved_at: string | null;
};

type SubtaskRow = {
  id: string;
  task_id: string;
  title: string;
  is_completed: number;
  order_index: number;
  created_at: string;
  completed_at: string | null;
};

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    serialNumber: row.serial_number,
    title: row.title,
    description: row.description ?? "",
    notes: row.notes ?? "",
    projectId: row.project_id ?? null,
    projectTitle: row.project_title ?? null,
    projectSerialNumber: row.project_serial_number ?? null,
    startTime: row.start_time ?? "",
    endTime: row.end_time ?? "",
    status: row.status as Task["status"],
    priority: row.priority as Task["priority"],
    currentAttemptNumber: row.current_attempt_number ?? 1,
    reassignmentCount: row.reassignment_count ?? 0,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? null,
  };
}

function mapTaskAttempt(row: AttemptRow): TaskAttempt {
  return {
    id: row.id,
    taskId: row.task_id,
    attemptNumber: row.attempt_number,
    scheduledStartTime: row.scheduled_start_time,
    scheduledEndTime: row.scheduled_end_time,
    outcome: row.outcome as TaskAttempt["outcome"],
    reason: row.reason ?? "",
    completionNotes: row.completion_notes ?? "",
    reassignedStartTime: row.reassigned_start_time ?? "",
    reassignedEndTime: row.reassigned_end_time ?? "",
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? null,
  };
}

function mapTaskSubtask(row: SubtaskRow): TaskSubtask {
  return {
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    isCompleted: Boolean(row.is_completed),
    orderIndex: row.order_index,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? null,
  };
}

function taskSelectSql(whereClause = "", orderClause = "ORDER BY tasks.serial_number DESC") {
  return `
    SELECT
      tasks.id,
      tasks.serial_number,
      tasks.title,
      tasks.description,
      tasks.notes,
      tasks.project_id,
      tasks.start_time,
      tasks.end_time,
      tasks.status,
      tasks.priority,
      tasks.current_attempt_number,
      tasks.reassignment_count,
      tasks.created_at,
      tasks.completed_at,
      projects.title AS project_title,
      projects.serial_number AS project_serial_number
    FROM tasks
    LEFT JOIN projects ON projects.id = tasks.project_id
    ${whereClause}
    ${orderClause}
  `;
}

function getProjectSummary(projectId: string) {
  const stmt = db.prepare(
    "SELECT id, title, serial_number FROM projects WHERE id = ?"
  );
  return stmt.get(projectId) as
    | { id: string; title: string; serial_number: number }
    | undefined;
}

function getCurrentAttemptRow(taskId: string): AttemptRow | null {
  const stmt = db.prepare(`
    SELECT *
    FROM task_attempts
    WHERE task_id = ?
    ORDER BY attempt_number DESC
    LIMIT 1
  `);
  const row = stmt.get(taskId) as AttemptRow | undefined;
  return row ?? null;
}

function ensureCurrentAttempt(taskId: string) {
  const attempt = getCurrentAttemptRow(taskId);
  if (!attempt) {
    throw new Error(`Task ${taskId} is missing attempt history`);
  }
  return attempt;
}

function getNextSubtaskOrderIndex(taskId: string): number {
  const stmt = db.prepare(`
    SELECT COALESCE(MAX(order_index), -1) + 1 AS next_order
    FROM task_subtasks
    WHERE task_id = ?
  `);
  const row = stmt.get(taskId) as { next_order: number } | undefined;
  return row?.next_order ?? 0;
}

export function addTask(data: {
  title: string;
  description?: string;
  notes?: string;
  projectId?: string | null;
  startTime: string;
  endTime: string;
  priority?: TaskPriority;
}): Task {
  const serialNumber = getNextSerialNumber();
  const project = data.projectId ? getProjectSummary(data.projectId) : null;
  const createdAt = new Date().toISOString();
  const task: Task = {
    id: generateTaskId(),
    serialNumber,
    title: data.title,
    description: data.description ?? "",
    notes: data.notes ?? "",
    projectId: project?.id ?? null,
    projectTitle: project?.title ?? null,
    projectSerialNumber: project?.serial_number ?? null,
    startTime: data.startTime,
    endTime: data.endTime,
    status: "pending",
    priority: data.priority ?? "medium",
    currentAttemptNumber: 1,
    reassignmentCount: 0,
    createdAt,
    completedAt: null,
  };

  const createTask = db.transaction(() => {
    const taskStmt = db.prepare(`
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

    const attemptStmt = db.prepare(`
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

    taskStmt.run(
      task.id,
      task.serialNumber,
      task.title,
      task.description,
      task.notes,
      task.projectId,
      task.startTime,
      task.endTime,
      task.status,
      task.priority,
      task.currentAttemptNumber,
      task.reassignmentCount,
      task.completedAt,
      task.createdAt
    );

    attemptStmt.run(
      generateAttemptId(),
      task.id,
      1,
      task.startTime,
      task.endTime,
      "scheduled",
      "",
      "",
      "",
      "",
      createdAt,
      null
    );
  });

  createTask();
  return task;
}

export function updateTask(
  id: string,
  data: Partial<
    Pick<
      Task,
      | "title"
      | "description"
      | "notes"
      | "projectId"
      | "startTime"
      | "endTime"
      | "status"
      | "priority"
    >
  >
): Task | null {
  const existing = getTask(id);
  if (!existing) return null;

  const fields: string[] = [];
  const values: (string | null | undefined)[] = [];

  if (data.title !== undefined) {
    fields.push("title = ?");
    values.push(data.title);
  }
  if (data.description !== undefined) {
    fields.push("description = ?");
    values.push(data.description);
  }
  if (data.notes !== undefined) {
    fields.push("notes = ?");
    values.push(data.notes);
  }
  if (data.projectId !== undefined) {
    fields.push("project_id = ?");
    values.push(data.projectId);
  }
  if (data.startTime !== undefined) {
    fields.push("start_time = ?");
    values.push(data.startTime);
  }
  if (data.endTime !== undefined) {
    fields.push("end_time = ?");
    values.push(data.endTime);
  }
  if (data.status !== undefined) {
    fields.push("status = ?");
    values.push(data.status);
  }
  if (data.priority !== undefined) {
    fields.push("priority = ?");
    values.push(data.priority);
  }

  if (fields.length > 0) {
    const stmt = db.prepare(`UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`);
    stmt.run(...values, id);
  }

  if (data.startTime !== undefined || data.endTime !== undefined) {
    const currentAttempt = ensureCurrentAttempt(id);
    if (currentAttempt.outcome === "scheduled") {
      db.prepare(
        `
          UPDATE task_attempts
          SET scheduled_start_time = ?, scheduled_end_time = ?
          WHERE id = ?
        `
      ).run(
        data.startTime ?? existing.startTime,
        data.endTime ?? existing.endTime,
        currentAttempt.id
      );
    }
  }

  return getTask(id);
}

export function rescheduleTask(data: {
  id: string;
  reason: string;
  newStartTime: string;
  newEndTime: string;
  notes?: string;
}): Task | null {
  const existing = getTask(data.id);
  if (!existing) return null;

  const currentAttempt = ensureCurrentAttempt(data.id);
  if (currentAttempt.outcome !== "scheduled") {
    throw new Error("Only scheduled attempts can be reassigned");
  }

  const now = new Date().toISOString();
  const nextAttemptNumber = currentAttempt.attempt_number + 1;

  const transaction = db.transaction(() => {
    db.prepare(
      `
        UPDATE task_attempts
        SET outcome = 'missed',
            reason = ?,
            reassigned_start_time = ?,
            reassigned_end_time = ?,
            resolved_at = ?
        WHERE id = ?
      `
    ).run(
      data.reason,
      data.newStartTime,
      data.newEndTime,
      now,
      currentAttempt.id
    );

    db.prepare(
      `
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
        VALUES (?, ?, ?, ?, ?, 'scheduled', '', '', '', '', ?, NULL)
      `
    ).run(
      generateAttemptId(),
      data.id,
      nextAttemptNumber,
      data.newStartTime,
      data.newEndTime,
      now
    );

    const fields = [
      "start_time = ?",
      "end_time = ?",
      "status = ?",
      "current_attempt_number = ?",
      "reassignment_count = ?",
      "completed_at = NULL",
    ];
    const values: Array<string | number> = [
      data.newStartTime,
      data.newEndTime,
      "pending",
      nextAttemptNumber,
      existing.reassignmentCount + 1,
    ];

    if (data.notes !== undefined) {
      fields.push("notes = ?");
      values.push(data.notes);
    }

    db.prepare(`UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`).run(
      ...values,
      data.id
    );
  });

  transaction();
  return getTask(data.id);
}

export function completeTask(data: {
  id: string;
  completionNotes: string;
  notes?: string;
}): Task | null {
  const existing = getTask(data.id);
  if (!existing) return null;

  const currentAttempt = ensureCurrentAttempt(data.id);
  if (currentAttempt.outcome !== "scheduled") {
    throw new Error("Only scheduled attempts can be completed");
  }

  const now = new Date().toISOString();
  const nextNotes = data.notes !== undefined ? data.notes : data.completionNotes;

  const transaction = db.transaction(() => {
    db.prepare(
      `
        UPDATE task_attempts
        SET outcome = 'completed',
            completion_notes = ?,
            resolved_at = ?
        WHERE id = ?
      `
    ).run(data.completionNotes, now, currentAttempt.id);

    db.prepare(
      `
        UPDATE tasks
        SET status = 'completed',
            notes = ?,
            completed_at = ?
        WHERE id = ?
      `
    ).run(nextNotes, now, data.id);
  });

  transaction();
  return getTask(data.id);
}

export function reopenTask(id: string): Task | null {
  const existing = getTask(id);
  if (!existing) return null;

  const latestAttempt = ensureCurrentAttempt(id);
  const nextAttemptNumber = latestAttempt.attempt_number + 1;
  const now = new Date().toISOString();

  const transaction = db.transaction(() => {
    db.prepare(
      `
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
        VALUES (?, ?, ?, ?, ?, 'scheduled', '', '', '', '', ?, NULL)
      `
    ).run(
      generateAttemptId(),
      id,
      nextAttemptNumber,
      existing.startTime,
      existing.endTime,
      now
    );

    db.prepare(
      `
        UPDATE tasks
        SET status = 'pending',
            completed_at = NULL,
            current_attempt_number = ?
        WHERE id = ?
      `
    ).run(nextAttemptNumber, id);
  });

  transaction();

  return getTask(id);
}

export function getTaskAttempts(taskId: string): TaskAttempt[] {
  const stmt = db.prepare(`
    SELECT *
    FROM task_attempts
    WHERE task_id = ?
    ORDER BY attempt_number DESC
  `);
  const rows = stmt.all(taskId) as AttemptRow[];
  return rows.map(mapTaskAttempt);
}

export function getTaskSubtasks(taskId: string): TaskSubtask[] {
  const stmt = db.prepare(`
    SELECT *
    FROM task_subtasks
    WHERE task_id = ?
    ORDER BY order_index ASC, created_at ASC
  `);
  const rows = stmt.all(taskId) as SubtaskRow[];
  return rows.map(mapTaskSubtask);
}

export function addTaskSubtask(data: { taskId: string; title: string }): TaskSubtask | null {
  const task = getTask(data.taskId);
  if (!task) return null;

  const subtask: TaskSubtask = {
    id: generateSubtaskId(),
    taskId: data.taskId,
    title: data.title,
    isCompleted: false,
    orderIndex: getNextSubtaskOrderIndex(data.taskId),
    createdAt: new Date().toISOString(),
    completedAt: null,
  };

  db.prepare(
    `
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
    `
  ).run(
    subtask.id,
    subtask.taskId,
    subtask.title,
    subtask.isCompleted ? 1 : 0,
    subtask.orderIndex,
    subtask.createdAt,
    subtask.completedAt
  );

  return subtask;
}

export function toggleTaskSubtask(data: {
  taskId: string;
  subtaskId: string;
  isCompleted: boolean;
}): TaskSubtask | null {
  const task = getTask(data.taskId);
  if (!task) return null;

  const now = data.isCompleted ? new Date().toISOString() : null;
  const result = db.prepare(
    `
      UPDATE task_subtasks
      SET is_completed = ?, completed_at = ?
      WHERE id = ? AND task_id = ?
    `
  ).run(data.isCompleted ? 1 : 0, now, data.subtaskId, data.taskId);

  if (result.changes === 0) return null;

  const row = db
    .prepare(`SELECT * FROM task_subtasks WHERE id = ? AND task_id = ?`)
    .get(data.subtaskId, data.taskId) as SubtaskRow | undefined;

  return row ? mapTaskSubtask(row) : null;
}

export function deleteTaskSubtask(data: { taskId: string; subtaskId: string }): boolean {
  const result = db
    .prepare("DELETE FROM task_subtasks WHERE id = ? AND task_id = ?")
    .run(data.subtaskId, data.taskId);

  return result.changes > 0;
}

export function reorderTaskSubtasks(data: {
  taskId: string;
  orderedSubtaskIds: string[];
}): TaskSubtask[] | null {
  const task = getTask(data.taskId);
  if (!task) return null;

  const existing = getTaskSubtasks(data.taskId);
  if (existing.length !== data.orderedSubtaskIds.length) {
    throw new Error("Reorder payload must include every subtask exactly once");
  }

  const existingIds = new Set(existing.map((subtask) => subtask.id));
  const orderedIds = new Set(data.orderedSubtaskIds);

  if (orderedIds.size !== data.orderedSubtaskIds.length) {
    throw new Error("Reorder payload contains duplicate subtask ids");
  }

  for (const subtaskId of data.orderedSubtaskIds) {
    if (!existingIds.has(subtaskId)) {
      throw new Error("Reorder payload contains unknown subtask ids");
    }
  }

  const transaction = db.transaction(() => {
    const stmt = db.prepare(
      "UPDATE task_subtasks SET order_index = ? WHERE id = ? AND task_id = ?"
    );

    data.orderedSubtaskIds.forEach((subtaskId, index) => {
      stmt.run(index, subtaskId, data.taskId);
    });
  });

  transaction();
  return getTaskSubtasks(data.taskId);
}

export function generateSubtaskSuggestions(taskId: string): string[] | null {
  const taskBundle = getTaskWithHistory(taskId);
  if (!taskBundle) return null;

  const { task, attempts, subtasks } = taskBundle;
  const existingTitles = new Set(subtasks.map((subtask) => subtask.title.trim().toLowerCase()));
  const source = [task.title, task.description, task.notes]
    .concat(attempts.flatMap((attempt) => [attempt.reason, attempt.completionNotes]))
    .join(" ")
    .toLowerCase();

  const suggestions: string[] = [];

  const pushSuggestion = (value: string) => {
    const normalized = value.trim().toLowerCase();
    if (!normalized || existingTitles.has(normalized) || suggestions.includes(value)) return;
    suggestions.push(value);
  };

  pushSuggestion("Clarify the exact deliverable");

  if (/review|audit|check|verify/.test(source)) {
    pushSuggestion("Review the current state");
    pushSuggestion("Capture issues or gaps");
  }

  if (/document|write|notes|summary|report/.test(source)) {
    pushSuggestion("Draft the first pass");
    pushSuggestion("Clean up the final notes");
  }

  if (/test|validate|qa|verify/.test(source)) {
    pushSuggestion("Run the key validation pass");
    pushSuggestion("Record the observed results");
  }

  if (/design|layout|ui|screen|modal|card/.test(source)) {
    pushSuggestion("Inspect the current interface");
    pushSuggestion("List the UI adjustments to make");
  }

  if (/api|payload|endpoint|database|schema|migration/.test(source)) {
    pushSuggestion("Check the current implementation path");
    pushSuggestion("Confirm the edge cases");
  }

  if (attempts.some((attempt) => attempt.outcome === "missed")) {
    pushSuggestion("Remove the blocker from the previous missed attempt");
  }

  return suggestions.slice(0, 5);
}

export function getTaskWithHistory(id: string): {
  task: Task;
  attempts: TaskAttempt[];
  subtasks: TaskSubtask[];
} | null {
  const task = getTask(id);
  if (!task) return null;
  return { task, attempts: getTaskAttempts(id), subtasks: getTaskSubtasks(id) };
}

export function deleteTask(id: string): boolean {
  const stmt = db.prepare("DELETE FROM tasks WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
}

export function clearProjectTasks(projectId: string): void {
  const stmt = db.prepare("UPDATE tasks SET project_id = NULL WHERE project_id = ?");
  stmt.run(projectId);
}

export function getTask(id: string): Task | null {
  const stmt = db.prepare(taskSelectSql("WHERE tasks.id = ?", ""));
  const row = stmt.get(id) as TaskRow | undefined;
  if (!row) return null;
  return mapTask(row);
}

export function getTasks(): Task[] {
  const stmt = db.prepare(taskSelectSql());
  const rows = stmt.all() as TaskRow[];
  return rows.map(mapTask);
}

export function getTasksByProject(projectId: string): Task[] {
  const stmt = db.prepare(taskSelectSql("WHERE tasks.project_id = ?"));
  const rows = stmt.all(projectId) as TaskRow[];
  return rows.map(mapTask);
}

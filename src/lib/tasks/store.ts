import { db } from "../db";
import type { Task, TaskPriority } from "./types";

let idCounter = 0;

function generateId(): string {
  idCounter += 1;
  return `task_${Date.now()}_${idCounter}`;
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
  created_at: string;
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
    createdAt: row.created_at,
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
      tasks.created_at,
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
  const task: Task = {
    id: generateId(),
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
    createdAt: new Date().toISOString(),
  };

  const stmt = db.prepare(`
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
  stmt.run(
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
    task.createdAt
  );

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

  return getTask(id);
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

import { Task, TaskPriority } from "./types";
import { db } from "../db";

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

export function addTask(data: {
  title: string;
  description?: string;
  notes?: string;
  startTime: string;
  endTime: string;
  priority?: TaskPriority;
}): Task {
  const serialNumber = getNextSerialNumber();
  const task: Task = {
    id: generateId(),
    serialNumber,
    title: data.title,
    description: data.description ?? "",
    notes: data.notes ?? "",
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
      start_time,
      end_time,
      status,
      priority,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    task.id,
    task.serialNumber,
    task.title,
    task.description,
    task.notes,
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
      "title" | "description" | "notes" | "startTime" | "endTime" | "status" | "priority"
    >
  >
): Task | null {
  const existing = getTask(id);
  if (!existing) return null;

  const fields: string[] = [];
  const values: (string | undefined)[] = [];

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

export function getTask(id: string): Task | null {
  const stmt = db.prepare("SELECT * FROM tasks WHERE id = ?");
  const row = stmt.get(id) as {
    id: string;
    serial_number: number;
    title: string;
    description: string;
    notes: string;
    start_time: string;
    end_time: string;
    status: string;
    priority: string;
    created_at: string;
  } | undefined;

  if (!row) return null;

  return {
    id: row.id,
    serialNumber: row.serial_number,
    title: row.title,
    description: row.description,
    notes: row.notes ?? "",
    startTime: row.start_time ?? "",
    endTime: row.end_time ?? "",
    status: row.status as Task["status"],
    priority: row.priority as Task["priority"],
    createdAt: row.created_at,
  };
}

export function getTasks(): Task[] {
  const stmt = db.prepare("SELECT * FROM tasks ORDER BY serial_number DESC");
  const rows = stmt.all() as Array<{
    id: string;
    serial_number: number;
    title: string;
    description: string;
    notes: string;
    start_time: string;
    end_time: string;
    status: string;
    priority: string;
    created_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    serialNumber: row.serial_number,
    title: row.title,
    description: row.description,
    notes: row.notes ?? "",
    startTime: row.start_time ?? "",
    endTime: row.end_time ?? "",
    status: row.status as Task["status"],
    priority: row.priority as Task["priority"],
    createdAt: row.created_at,
  }));
}

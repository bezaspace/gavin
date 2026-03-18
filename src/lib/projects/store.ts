import { db } from "../db";
import { clearProjectTasks } from "../tasks/store";
import type { Project } from "./types";

let idCounter = 0;

function generateId(): string {
  idCounter += 1;
  return `project_${Date.now()}_${idCounter}`;
}

function getNextSerialNumber(): number {
  const stmt = db.prepare(`
    SELECT COALESCE(MAX(serial_number), 0) + 1 AS next_serial
    FROM projects
  `);
  const row = stmt.get() as { next_serial: number } | undefined;
  return row?.next_serial ?? 1;
}

function mapProject(row: {
  id: string;
  serial_number: number;
  title: string;
  description: string;
  notes: string;
  created_at: string;
  updated_at: string;
}): Project {
  return {
    id: row.id,
    serialNumber: row.serial_number,
    title: row.title,
    description: row.description ?? "",
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

export function addProject(data: {
  title: string;
  description?: string;
  notes?: string;
}): Project {
  const now = new Date().toISOString();
  const project: Project = {
    id: generateId(),
    serialNumber: getNextSerialNumber(),
    title: data.title,
    description: data.description ?? "",
    notes: data.notes ?? "",
    createdAt: now,
    updatedAt: now,
  };

  const stmt = db.prepare(`
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
  stmt.run(
    project.id,
    project.serialNumber,
    project.title,
    project.description,
    project.notes,
    project.createdAt,
    project.updatedAt
  );

  return project;
}

export function updateProject(
  id: string,
  data: Partial<Pick<Project, "title" | "description" | "notes">>
): Project | null {
  const existing = getProject(id);
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

  fields.push("updated_at = ?");
  values.push(new Date().toISOString());

  if (fields.length > 0) {
    const stmt = db.prepare(`UPDATE projects SET ${fields.join(", ")} WHERE id = ?`);
    stmt.run(...values, id);
  }

  return getProject(id);
}

export function deleteProject(id: string): boolean {
  clearProjectTasks(id);
  const stmt = db.prepare("DELETE FROM projects WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
}

export function getProject(id: string): Project | null {
  const stmt = db.prepare("SELECT * FROM projects WHERE id = ?");
  const row = stmt.get(id) as
    | {
        id: string;
        serial_number: number;
        title: string;
        description: string;
        notes: string;
        created_at: string;
        updated_at: string;
      }
    | undefined;

  if (!row) return null;

  return mapProject(row);
}

export function getProjects(): Project[] {
  const stmt = db.prepare("SELECT * FROM projects ORDER BY serial_number DESC");
  const rows = stmt.all() as Array<{
    id: string;
    serial_number: number;
    title: string;
    description: string;
    notes: string;
    created_at: string;
    updated_at: string;
  }>;

  return rows.map(mapProject);
}

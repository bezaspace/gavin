import { db } from "../db";
import type { BrainDumpEntry } from "./types";

let brainDumpIdCounter = 0;

type BrainDumpEntryRow = {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
};

function generateBrainDumpId(): string {
  brainDumpIdCounter += 1;
  return `brain_dump_${Date.now()}_${brainDumpIdCounter}`;
}

function mapBrainDumpEntry(row: BrainDumpEntryRow): BrainDumpEntry {
  return {
    id: row.id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function addBrainDumpEntry(data: { content: string }): BrainDumpEntry {
  const now = new Date().toISOString();
  const entry: BrainDumpEntry = {
    id: generateBrainDumpId(),
    content: data.content,
    createdAt: now,
    updatedAt: now,
  };

  db.prepare(
    `
      INSERT INTO brain_dump_entries (
        id,
        content,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    `
  ).run(entry.id, entry.content, entry.createdAt, entry.updatedAt);

  return entry;
}

export function getBrainDumpEntries(): BrainDumpEntry[] {
  const rows = db
    .prepare(
      `
        SELECT *
        FROM brain_dump_entries
        ORDER BY datetime(created_at) DESC, rowid DESC
      `
    )
    .all() as BrainDumpEntryRow[];

  return rows.map(mapBrainDumpEntry);
}

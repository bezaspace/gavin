import { tool } from "ai";
import { z } from "zod";
import { model } from "./provider";
import * as taskStore from "@/lib/tasks/store";
import { getProjects } from "@/lib/projects/store";

function resolveProjectId(projectReference?: string) {
  const value = projectReference?.trim();
  if (!value) return null;

  const projects = getProjects();
  const normalized = value.toLowerCase();
  const serial = normalized.replace(/^#/, "");

  const exactSerialMatch = projects.find(
    (project) => String(project.serialNumber) === serial
  );
  if (exactSerialMatch) return exactSerialMatch.id;

  const exactTitleMatch = projects.find(
    (project) => project.title.trim().toLowerCase() === normalized
  );
  if (exactTitleMatch) return exactTitleMatch.id;

  const partialTitleMatch = projects.find((project) =>
    project.title.trim().toLowerCase().includes(normalized)
  );
  return partialTitleMatch?.id ?? null;
}

function formatProjectLabel(projectTitle: string | null, projectSerialNumber: number | null) {
  if (!projectTitle) return "unassigned";
  return `project #${projectSerialNumber ?? "?"} ${projectTitle}`;
}

export const createTaskTool = tool({
  description:
    "Create a new task. Use this when the user mentions something they need to do, a goal, or an action item. Start and end time are required.",
  inputSchema: z.object({
    title: z.string().describe("Short, clear task title"),
    description: z
      .string()
      .optional()
      .describe("Additional details about the task"),
    notes: z
      .string()
      .optional()
      .describe("Optional notes the user wants attached to the task"),
    startTime: z
      .string()
      .describe("Task start time or time range start, in the user's preferred format"),
    endTime: z
      .string()
      .describe("Task end time or time range end, in the user's preferred format"),
    priority: z
      .enum(["low", "medium", "high"])
      .optional()
      .describe("Task priority (default: medium)"),
    projectReference: z
      .string()
      .optional()
      .describe("Optional project title or serial number like 'Apollo' or '#3'"),
  }),
  execute: async ({
    title,
    description,
    notes,
    startTime,
    endTime,
    priority,
    projectReference,
  }) => {
    const projectId = resolveProjectId(projectReference);
    if (projectReference && !projectId) {
      return `Error: Project "${projectReference}" not found.`;
    }

    const task = taskStore.addTask({
      title,
      description,
      notes,
      projectId,
      startTime,
      endTime,
      priority,
    });
    return `Task created: #${task.serialNumber} "${task.title}" [${task.id}] from ${task.startTime} to ${task.endTime} with priority ${task.priority} on ${formatProjectLabel(task.projectTitle, task.projectSerialNumber)}`;
  },
});

export const updateTaskTool = tool({
  description:
    "Update an existing task's title, description, notes, start time, end time, status, or priority.",
  inputSchema: z.object({
    id: z.string().describe("The task ID to update"),
    title: z.string().optional().describe("New title"),
    description: z.string().optional().describe("New description"),
    notes: z.string().optional().describe("New notes"),
    startTime: z.string().optional().describe("New start time"),
    endTime: z.string().optional().describe("New end time"),
    status: z
      .enum(["pending", "in_progress", "completed"])
      .optional()
      .describe("New status"),
    priority: z
      .enum(["low", "medium", "high"])
      .optional()
      .describe("New priority"),
    projectReference: z
      .string()
      .nullable()
      .optional()
      .describe("New project title or serial number, or null to clear project assignment"),
  }),
  execute: async ({ id, projectReference, ...data }) => {
    const resolvedProjectId =
      projectReference === undefined
        ? undefined
        : projectReference === null
          ? null
          : resolveProjectId(projectReference);

    if (projectReference && resolvedProjectId === null) {
      return `Error: Project "${projectReference}" not found.`;
    }

    const updated = taskStore.updateTask(id, {
      ...data,
      projectId: resolvedProjectId,
    });
    if (!updated) return `Error: Task with ID "${id}" not found.`;
    return `Task updated: #${updated.serialNumber} "${updated.title}" [${updated.id}] — status: ${updated.status}, priority: ${updated.priority}, ${formatProjectLabel(updated.projectTitle, updated.projectSerialNumber)}`;
  },
});

export const deleteTaskTool = tool({
  description: "Delete a task by its ID.",
  inputSchema: z.object({
    id: z.string().describe("The task ID to delete"),
  }),
  execute: async ({ id }) => {
    const deleted = taskStore.deleteTask(id);
    if (!deleted) return `Error: Task with ID "${id}" not found.`;
    return `Task deleted: [${id}]`;
  },
});

export const listTasksTool = tool({
  description:
    "List all current tasks. Use this when the user asks about their tasks or to-do list.",
  inputSchema: z.object({}),
  execute: async () => {
    const tasks = taskStore.getTasks();
    if (tasks.length === 0) return "No tasks found.";
    return tasks
      .map(
        (t) =>
          `#${t.serialNumber} [${t.id}] ${t.title} — ${t.startTime} to ${t.endTime}, status: ${t.status}, priority: ${t.priority}, ${formatProjectLabel(t.projectTitle, t.projectSerialNumber)}${t.notes ? ` | notes: ${t.notes}` : ""}${t.description ? ` | ${t.description}` : ""}`
      )
      .join("\n");
  },
});

export const taskTools = {
  createTask: createTaskTool,
  updateTask: updateTaskTool,
  deleteTask: deleteTaskTool,
  listTasks: listTasksTool,
};

export const systemPrompt = `You are a productivity assistant embedded in a tactical command interface called GAVIN.

You have a natural conversation with the user. When the user mentions things they need to do, goals, deadlines, or action items — you proactively create tasks using your tools. You can also update or delete tasks when asked, and list tasks when the user wants to see them.

Rules:
- Always confirm what you did after a tool call (e.g., "Created task: Buy groceries")
- Be concise. Use short sentences.
- Match the technical tone of the interface.
- When creating a task, collect a start time and an end time. If either is missing, ask a follow-up question instead of creating the task.
- Include notes when the user provides them.
- If the user mentions a project, attach the task to the matching project by title or serial number.
- Don't create duplicate tasks — check existing tasks if unsure.
- If the user just chats casually without mentioning tasks, respond conversationally without creating tasks.`;

export { model };

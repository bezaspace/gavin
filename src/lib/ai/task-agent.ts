import { tool } from "ai";
import { z } from "zod";
import { model } from "./provider";
import * as taskStore from "@/lib/tasks/store";

export const createTaskTool = tool({
  description:
    "Create a new task. Use this when the user mentions something they need to do, a goal, or an action item.",
  inputSchema: z.object({
    title: z.string().describe("Short, clear task title"),
    description: z
      .string()
      .optional()
      .describe("Additional details about the task"),
    priority: z
      .enum(["low", "medium", "high"])
      .optional()
      .describe("Task priority (default: medium)"),
  }),
  execute: async ({ title, description, priority }) => {
    const task = taskStore.addTask({ title, description, priority });
    return `Task created: "${task.title}" [${task.id}] with priority ${task.priority}`;
  },
});

export const updateTaskTool = tool({
  description:
    "Update an existing task's title, description, status, or priority.",
  inputSchema: z.object({
    id: z.string().describe("The task ID to update"),
    title: z.string().optional().describe("New title"),
    description: z.string().optional().describe("New description"),
    status: z
      .enum(["pending", "in_progress", "completed"])
      .optional()
      .describe("New status"),
    priority: z
      .enum(["low", "medium", "high"])
      .optional()
      .describe("New priority"),
  }),
  execute: async ({ id, ...data }) => {
    const updated = taskStore.updateTask(id, data);
    if (!updated) return `Error: Task with ID "${id}" not found.`;
    return `Task updated: "${updated.title}" [${updated.id}] — status: ${updated.status}, priority: ${updated.priority}`;
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
          `[${t.id}] ${t.title} — status: ${t.status}, priority: ${t.priority}${t.description ? ` | ${t.description}` : ""}`
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
- Don't create duplicate tasks — check existing tasks if unsure.
- If the user just chats casually without mentioning tasks, respond conversationally without creating tasks.`;

export { model };

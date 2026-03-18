import { generateObject, tool } from "ai";
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

function resolveTask(taskReference?: string) {
  const value = taskReference?.trim();
  if (!value) return null;

  const tasks = taskStore.getTasks();
  const normalized = value.toLowerCase();
  const serial = normalized.replace(/^#/, "");

  const exactIdMatch = tasks.find((task) => task.id === value);
  if (exactIdMatch) return exactIdMatch;

  const exactSerialMatch = tasks.find(
    (task) => String(task.serialNumber) === serial
  );
  if (exactSerialMatch) return exactSerialMatch;

  const exactTitleMatch = tasks.find(
    (task) => task.title.trim().toLowerCase() === normalized
  );
  if (exactTitleMatch) return exactTitleMatch;

  const partialTitleMatch = tasks.find((task) =>
    task.title.trim().toLowerCase().includes(normalized)
  );
  return partialTitleMatch ?? null;
}

function resolveSubtask(taskId: string, subtaskReference?: string) {
  const value = subtaskReference?.trim();
  if (!value) return null;

  const subtasks = taskStore.getTaskSubtasks(taskId);
  const normalized = value.toLowerCase();
  const numeric = Number(normalized.replace(/^#/, ""));

  const exactIdMatch = subtasks.find((subtask) => subtask.id === value);
  if (exactIdMatch) return exactIdMatch;

  if (!Number.isNaN(numeric)) {
    const indexMatch = subtasks.find((subtask) => subtask.orderIndex + 1 === numeric);
    if (indexMatch) return indexMatch;
  }

  const exactTitleMatch = subtasks.find(
    (subtask) => subtask.title.trim().toLowerCase() === normalized
  );
  if (exactTitleMatch) return exactTitleMatch;

  const partialTitleMatch = subtasks.find((subtask) =>
    subtask.title.trim().toLowerCase().includes(normalized)
  );
  return partialTitleMatch ?? null;
}

function formatProjectLabel(projectTitle: string | null, projectSerialNumber: number | null) {
  if (!projectTitle) return "unassigned";
  return `project #${projectSerialNumber ?? "?"} ${projectTitle}`;
}

function formatTaskLabel(task: { serialNumber: number; title: string; id: string }) {
  return `#${task.serialNumber} "${task.title}" [${task.id}]`;
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
    return `Task created: ${formatTaskLabel(task)} from ${task.startTime} to ${task.endTime} with priority ${task.priority} on ${formatProjectLabel(task.projectTitle, task.projectSerialNumber)}`;
  },
});

export const updateTaskTool = tool({
  description:
    "Update an existing task's title, description, notes, start time, end time, status, or priority. Do not use this for missed-task rescheduling or completion logging.",
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
    return `Task updated: ${formatTaskLabel(updated)} - status: ${updated.status}, priority: ${updated.priority}, ${formatProjectLabel(updated.projectTitle, updated.projectSerialNumber)}`;
  },
});

export const rescheduleTaskTool = tool({
  description:
    "Mark the current scheduled attempt as missed, require a reason, and assign a new time slot for the same task.",
  inputSchema: z.object({
    id: z.string().describe("The task ID to reschedule"),
    reason: z.string().describe("Why the user could not complete the task in this slot"),
    newStartTime: z.string().describe("New start time for the reassigned slot"),
    newEndTime: z.string().describe("New end time for the reassigned slot"),
    notes: z
      .string()
      .optional()
      .describe("Optional replacement for the task's visible notes field"),
  }),
  execute: async ({ id, reason, newStartTime, newEndTime, notes }) => {
    try {
      const updated = taskStore.rescheduleTask({
        id,
        reason,
        newStartTime,
        newEndTime,
        notes,
      });
      if (!updated) return `Error: Task with ID "${id}" not found.`;
      return `Task rescheduled: ${formatTaskLabel(updated)} now runs ${updated.startTime} to ${updated.endTime}. Reassigned ${updated.reassignmentCount} time(s).`;
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : "Unable to reschedule task."}`;
    }
  },
});

export const completeTaskTool = tool({
  description:
    "Mark the current scheduled attempt as completed and record how the user finished it in completion notes.",
  inputSchema: z.object({
    id: z.string().describe("The task ID to complete"),
    completionNotes: z
      .string()
      .describe("Notes describing how the task was completed"),
    notes: z
      .string()
      .optional()
      .describe("Optional replacement for the task's visible notes field"),
  }),
  execute: async ({ id, completionNotes, notes }) => {
    try {
      const updated = taskStore.completeTask({ id, completionNotes, notes });
      if (!updated) return `Error: Task with ID "${id}" not found.`;
      return `Task completed: ${formatTaskLabel(updated)}. Completion notes logged for attempt ${updated.currentAttemptNumber}.`;
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : "Unable to complete task."}`;
    }
  },
});

export const addSubtasksTool = tool({
  description:
    "Create one or more simple checklist subtasks inside an existing task. Use this when the user asks to break a task into steps.",
  inputSchema: z.object({
    taskReference: z
      .string()
      .describe("Task id, serial like '#12', or task title"),
    titles: z
      .array(z.string())
      .min(1)
      .max(8)
      .describe("Subtask titles to add to the task"),
  }),
  execute: async ({ taskReference, titles }) => {
    const task = resolveTask(taskReference);
    if (!task) {
      return `Error: Task "${taskReference}" not found.`;
    }

    const created = titles
      .map((title) => taskStore.addTaskSubtask({ taskId: task.id, title: title.trim() }))
      .filter((subtask): subtask is NonNullable<typeof subtask> => Boolean(subtask));

    if (created.length === 0) {
      return `Error: No subtasks were created for ${formatTaskLabel(task)}.`;
    }

    return `Added ${created.length} subtask(s) to ${formatTaskLabel(task)}: ${created.map((subtask) => subtask.title).join("; ")}`;
  },
});

export const toggleSubtaskTool = tool({
  description:
    "Mark a task subtask as completed or not completed. Use this when the user wants to check or uncheck a subtask.",
  inputSchema: z.object({
    taskReference: z
      .string()
      .describe("Task id, serial like '#12', or task title"),
    subtaskReference: z
      .string()
      .describe("Subtask id, number in the checklist, or subtask title"),
    isCompleted: z.boolean().describe("Whether the subtask should be checked"),
  }),
  execute: async ({ taskReference, subtaskReference, isCompleted }) => {
    const task = resolveTask(taskReference);
    if (!task) {
      return `Error: Task "${taskReference}" not found.`;
    }

    const subtask = resolveSubtask(task.id, subtaskReference);
    if (!subtask) {
      return `Error: Subtask "${subtaskReference}" not found on ${formatTaskLabel(task)}.`;
    }

    const updated = taskStore.toggleTaskSubtask({
      taskId: task.id,
      subtaskId: subtask.id,
      isCompleted,
    });

    if (!updated) {
      return `Error: Subtask "${subtaskReference}" not found on ${formatTaskLabel(task)}.`;
    }

    return `Subtask ${isCompleted ? "checked" : "unchecked"} on ${formatTaskLabel(task)}: ${updated.title}`;
  },
});

export const deleteSubtaskTool = tool({
  description:
    "Delete a subtask from an existing task checklist.",
  inputSchema: z.object({
    taskReference: z
      .string()
      .describe("Task id, serial like '#12', or task title"),
    subtaskReference: z
      .string()
      .describe("Subtask id, number in the checklist, or subtask title"),
  }),
  execute: async ({ taskReference, subtaskReference }) => {
    const task = resolveTask(taskReference);
    if (!task) {
      return `Error: Task "${taskReference}" not found.`;
    }

    const subtask = resolveSubtask(task.id, subtaskReference);
    if (!subtask) {
      return `Error: Subtask "${subtaskReference}" not found on ${formatTaskLabel(task)}.`;
    }

    const deleted = taskStore.deleteTaskSubtask({
      taskId: task.id,
      subtaskId: subtask.id,
    });

    if (!deleted) {
      return `Error: Subtask "${subtaskReference}" not found on ${formatTaskLabel(task)}.`;
    }

    return `Deleted subtask from ${formatTaskLabel(task)}: ${subtask.title}`;
  },
});

export const suggestSubtasksTool = tool({
  description:
    "Suggest useful subtasks for an existing task using the task title, description, notes, and attempt history. This does not create them.",
  inputSchema: z.object({
    taskReference: z
      .string()
      .describe("Task id, serial like '#12', or task title"),
  }),
  execute: async ({ taskReference }) => {
    const task = resolveTask(taskReference);
    if (!task) {
      return `Error: Task "${taskReference}" not found.`;
    }

    const taskBundle = taskStore.getTaskWithHistory(task.id);
    if (!taskBundle) {
      return `Error: Task "${taskReference}" not found.`;
    }

    const heuristicSuggestions = taskStore.generateSubtaskSuggestions(task.id) ?? [];
    const { attempts, subtasks } = taskBundle;

    try {
      const result = await generateObject({
        model,
        schema: z.object({
          subtasks: z.array(z.string()).min(3).max(6),
        }),
        prompt: [
          "Suggest concise actionable subtasks for this task.",
          "Keep each item to a short checklist phrase.",
          "Avoid duplicates and avoid repeating existing subtasks.",
          `Task: ${task.title}`,
          `Description: ${task.description || "None"}`,
          `Notes: ${task.notes || "None"}`,
          `Current slot: ${task.startTime} - ${task.endTime}`,
          `Attempt history: ${attempts
            .map(
              (attempt) =>
                `attempt ${attempt.attemptNumber}: ${attempt.outcome}; reason=${attempt.reason || "none"}; completion=${attempt.completionNotes || "none"}`
            )
            .join(" | ")}`,
          `Existing subtasks: ${subtasks.map((subtask) => subtask.title).join(" | ") || "None"}`,
          `Heuristic candidates: ${heuristicSuggestions.join(" | ") || "None"}`,
        ].join("\n"),
      });

      const suggestions = Array.from(
        new Set(result.object.subtasks.map((entry) => entry.trim()).filter(Boolean))
      ).slice(0, 6);

      if (suggestions.length === 0) {
        return `No subtask suggestions available for ${formatTaskLabel(task)}.`;
      }

      return `Suggested subtasks for ${formatTaskLabel(task)}:\n- ${suggestions.join("\n- ")}`;
    } catch {
      if (heuristicSuggestions.length === 0) {
        return `No subtask suggestions available for ${formatTaskLabel(task)}.`;
      }

      return `Suggested subtasks for ${formatTaskLabel(task)}:\n- ${heuristicSuggestions.join("\n- ")}`;
    }
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
      .map((task) => {
        const subtasks = taskStore.getTaskSubtasks(task.id);
        const doneCount = subtasks.filter((subtask) => subtask.isCompleted).length;
        return `${formatTaskLabel(task)} - ${task.startTime} to ${task.endTime}, status: ${task.status}, priority: ${task.priority}, ${formatProjectLabel(task.projectTitle, task.projectSerialNumber)}, subtasks: ${doneCount}/${subtasks.length}${task.notes ? ` | notes: ${task.notes}` : ""}${task.description ? ` | ${task.description}` : ""}`;
      })
      .join("\n");
  },
});

export const taskTools = {
  createTask: createTaskTool,
  updateTask: updateTaskTool,
  rescheduleTask: rescheduleTaskTool,
  completeTask: completeTaskTool,
  addSubtasks: addSubtasksTool,
  toggleSubtask: toggleSubtaskTool,
  deleteSubtask: deleteSubtaskTool,
  suggestSubtasks: suggestSubtasksTool,
  deleteTask: deleteTaskTool,
  listTasks: listTasksTool,
};

export const systemPrompt = `You are a productivity assistant embedded in a tactical command interface called GAVIN.

You have a natural conversation with the user. When the user mentions things they need to do, goals, deadlines, or action items - you proactively create tasks using your tools. You can also update or delete tasks when asked, list tasks when the user wants to see them, reschedule missed tasks, log completion notes, and manage simple checklist subtasks inside tasks.

Rules:
- Always confirm what you did after a tool call.
- Be concise. Use short sentences.
- Match the technical tone of the interface.
- When creating a task, collect a start time and an end time. If either is missing, ask a follow-up question instead of creating the task.
- If the user says they missed a task or could not do it, collect a reason and a new start/end time, then use the reschedule tool.
- If the user says they completed a task, collect completion notes about how they did it, then use the complete tool.
- If the user asks to break a task into steps, add subtasks or suggest subtasks depending on what they asked for.
- If the user asks for ideas, suggestions, or a checklist draft for a task, use the suggest subtasks tool first.
- If the user asks to check, uncheck, or remove a subtask, use the subtask tools.
- Include notes when the user provides them.
- If the user mentions a project, attach the task to the matching project by title or serial number.
- Don't create duplicate tasks or duplicate subtasks when unsure.
- If the user just chats casually without mentioning tasks, respond conversationally without creating tasks.`;

export { model };

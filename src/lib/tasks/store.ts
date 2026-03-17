import { Task, TaskPriority } from "./types";

const tasks = new Map<string, Task>();

let idCounter = 0;
function generateId(): string {
  idCounter += 1;
  return `task_${Date.now()}_${idCounter}`;
}

export function addTask(data: {
  title: string;
  description?: string;
  priority?: TaskPriority;
}): Task {
  const task: Task = {
    id: generateId(),
    title: data.title,
    description: data.description ?? "",
    status: "pending",
    priority: data.priority ?? "medium",
    createdAt: new Date().toISOString(),
  };
  tasks.set(task.id, task);
  return task;
}

export function updateTask(
  id: string,
  data: Partial<Pick<Task, "title" | "description" | "status" | "priority">>
): Task | null {
  const task = tasks.get(id);
  if (!task) return null;
  const updated = { ...task, ...data };
  tasks.set(id, updated);
  return updated;
}

export function deleteTask(id: string): boolean {
  return tasks.delete(id);
}

export function getTask(id: string): Task | null {
  return tasks.get(id) ?? null;
}

export function getTasks(): Task[] {
  return Array.from(tasks.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

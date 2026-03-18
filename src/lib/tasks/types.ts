export type TaskStatus = "pending" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  serialNumber: number;
  title: string;
  description: string;
  notes: string;
  startTime: string;
  endTime: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
}

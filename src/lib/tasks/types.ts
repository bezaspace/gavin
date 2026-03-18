export type TaskStatus = "pending" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";
export type TaskAttemptOutcome = "scheduled" | "missed" | "completed";

export interface TaskSubtask {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  orderIndex: number;
  createdAt: string;
  completedAt: string | null;
}

export interface TaskAttempt {
  id: string;
  taskId: string;
  attemptNumber: number;
  scheduledStartTime: string;
  scheduledEndTime: string;
  outcome: TaskAttemptOutcome;
  reason: string;
  completionNotes: string;
  reassignedStartTime: string;
  reassignedEndTime: string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface Task {
  id: string;
  serialNumber: number;
  title: string;
  description: string;
  notes: string;
  projectId: string | null;
  projectTitle: string | null;
  projectSerialNumber: number | null;
  startTime: string;
  endTime: string;
  status: TaskStatus;
  priority: TaskPriority;
  currentAttemptNumber: number;
  reassignmentCount: number;
  createdAt: string;
  completedAt: string | null;
}

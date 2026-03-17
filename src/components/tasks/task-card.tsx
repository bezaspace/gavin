import type { Task } from "@/lib/tasks/types";

const statusColors: Record<string, string> = {
  pending: "bg-text-dim",
  in_progress: "bg-status-warning",
  completed: "bg-status-success",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  in_progress: "Active",
  completed: "Done",
};

const priorityLabels: Record<string, string> = {
  low: "Low",
  medium: "Med",
  high: "High",
};

const priorityColors: Record<string, string> = {
  low: "text-text-dim",
  medium: "text-status-warning",
  high: "text-status-error",
};

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  return (
    <div className="border border-[rgba(122,155,168,0.1)] bg-bg-panel px-3 py-2 hover:border-[rgba(122,155,168,0.2)] transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div
            className={`text-[11px] leading-relaxed ${
              task.status === "completed"
                ? "text-text-dim line-through"
                : "text-text-bright"
            }`}
          >
            {task.title}
          </div>
          {task.description && (
            <div className="text-[9px] text-text-dim mt-0.5 truncate">
              {task.description}
            </div>
          )}
        </div>
        <div className={`text-[8px] uppercase tracking-[0.1em] ${priorityColors[task.priority]} whitespace-nowrap`}>
          {priorityLabels[task.priority]}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${statusColors[task.status]}`} />
          <span className="text-[8px] uppercase tracking-[0.1em] text-text-dim">
            {statusLabels[task.status]}
          </span>
        </div>
        <span className="text-[8px] text-text-dim ml-auto font-mono opacity-50">
          {task.id.split("_").pop()}
        </span>
      </div>
    </div>
  );
}

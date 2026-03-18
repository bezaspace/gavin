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
  active?: boolean;
  onClick?: () => void;
}

export function TaskCard({ task, active = false, onClick }: TaskCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full border-[0.5px] bg-bg-panel px-3 py-2 text-left transition-colors ${
        active
          ? "border-accent-primary bg-[rgba(122,155,168,0.06)]"
          : "border-[rgba(122,155,168,0.1)] hover:border-[rgba(122,155,168,0.2)]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="border-[0.5px] border-[rgba(122,155,168,0.12)] px-1.5 py-0.5 text-[8px] uppercase tracking-[0.15em] text-text-dim">
              #{task.serialNumber}
            </span>
            <span className="text-[8px] uppercase tracking-[0.15em] text-text-dim">
              {task.startTime} - {task.endTime}
            </span>
            <span className="border-[0.5px] border-[rgba(122,155,168,0.12)] px-1.5 py-0.5 text-[8px] uppercase tracking-[0.15em] text-text-dim">
              {task.projectTitle
                ? `P#${task.projectSerialNumber ?? "?"} ${task.projectTitle}`
                : "UNASSIGNED"}
            </span>
          </div>
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
            <div className="mt-0.5 text-[9px] text-text-dim">{task.description}</div>
          )}
        </div>
        <div
          className={`whitespace-nowrap text-[8px] uppercase tracking-[0.1em] ${priorityColors[task.priority]}`}
        >
          {priorityLabels[task.priority]}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <div className={`h-1.5 w-1.5 rounded-full ${statusColors[task.status]}`} />
          <span className="text-[8px] uppercase tracking-[0.1em] text-text-dim">
            {statusLabels[task.status]}
          </span>
        </div>
        <span className="text-[8px] uppercase tracking-[0.1em] text-text-dim">
          A{task.currentAttemptNumber}
        </span>
        {task.reassignmentCount > 0 ? (
          <span className="text-[8px] uppercase tracking-[0.1em] text-status-warning">
            R{task.reassignmentCount}
          </span>
        ) : null}
        <span className="ml-auto font-mono text-[8px] text-text-dim opacity-50">
          {task.id.split("_").pop()}
        </span>
      </div>
    </button>
  );
}

import type { Metadata } from "next";
import { TaskPanel } from "@/components/tasks/task-panel";

export const metadata: Metadata = {
  title: "GAVIN // Task Queue",
  description: "Full-page view of the current task queue",
};

export default function TasksPage() {
  return (
    <div className="flex flex-1 min-h-0 p-4 overflow-hidden">
      <div className="flex flex-1 min-h-0 border border-[rgba(122,155,168,0.1)] bg-[rgba(10,12,14,0.65)] overflow-hidden">
        <TaskPanel />
      </div>
    </div>
  );
}

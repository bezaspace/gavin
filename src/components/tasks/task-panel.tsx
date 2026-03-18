"use client";

import { useState, useEffect, useCallback } from "react";
import { TaskCard } from "./task-card";
import type { Task } from "@/lib/tasks/types";

type TasksListener = () => void;
const listeners = new Set<TasksListener>();

export function onTasksChanged() {
  listeners.forEach((fn) => fn());
}

export function TaskPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch {
      // silent fail — tasks will retry on next trigger
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchTasks();
    });
    listeners.add(fetchTasks);
    return () => {
      listeners.delete(fetchTasks);
    };
  }, [fetchTasks]);

  const pending = tasks.filter((t) => t.status === "pending").length;
  const active = tasks.filter((t) => t.status === "in_progress").length;
  const done = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-[rgba(122,155,168,0.1)] px-4 py-3">
        <div className="text-[8px] uppercase tracking-[0.15em] text-text-dim mb-2">
          {"// Task Queue"}
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-text-dim" />
            <span className="text-[9px] text-text-dim">
              {pending} pending
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-status-warning" />
            <span className="text-[9px] text-text-dim">
              {active} active
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-status-success" />
            <span className="text-[9px] text-text-dim">
              {done} done
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tasks.length === 0 && (
          <div className="text-text-dim text-[10px] text-center py-8">
            <div className="text-[8px] uppercase tracking-[0.15em] mb-1">
              No Tasks
            </div>
            <p>Talk to Gavin to create tasks</p>
          </div>
        )}
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TaskCard } from "./task-card";
import type { Task } from "@/lib/tasks/types";

type TasksListener = () => void;
const listeners = new Set<TasksListener>();

function emptyTaskNotes() {
  return { notes: "" };
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function onTasksChanged() {
  listeners.forEach((fn) => fn());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("tasks:changed"));
  }
}

export function TaskPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [draft, setDraft] = useState(emptyTaskNotes());

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (!res.ok) return;

      const data = (await res.json()) as Task[];
      setTasks(data);

      if (!activeTaskId && data.length > 0) {
        setActiveTaskId(data[0].id);
      }
      if (activeTaskId && !data.some((task) => task.id === activeTaskId)) {
        setActiveTaskId(data[0]?.id ?? null);
      }
    } catch {
      // silent fail — tasks will retry on next trigger
    }
  }, [activeTaskId]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchTasks();
    });
    listeners.add(fetchTasks);
    return () => {
      listeners.delete(fetchTasks);
    };
  }, [fetchTasks]);

  const activeTask = useMemo(
    () => tasks.find((task) => task.id === activeTaskId) ?? null,
    [tasks, activeTaskId]
  );

  const pending = tasks.filter((t) => t.status === "pending").length;
  const active = tasks.filter((t) => t.status === "in_progress").length;
  const done = tasks.filter((t) => t.status === "completed").length;

  useEffect(() => {
    if (!activeTask) {
      setDraft(emptyTaskNotes());
      setIsEditingNotes(false);
      return;
    }

    setDraft({ notes: activeTask.notes });
    setIsEditingNotes(false);
  }, [activeTask]);

  const hasDraftChanges = useMemo(() => {
    if (!activeTask) return false;
    return draft.notes !== activeTask.notes;
  }, [activeTask, draft.notes]);

  const saveTaskNotes = async () => {
    if (!activeTask || !hasDraftChanges) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activeTask.id, notes: draft.notes }),
      });

      if (!res.ok) return;

      const updated = (await res.json()) as Task;
      setTasks((current) =>
        current.map((task) => (task.id === updated.id ? updated : task))
      );
      setIsEditingNotes(false);
      onTasksChanged();
    } finally {
      setIsSaving(false);
    }
  };

  const startEditingNotes = () => {
    if (!activeTask) return;
    setDraft({ notes: activeTask.notes });
    setIsEditingNotes(true);
  };

  const cancelEditingNotes = () => {
    if (activeTask) {
      setDraft({ notes: activeTask.notes });
    }
    setIsEditingNotes(false);
  };

  const deleteTask = async () => {
    if (!activeTask) return;

    setIsDeleting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activeTask.id }),
      });

      if (!res.ok) return;

      const nextTasks = tasks.filter((task) => task.id !== activeTask.id);
      setTasks(nextTasks);
      setActiveTaskId(nextTasks[0]?.id ?? null);
      setIsEditingNotes(false);
      onTasksChanged();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex h-full min-h-0">
      <section className="flex min-w-0 flex-[0_0_420px] flex-col border-r-[0.5px] border-[rgba(122,155,168,0.1)]">
        <div className="border-b-[0.5px] border-[rgba(122,155,168,0.1)] px-4 py-3">
          <div className="mb-2 text-[8px] uppercase tracking-[0.15em] text-text-dim">
            {"// Task Queue"}
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-text-dim" />
              <span className="text-[9px] text-text-dim">{pending} pending</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-status-warning" />
              <span className="text-[9px] text-text-dim">{active} active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-status-success" />
              <span className="text-[9px] text-text-dim">{done} done</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {tasks.length === 0 && (
            <div className="py-8 text-center text-[10px] text-text-dim">
              <div className="mb-1 text-[8px] uppercase tracking-[0.15em]">No Tasks</div>
              <p>Talk to Gavin to create tasks</p>
            </div>
          )}
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              active={task.id === activeTaskId}
              onClick={() => setActiveTaskId(task.id)}
            />
          ))}
        </div>
      </section>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="border-b-[0.5px] border-[rgba(122,155,168,0.1)] px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[8px] uppercase tracking-[0.15em] text-text-dim">
                {"// Task Detail"}
              </div>
              {activeTask ? (
                <>
                  <div className="mt-1 text-[18px] font-light tracking-normal text-text-bright">
                    {activeTask.title}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[8px] uppercase tracking-[0.15em] text-text-dim">
                    <span>#{activeTask.serialNumber}</span>
                    <span>{activeTask.startTime} - {activeTask.endTime}</span>
                    <span>
                      {activeTask.projectTitle
                        ? `P#${activeTask.projectSerialNumber ?? "?"} ${activeTask.projectTitle}`
                        : "UNASSIGNED"}
                    </span>
                  </div>
                </>
              ) : null}
            </div>

            {activeTask && !isEditingNotes ? (
              <button
                type="button"
                onClick={startEditingNotes}
                className="border-[0.5px] border-border-subtle bg-transparent px-3 py-2 text-[10px] uppercase tracking-[0.1em] text-text-primary transition hover:border-accent-primary hover:text-accent-primary"
              >
                Edit
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {activeTask ? (
            <div className="space-y-5">
              <div className="grid gap-3 border-[0.5px] border-border-subtle p-3 sm:grid-cols-2">
                <div>
                  <div className="text-[8px] uppercase tracking-[0.15em] text-text-dim">Description</div>
                  <div className="mt-1 text-[11px] leading-6 text-text-primary">
                    {activeTask.description.trim() || "No description yet."}
                  </div>
                </div>
                <div>
                  <div className="text-[8px] uppercase tracking-[0.15em] text-text-dim">Status</div>
                  <div className="mt-1 text-[11px] text-text-bright">{activeTask.status}</div>
                </div>
                <div>
                  <div className="text-[8px] uppercase tracking-[0.15em] text-text-dim">Priority</div>
                  <div className="mt-1 text-[11px] text-text-bright">{activeTask.priority}</div>
                </div>
                <div>
                  <div className="text-[8px] uppercase tracking-[0.15em] text-text-dim">Created</div>
                  <div className="mt-1 text-[11px] tabular-nums text-text-bright">
                    {formatTimestamp(activeTask.createdAt)}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[8px] uppercase tracking-[0.15em] text-text-dim">
                  Notes
                </label>
                {isEditingNotes ? (
                  <textarea
                    rows={14}
                    value={draft.notes}
                    onChange={(event) => setDraft({ notes: event.target.value })}
                    placeholder="Task notes"
                    className="w-full resize-none border-[0.5px] border-border-subtle bg-bg-primary px-[10px] py-[6px] text-[11px] leading-6 text-text-primary outline-none placeholder:text-text-dim focus:border-accent-primary"
                  />
                ) : (
                  <div className="min-h-[280px] whitespace-pre-wrap border-[0.5px] border-border-subtle bg-bg-primary px-[10px] py-[6px] text-[11px] leading-6 text-text-primary">
                    {activeTask.notes.trim() || "No notes yet."}
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t-[0.5px] border-border-subtle pt-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={deleteTask}
                  disabled={isDeleting}
                  className="border-[0.5px] border-status-error bg-transparent px-4 py-2 text-[10px] uppercase tracking-[0.1em] text-status-error transition hover:bg-status-error hover:text-bg-primary disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-status-error"
                >
                  {isDeleting ? "Deleting..." : "Delete task"}
                </button>

                {isEditingNotes ? (
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={cancelEditingNotes}
                      className="border-[0.5px] border-border-subtle bg-transparent px-4 py-2 text-[10px] uppercase tracking-[0.1em] text-text-primary transition hover:border-accent-primary hover:text-accent-primary"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveTaskNotes}
                      disabled={isSaving || !hasDraftChanges}
                      className="border-[0.5px] border-accent-primary bg-transparent px-4 py-2 text-[10px] uppercase tracking-[0.1em] text-accent-primary transition hover:bg-accent-primary hover:text-bg-primary disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-accent-primary"
                    >
                      {isSaving ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[320px] items-center justify-center border-[0.5px] border-border-subtle px-6 text-center text-[11px] text-text-dim">
              Select a task from the queue to view its details.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

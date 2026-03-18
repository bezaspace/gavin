"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TaskCard } from "./task-card";
import type { Task, TaskAttempt, TaskSubtask } from "@/lib/tasks/types";

type TasksListener = () => void;
type TaskHistoryResponse = {
  task: Task;
  attempts: TaskAttempt[];
  subtasks: TaskSubtask[];
};
type NotesDraft = { notes: string };
type CompletionDraft = { completionNotes: string };
type RescheduleDraft = { reason: string; newStartTime: string; newEndTime: string };

const listeners = new Set<TasksListener>();

function emptyTaskNotes(): NotesDraft {
  return { notes: "" };
}

function emptyCompletionDraft(): CompletionDraft {
  return { completionNotes: "" };
}

function emptyRescheduleDraft(): RescheduleDraft {
  return { reason: "", newStartTime: "", newEndTime: "" };
}

function formatTimestamp(value: string | null) {
  if (!value) return "Unavailable";
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

function formatOutcome(outcome: TaskAttempt["outcome"]) {
  if (outcome === "completed") return "Completed";
  if (outcome === "missed") return "Missed";
  return "Scheduled";
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
  const [attempts, setAttempts] = useState<TaskAttempt[]>([]);
  const [subtasks, setSubtasks] = useState<TaskSubtask[]>([]);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [isCreatingSubtask, setIsCreatingSubtask] = useState(false);
  const [pendingSubtaskId, setPendingSubtaskId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyTaskNotes());
  const [completionDraft, setCompletionDraft] = useState(emptyCompletionDraft());
  const [rescheduleDraft, setRescheduleDraft] = useState(emptyRescheduleDraft());
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [draggedSubtaskId, setDraggedSubtaskId] = useState<string | null>(null);

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

  const fetchTaskHistory = useCallback(async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks?history=${encodeURIComponent(taskId)}`);
      if (!res.ok) return;

      const data = (await res.json()) as TaskHistoryResponse;
      setAttempts(data.attempts);
      setSubtasks(data.subtasks);
      setTasks((current) =>
        current.map((task) => (task.id === data.task.id ? data.task : task))
      );
    } catch {
      // silent fail
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

  useEffect(() => {
    if (!activeTaskId) {
      setAttempts([]);
      setSubtasks([]);
      return;
    }

    void fetchTaskHistory(activeTaskId);
  }, [activeTaskId, fetchTaskHistory]);

  const activeTask = useMemo(
    () => tasks.find((task) => task.id === activeTaskId) ?? null,
    [tasks, activeTaskId]
  );

  const currentAttempt = useMemo(
    () => attempts.find((attempt) => attempt.outcome === "scheduled") ?? attempts[0] ?? null,
    [attempts]
  );

  const pending = tasks.filter((t) => t.status === "pending").length;
  const active = tasks.filter((t) => t.status === "in_progress").length;
  const done = tasks.filter((t) => t.status === "completed").length;

  useEffect(() => {
    if (!activeTask) {
      setDraft(emptyTaskNotes());
      setCompletionDraft(emptyCompletionDraft());
      setRescheduleDraft(emptyRescheduleDraft());
      setNewSubtaskTitle("");
      setIsEditingNotes(false);
      return;
    }

    setDraft({ notes: activeTask.notes });
    setCompletionDraft(emptyCompletionDraft());
    setRescheduleDraft({
      reason: "",
      newStartTime: activeTask.startTime,
      newEndTime: activeTask.endTime,
    });
    setNewSubtaskTitle("");
    setIsEditingNotes(false);
  }, [activeTask]);

  const hasDraftChanges = useMemo(() => {
    if (!activeTask) return false;
    return draft.notes !== activeTask.notes;
  }, [activeTask, draft.notes]);

  const refreshActiveTask = async (taskId: string) => {
    await Promise.all([fetchTasks(), fetchTaskHistory(taskId)]);
    onTasksChanged();
  };

  const saveTaskNotes = async () => {
    if (!activeTask || !hasDraftChanges) return;

    setIsSavingNotes(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activeTask.id, notes: draft.notes }),
      });

      if (!res.ok) return;

      await refreshActiveTask(activeTask.id);
      setIsEditingNotes(false);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const completeTask = async () => {
    if (!activeTask || !completionDraft.completionNotes.trim()) return;

    setIsCompleting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeTask.id,
          action: "complete",
          completionNotes: completionDraft.completionNotes,
          notes: completionDraft.completionNotes,
        }),
      });

      if (!res.ok) return;

      setCompletionDraft(emptyCompletionDraft());
      await refreshActiveTask(activeTask.id);
    } finally {
      setIsCompleting(false);
    }
  };

  const rescheduleTask = async () => {
    if (
      !activeTask ||
      !rescheduleDraft.reason.trim() ||
      !rescheduleDraft.newStartTime.trim() ||
      !rescheduleDraft.newEndTime.trim()
    ) {
      return;
    }

    setIsRescheduling(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeTask.id,
          action: "reschedule",
          reason: rescheduleDraft.reason,
          newStartTime: rescheduleDraft.newStartTime,
          newEndTime: rescheduleDraft.newEndTime,
        }),
      });

      if (!res.ok) return;

      setCompletionDraft(emptyCompletionDraft());
      await refreshActiveTask(activeTask.id);
    } finally {
      setIsRescheduling(false);
    }
  };

  const reopenTask = async () => {
    if (!activeTask) return;

    setIsReopening(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activeTask.id, action: "reopen" }),
      });

      if (!res.ok) return;

      await refreshActiveTask(activeTask.id);
    } finally {
      setIsReopening(false);
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
      setAttempts([]);
      setSubtasks([]);
      setIsEditingNotes(false);
      onTasksChanged();
    } finally {
      setIsDeleting(false);
    }
  };

  const createSubtask = async () => {
    if (!activeTask || !newSubtaskTitle.trim()) return;

    setIsCreatingSubtask(true);
    try {
      const res = await fetch("/api/tasks/subtasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: activeTask.id, title: newSubtaskTitle.trim() }),
      });

      if (!res.ok) return;

      setNewSubtaskTitle("");
      await refreshActiveTask(activeTask.id);
    } finally {
      setIsCreatingSubtask(false);
    }
  };

  const toggleSubtask = async (subtask: TaskSubtask) => {
    if (!activeTask) return;

    setPendingSubtaskId(subtask.id);
    try {
      const res = await fetch("/api/tasks/subtasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: activeTask.id,
          subtaskId: subtask.id,
          isCompleted: !subtask.isCompleted,
        }),
      });

      if (!res.ok) return;

      await refreshActiveTask(activeTask.id);
    } finally {
      setPendingSubtaskId(null);
    }
  };

  const deleteSubtask = async (subtaskId: string) => {
    if (!activeTask) return;

    setPendingSubtaskId(subtaskId);
    try {
      const res = await fetch("/api/tasks/subtasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: activeTask.id, subtaskId }),
      });

      if (!res.ok) return;

      await refreshActiveTask(activeTask.id);
    } finally {
      setPendingSubtaskId(null);
    }
  };

  const reorderSubtasks = async (orderedSubtaskIds: string[]) => {
    if (!activeTask) return;

    setPendingSubtaskId("reorder");
    try {
      const res = await fetch("/api/tasks/subtasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: activeTask.id,
          action: "reorder",
          orderedSubtaskIds,
        }),
      });

      if (!res.ok) return;

      const updated = (await res.json()) as TaskSubtask[];
      setSubtasks(updated);
      onTasksChanged();
    } finally {
      setPendingSubtaskId(null);
      setDraggedSubtaskId(null);
    }
  };

  const moveSubtask = async (targetSubtaskId: string) => {
    if (!draggedSubtaskId || draggedSubtaskId === targetSubtaskId) return;

    const currentOrder = subtasks.map((subtask) => subtask.id);
    const fromIndex = currentOrder.indexOf(draggedSubtaskId);
    const toIndex = currentOrder.indexOf(targetSubtaskId);
    if (fromIndex === -1 || toIndex === -1) return;

    const reordered = [...currentOrder];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    await reorderSubtasks(reordered);
  };

  return (
    <div className="flex h-full min-h-0">
      <section className="flex min-w-0 flex-[0_0_420px] flex-col border-r-[0.5px] border-[rgba(122,155,168,0.15)]">
        <div className="overflow-y-auto">
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

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="border-b-[0.5px] border-[rgba(122,155,168,0.15)] px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[8px] uppercase tracking-[0.15em] text-text-dim">
                {"// Task Detail"}
              </div>
              {activeTask ? (
                <>
                  <div className="mt-2 text-[24px] font-light tracking-[-0.01em] text-text-bright">
                    {activeTask.title}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-[8px] uppercase tracking-[0.15em] text-text-dim">
                    <span className="flex items-center gap-1.5">
                      <span className="text-accent-primary opacity-60">ID:</span>
                      <span className="text-text-bright">#{activeTask.serialNumber}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-accent-primary opacity-60">ATTEMPT:</span>
                      <span className="text-text-bright">
                        {activeTask.currentAttemptNumber} / {activeTask.reassignmentCount + 1}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-accent-primary opacity-60">PROJECT:</span>
                      <span className="text-text-bright">
                        {activeTask.projectTitle
                          ? `P#${activeTask.projectSerialNumber ?? "?"} ${activeTask.projectTitle}`
                          : "UNASSIGNED"}
                      </span>
                    </span>
                  </div>
                </>
              ) : null}
            </div>

            {activeTask && !isEditingNotes ? (
              <button
                type="button"
                onClick={startEditingNotes}
                className="border-[0.5px] border-accent-primary bg-transparent px-4 py-2 text-[10px] uppercase tracking-[0.1em] text-accent-primary transition hover:bg-accent-primary hover:text-bg-primary"
              >
                Edit notes
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {activeTask ? (
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-x-8 gap-y-6 lg:grid-cols-4">
                <div className="col-span-2 lg:col-span-4 border-b-[0.5px] border-border-subtle pb-4">
                  <div className="text-[8px] uppercase tracking-[0.15em] text-text-dim">Description</div>
                  <div className="mt-2 text-[11px] leading-relaxed text-text-primary max-w-3xl">
                    {activeTask.description.trim() || "No description yet."}
                  </div>
                </div>
                
                <div>
                  <div className="text-[8px] uppercase tracking-[0.15em] text-text-dim">Status</div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${
                      activeTask.status === 'completed' ? 'bg-status-success' :
                      activeTask.status === 'in_progress' ? 'bg-status-warning animate-pulse' : 'bg-text-dim'
                    }`} />
                    <div className="text-[11px] text-text-bright uppercase tracking-[0.05em]">{activeTask.status.replace('_', ' ')}</div>
                  </div>
                </div>
                
                <div>
                  <div className="text-[8px] uppercase tracking-[0.15em] text-text-dim">Current slot</div>
                  <div className="mt-1 text-[11px] text-text-bright tabular-nums">
                    {activeTask.startTime} - {activeTask.endTime}
                  </div>
                </div>

                <div>
                  <div className="text-[8px] uppercase tracking-[0.15em] text-text-dim">Priority</div>
                  <div className="mt-1 text-[11px] text-text-bright uppercase">{activeTask.priority}</div>
                </div>

                <div>
                  <div className="text-[8px] uppercase tracking-[0.15em] text-text-dim">Created</div>
                  <div className="mt-1 text-[11px] tabular-nums text-text-bright">
                    {formatTimestamp(activeTask.createdAt)}
                  </div>
                </div>
              </div>

              <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-8">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b-[0.5px] border-border-subtle pb-2">
                      <label className="text-[8px] uppercase tracking-[0.15em] text-text-dim">
                        Notes
                      </label>
                      {isEditingNotes && (
                        <span className="text-[8px] uppercase tracking-[0.1em] text-accent-primary animate-pulse">EDITING</span>
                      )}
                    </div>
                    {isEditingNotes ? (
                      <textarea
                        rows={12}
                        value={draft.notes}
                        onChange={(event) => setDraft({ notes: event.target.value })}
                        placeholder="Task notes"
                        className="w-full resize-none border-[0.5px] border-border-subtle bg-[rgba(122,155,168,0.02)] px-[10px] py-[6px] text-[11px] leading-relaxed text-text-primary outline-none placeholder:text-text-dim focus:border-accent-primary"
                      />
                    ) : (
                      <div className="min-h-[200px] whitespace-pre-wrap text-[11px] leading-relaxed text-text-primary">
                        {activeTask.notes.trim() || "No notes yet."}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b-[0.5px] border-border-subtle pb-2">
                      <div className="text-[8px] uppercase tracking-[0.15em] text-text-dim">
                        Subtasks
                      </div>
                      <div className="text-[8px] uppercase tracking-[0.12em] text-text-dim">
                        {subtasks.filter((subtask) => subtask.isCompleted).length}/{subtasks.length} COMPLETE
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <input
                        value={newSubtaskTitle}
                        onChange={(event) => setNewSubtaskTitle(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void createSubtask();
                          }
                        }}
                        placeholder="Add subtask..."
                        className="w-full border-b-[0.5px] border-border-subtle bg-transparent px-[10px] py-[8px] text-[11px] text-text-primary outline-none placeholder:text-text-dim focus:border-accent-primary transition-colors"
                      />
                      <button
                        type="button"
                        onClick={createSubtask}
                        disabled={isCreatingSubtask || !newSubtaskTitle.trim()}
                        className="border-[0.5px] border-accent-primary bg-transparent px-4 py-2 text-[8px] uppercase tracking-[0.15em] text-accent-primary transition hover:bg-accent-primary hover:text-bg-primary disabled:opacity-30"
                      >
                        {isCreatingSubtask ? "..." : "ADD"}
                      </button>
                    </div>

                    <div className="space-y-px">
                      {subtasks.length === 0 ? (
                        <div className="py-4 text-[10px] text-text-dim uppercase tracking-[0.05em]">
                          No subtasks defined.
                        </div>
                      ) : (
                        subtasks.map((subtask) => {
                          const isPending = pendingSubtaskId === subtask.id;
                          return (
                            <div
                              key={subtask.id}
                              draggable={!isPending && pendingSubtaskId !== "reorder"}
                              onDragStart={() => setDraggedSubtaskId(subtask.id)}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={() => void moveSubtask(subtask.id)}
                              onDragEnd={() => setDraggedSubtaskId(null)}
                              className="group flex items-center gap-3 border-b-[0.5px] border-[rgba(122,155,168,0.05)] bg-transparent py-2 transition hover:bg-[rgba(122,155,168,0.02)]"
                            >
                              <div className="cursor-grab text-[10px] text-text-dim opacity-30 group-hover:opacity-100 transition-opacity">::</div>
                              <label className="flex min-w-0 flex-1 items-center gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={subtask.isCompleted}
                                  onChange={() => void toggleSubtask(subtask)}
                                  disabled={isPending}
                                  className="h-3 w-3 border-border-subtle bg-bg-primary accent-accent-primary"
                                />
                                <span
                                  className={`text-[11px] transition-colors ${
                                    subtask.isCompleted
                                      ? "text-text-dim line-through"
                                      : "text-text-primary group-hover:text-text-bright"
                                  }`}
                                >
                                  {subtask.title}
                                </span>
                              </label>
                              <button
                                type="button"
                                onClick={() => void deleteSubtask(subtask.id)}
                                disabled={isPending}
                                className="opacity-0 group-hover:opacity-100 text-[8px] uppercase tracking-[0.15em] text-status-error transition-opacity hover:text-status-error/80 disabled:opacity-0"
                              >
                                [DELETE]
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="text-[8px] uppercase tracking-[0.15em] text-text-dim border-b-[0.5px] border-border-subtle pb-2">
                      Mission History
                    </div>
                    <div className="space-y-4">
                      {attempts.map((attempt) => (
                        <div
                          key={attempt.id}
                          className="border-l-[0.5px] border-border-subtle pl-4 py-1"
                        >
                          <div className="flex flex-wrap items-center gap-3 text-[8px] uppercase tracking-[0.15em]">
                            <span className="text-text-bright">Attempt {attempt.attemptNumber}</span>
                            <span className={
                              attempt.outcome === 'completed' ? 'text-status-success' :
                              attempt.outcome === 'missed' ? 'text-status-error' : 'text-status-warning'
                            }>{formatOutcome(attempt.outcome)}</span>
                            <span className="text-text-dim tabular-nums">
                              {attempt.scheduledStartTime} - {attempt.scheduledEndTime}
                            </span>
                          </div>
                          {attempt.reason ? (
                            <div className="mt-2 text-[10px] leading-relaxed text-text-dim italic">
                              &quot;{attempt.reason}&quot;
                            </div>
                          ) : null}
                          {attempt.completionNotes ? (
                            <div className="mt-2 text-[11px] leading-relaxed text-text-primary border-t-[0.5px] border-[rgba(122,155,168,0.05)] pt-2">
                              {attempt.completionNotes}
                            </div>
                          ) : null}
                          <div className="mt-2 text-[8px] uppercase tracking-[0.12em] text-text-dim opacity-50">
                            LOGGED {formatTimestamp(attempt.createdAt)}
                            {attempt.resolvedAt ? ` // RESOLVED ${formatTimestamp(attempt.resolvedAt)}` : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-4 border-t-[0.5px] border-border-subtle pt-4 xl:border-t-0 xl:pt-0">
                    <div className="text-[8px] uppercase tracking-[0.15em] text-text-dim">
                      Status Update
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="text-[8px] uppercase tracking-[0.1em] text-text-dim opacity-60">Completion Log</div>
                        <textarea
                          rows={6}
                          value={completionDraft.completionNotes}
                          onChange={(event) =>
                            setCompletionDraft({ completionNotes: event.target.value })
                          }
                          placeholder="Summary of actions taken..."
                          disabled={activeTask.status === "completed"}
                          className="w-full resize-none border-[0.5px] border-border-subtle bg-[rgba(122,155,168,0.02)] px-[10px] py-[6px] text-[11px] leading-relaxed text-text-primary outline-none placeholder:text-text-dim focus:border-accent-primary disabled:opacity-20 transition-all"
                        />
                        <button
                          type="button"
                          onClick={completeTask}
                          disabled={
                            isCompleting ||
                            activeTask.status === "completed" ||
                            !completionDraft.completionNotes.trim()
                          }
                          className="w-full border-[0.5px] border-status-success bg-transparent px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-status-success transition hover:bg-status-success hover:text-bg-primary disabled:opacity-30"
                        >
                          {isCompleting ? "Processing..." : "Commit Completion"}
                        </button>
                      </div>

                      <div className="space-y-3 pt-4 border-t-[0.5px] border-border-subtle">
                        <div className="text-[8px] uppercase tracking-[0.1em] text-text-dim opacity-60">Slot Reschedule</div>
                        <textarea
                          rows={4}
                          value={rescheduleDraft.reason}
                          onChange={(event) =>
                            setRescheduleDraft((current) => ({
                              ...current,
                              reason: event.target.value,
                            }))
                          }
                          placeholder="Reason for slot deviation..."
                          disabled={activeTask.status === "completed"}
                          className="w-full resize-none border-[0.5px] border-border-subtle bg-[rgba(122,155,168,0.02)] px-[10px] py-[6px] text-[11px] leading-relaxed text-text-primary outline-none placeholder:text-text-dim focus:border-accent-primary disabled:opacity-20 transition-all"
                        />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            value={rescheduleDraft.newStartTime}
                            onChange={(event) =>
                              setRescheduleDraft((current) => ({
                                ...current,
                                newStartTime: event.target.value,
                              }))
                            }
                            placeholder="START (e.g. 14:00)"
                            disabled={activeTask.status === "completed"}
                            className="w-full border-b-[0.5px] border-border-subtle bg-transparent px-[10px] py-[8px] text-[11px] text-text-primary outline-none placeholder:text-text-dim focus:border-accent-primary disabled:opacity-20"
                          />
                          <input
                            value={rescheduleDraft.newEndTime}
                            onChange={(event) =>
                              setRescheduleDraft((current) => ({
                                ...current,
                                newEndTime: event.target.value,
                              }))
                            }
                            placeholder="END (e.g. 15:30)"
                            disabled={activeTask.status === "completed"}
                            className="w-full border-b-[0.5px] border-border-subtle bg-transparent px-[10px] py-[8px] text-[11px] text-text-primary outline-none placeholder:text-text-dim focus:border-accent-primary disabled:opacity-20"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={rescheduleTask}
                          disabled={
                            isRescheduling ||
                            activeTask.status === "completed" ||
                            !rescheduleDraft.reason.trim() ||
                            !rescheduleDraft.newStartTime.trim() ||
                            !rescheduleDraft.newEndTime.trim()
                          }
                          className="w-full border-[0.5px] border-status-warning bg-transparent px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-status-warning transition hover:bg-status-warning hover:text-bg-primary disabled:opacity-30"
                        >
                          {isRescheduling ? "Updating..." : "Execute Reschedule"}
                        </button>
                      </div>

                      {activeTask.status === "completed" ? (
                        <div className="pt-4 border-t-[0.5px] border-border-subtle">
                          <button
                            type="button"
                            onClick={reopenTask}
                            disabled={isReopening}
                            className="w-full border-[0.5px] border-accent-primary bg-transparent px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-accent-primary transition hover:bg-accent-primary hover:text-bg-primary disabled:opacity-30"
                          >
                            {isReopening ? "REOPENING..." : "REOPEN TASK"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-6 border-t-[0.5px] border-[rgba(122,155,168,0.15)] pt-8 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={deleteTask}
                  disabled={isDeleting}
                  className="text-[8px] uppercase tracking-[0.2em] text-status-error opacity-50 hover:opacity-100 transition-opacity disabled:opacity-20"
                >
                  {isDeleting ? "DELETING_TASK..." : "[ PERMANENT_DELETE ]"}
                </button>

                {isEditingNotes ? (
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={cancelEditingNotes}
                      className="border-[0.5px] border-border-subtle bg-transparent px-6 py-2 text-[10px] uppercase tracking-[0.15em] text-text-primary transition hover:border-accent-primary hover:text-accent-primary"
                    >
                      ABORT
                    </button>
                    <button
                      type="button"
                      onClick={saveTaskNotes}
                      disabled={isSavingNotes || !hasDraftChanges}
                      className="border-[0.5px] border-accent-primary bg-transparent px-6 py-2 text-[10px] uppercase tracking-[0.15em] text-accent-primary transition hover:bg-accent-primary hover:text-bg-primary disabled:opacity-30"
                    >
                      {isSavingNotes ? "SAVING..." : "SAVE_NOTES"}
                    </button>
                  </div>
                ) : currentAttempt ? (
                  <div className="text-[9px] uppercase tracking-[0.15em] text-text-dim flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-accent-primary animate-pulse" />
                    LIVE ATTEMPT: {currentAttempt.scheduledStartTime} - {currentAttempt.scheduledEndTime}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center">
              <div className="text-[8px] uppercase tracking-[0.2em] text-text-dim animate-pulse">
                Awaiting Task Selection
              </div>
              <div className="mt-4 max-w-[240px] text-[10px] text-text-dim/60 leading-relaxed">
                Select a sequence from the left queue to initialize detailed view.
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

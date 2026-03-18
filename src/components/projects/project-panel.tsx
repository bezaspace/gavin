"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { onTasksChanged } from "@/components/tasks/task-panel";
import type { Project } from "@/lib/projects/types";
import type { Task, TaskPriority } from "@/lib/tasks/types";

type ProjectsListener = () => void;
type ProjectForm = { title: string; description: string; notes: string };
type TaskForm = {
  title: string;
  description: string;
  notes: string;
  startTime: string;
  endTime: string;
  priority: TaskPriority;
};

const listeners = new Set<ProjectsListener>();

export function onProjectsChanged() {
  listeners.forEach((fn) => fn());
}

function emptyForm(): ProjectForm {
  return { title: "", description: "", notes: "" };
}

function emptyTaskForm(): TaskForm {
  return {
    title: "",
    description: "",
    notes: "",
    startTime: "",
    endTime: "",
    priority: "medium",
  };
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "NOW";

  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) {
    return `${Math.max(1, Math.floor(diffMs / minute))}M`;
  }
  if (diffMs < day) {
    return `${Math.floor(diffMs / hour)}H`;
  }

  return `${Math.floor(diffMs / day)}D`;
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

function formatTaskPriority(priority: TaskPriority) {
  return priority === "high" ? "HIGH" : priority === "low" ? "LOW" : "MED";
}

function formatTaskStatus(task: Task) {
  return task.status === "in_progress"
    ? "ACTIVE"
    : task.status === "completed"
      ? "DONE"
      : "PENDING";
}

function Modal({
  title,
  eyebrow,
  headerActions,
  onClose,
  children,
}: {
  title: string;
  eyebrow: string;
  headerActions?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(4,6,8,0.78)] px-4 py-6 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0"
      />
      <div className="relative z-10 flex max-h-full w-full max-w-3xl flex-col overflow-hidden border-[0.5px] border-border-subtle bg-bg-panel">
        <div className="flex items-start justify-between gap-4 border-b-[0.5px] border-border-subtle px-4 py-2">
          <div>
            <div className="text-[8px] uppercase tracking-[0.15em] text-text-dim">{eyebrow}</div>
            <h2 className="mt-1 text-[18px] font-light tracking-normal text-text-bright">
              {title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              className="border-[0.5px] border-accent-primary bg-transparent px-4 py-2 text-[10px] uppercase tracking-[0.1em] text-accent-primary transition hover:bg-accent-primary hover:text-bg-primary"
            >
              Close
            </button>
          </div>
        </div>
        <div className="min-h-0 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function ProjectPanel() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [createForm, setCreateForm] = useState<ProjectForm>(emptyForm());
  const [draft, setDraft] = useState<ProjectForm>(emptyForm());
  const [taskForm, setTaskForm] = useState<TaskForm>(emptyTaskForm());

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) return;
      const data = (await res.json()) as Project[];
      setProjects(data);
      if (activeProjectId && !data.some((project) => project.id === activeProjectId)) {
        setActiveProjectId(null);
      }
    } catch {
      // ignore and keep existing state
    }
  }, [activeProjectId]);

  const fetchProjectTasks = useCallback(async (projectId: string) => {
    try {
      const res = await fetch(`/api/tasks?projectId=${encodeURIComponent(projectId)}`);
      if (!res.ok) return;
      const data = (await res.json()) as Task[];
      setProjectTasks(data);
    } catch {
      // ignore and keep existing state
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchProjects();
    });
    listeners.add(fetchProjects);
    return () => {
      listeners.delete(fetchProjects);
    };
  }, [fetchProjects]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsCreateOpen(false);
      setIsTaskModalOpen(false);
      setActiveProjectId(null);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  useEffect(() => {
    if (!activeProjectId) {
      setProjectTasks([]);
      return;
    }

    void fetchProjectTasks(activeProjectId);
  }, [activeProjectId, fetchProjectTasks]);

  useEffect(() => {
    const refreshTasks = () => {
      if (activeProjectId) {
        void fetchProjectTasks(activeProjectId);
      }
    };

    window.addEventListener("tasks:changed", refreshTasks);
    return () => window.removeEventListener("tasks:changed", refreshTasks);
  }, [activeProjectId, fetchProjectTasks]);

  const hasDraftChanges = useMemo(() => {
    if (!activeProject) return false;
    return draft.notes !== activeProject.notes;
  }, [activeProject, draft]);

  useEffect(() => {
    if (!activeProject) {
      setDraft(emptyForm());
      return;
    }

    setDraft({
      title: activeProject.title,
      description: activeProject.description,
      notes: activeProject.notes,
    });
  }, [activeProject]);

  const openProject = (project: Project) => {
    setIsEditingNotes(false);
    setActiveProjectId(project.id);
  };

  const closeCreateModal = () => {
    setIsCreateOpen(false);
    setCreateForm(emptyForm());
  };

  const closeTaskModal = () => {
    setIsTaskModalOpen(false);
    setTaskForm(emptyTaskForm());
  };

  const createProject = async () => {
    const title = createForm.title.trim();
    if (!title) return;

    setIsCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: createForm.description,
          notes: createForm.notes,
        }),
      });

      if (!res.ok) return;

      const created = (await res.json()) as Project;
      setProjects((current) => [created, ...current]);
      setCreateForm(emptyForm());
      setIsCreateOpen(false);
      setIsEditingNotes(false);
      setActiveProjectId(created.id);
      onProjectsChanged();
    } finally {
      setIsCreating(false);
    }
  };

  const saveProject = async () => {
    if (!activeProject || !hasDraftChanges) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activeProject.id, notes: draft.notes }),
      });

      if (!res.ok) return;

      const updated = (await res.json()) as Project;
      setProjects((current) =>
        current.map((project) => (project.id === updated.id ? updated : project))
      );
      setIsEditingNotes(false);
      onProjectsChanged();
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCurrentProject = async () => {
    if (!activeProject) return;

    setIsDeleting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activeProject.id }),
      });

      if (!res.ok) return;

      setProjects((current) => current.filter((project) => project.id !== activeProject.id));
      setIsEditingNotes(false);
      setActiveProjectId(null);
      onProjectsChanged();
    } finally {
      setIsDeleting(false);
    }
  };

  const closeProjectModal = () => {
    setIsEditingNotes(false);
    setIsTaskModalOpen(false);
    setActiveProjectId(null);
  };

  const startEditingNotes = () => {
    if (!activeProject) return;
    setDraft({
      title: activeProject.title,
      description: activeProject.description,
      notes: activeProject.notes,
    });
    setIsEditingNotes(true);
  };

  const cancelEditingNotes = () => {
    if (activeProject) {
      setDraft({
        title: activeProject.title,
        description: activeProject.description,
        notes: activeProject.notes,
      });
    }
    setIsEditingNotes(false);
  };

  const createTaskForProject = async () => {
    if (!activeProject) return;

    const title = taskForm.title.trim();
    const startTime = taskForm.startTime.trim();
    const endTime = taskForm.endTime.trim();

    if (!title || !startTime || !endTime) return;

    setIsCreatingTask(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: taskForm.description,
          notes: taskForm.notes,
          startTime,
          endTime,
          priority: taskForm.priority,
          projectId: activeProject.id,
        }),
      });

      if (!res.ok) return;

      closeTaskModal();
      await fetchProjectTasks(activeProject.id);
      onTasksChanged();
    } finally {
      setIsCreatingTask(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-baseline gap-2 text-[11px] tabular-nums">
            <span className="text-[8px] uppercase tracking-[0.15em] text-text-dim">REGISTRY_SIZE</span>
            <span className="text-text-bright">{projects.length}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="border-[0.5px] border-accent-primary bg-transparent px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-accent-primary transition hover:bg-accent-primary hover:text-bg-primary"
          >
            Initialize Project
          </button>
        </div>
        {projects.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
            <div className="text-[8px] uppercase tracking-[0.2em] text-text-dim animate-pulse">Empty Registry</div>
            <div className="mt-4 max-w-md text-[10px] leading-relaxed text-text-dim/60">
              No active projects detected. Initialize a new project module to begin data aggregation.
            </div>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="mt-6 border-[0.5px] border-accent-primary bg-transparent px-6 py-2 text-[10px] uppercase tracking-[0.15em] text-accent-primary transition hover:bg-accent-primary hover:text-bg-primary"
            >
              START_NEW_MISSION
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {projects.map((project) => {
              const hasNotes = project.notes.trim().length > 0;

              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => openProject(project)}
                  className="group flex flex-col border-l-[0.5px] border-t-[0.5px] border-[rgba(122,155,168,0.12)] bg-transparent text-left transition duration-200 hover:border-accent-primary hover:bg-[rgba(122,155,168,0.04)]"
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b-[0.5px] border-[rgba(122,155,168,0.06)]">
                    <span className="text-[8px] uppercase tracking-[0.15em] text-text-dim opacity-60">P#{project.serialNumber}</span>
                    <span className="text-[8px] uppercase tracking-[0.1em] text-accent-primary opacity-0 group-hover:opacity-100 transition-opacity">[OPEN]</span>
                  </div>

                  <div className="p-4 flex-1">
                    <div className="text-[16px] font-light tracking-normal text-text-bright group-hover:text-accent-primary transition-colors">
                      {project.title}
                    </div>
                    <p className="mt-3 text-[10px] leading-relaxed text-text-dim line-clamp-3">
                      {project.description.trim() || "No description initialized."}
                    </p>
                  </div>

                  <div className="flex items-center justify-between px-3 py-2 bg-[rgba(122,155,168,0.02)] border-t-[0.5px] border-[rgba(122,155,168,0.06)]">
                    <div className="flex items-center gap-1.5">
                      <div className={`h-1 w-1 rounded-full ${hasNotes ? "bg-status-success" : "bg-text-dim"}`} />
                      <span className="text-[8px] uppercase tracking-[0.1em] text-text-dim/80">
                        {hasNotes ? "NOTES_ACTIVE" : "NO_DATA"}
                      </span>
                    </div>
                    <span className="text-[8px] uppercase tracking-[0.1em] text-text-dim opacity-50 tabular-nums">
                      {formatUpdatedAt(project.updatedAt)} AGO
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {isCreateOpen && (
        <Modal title="Initialize Project" eyebrow="// NEW_PROJECT_MODULE" onClose={closeCreateModal}>
          <div className="space-y-6 px-6 py-5">
            <div className="space-y-2">
              <label className="text-[8px] uppercase tracking-[0.15em] text-text-dim">
                Title
              </label>
              <input
                autoFocus
                value={createForm.title}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="MISSION_TITLE"
                className="w-full border-b-[0.5px] border-border-subtle bg-transparent px-[10px] py-[8px] text-[11px] text-text-primary outline-none placeholder:text-text-dim focus:border-accent-primary transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[8px] uppercase tracking-[0.15em] text-text-dim">
                Description
              </label>
              <textarea
                rows={3}
                value={createForm.description}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="OBJECTIVE_SUMMARY"
                className="w-full resize-none border-[0.5px] border-border-subtle bg-[rgba(122,155,168,0.02)] px-[10px] py-[8px] text-[11px] text-text-primary outline-none placeholder:text-text-dim focus:border-accent-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[8px] uppercase tracking-[0.15em] text-text-dim">
                Notes
              </label>
              <textarea
                rows={8}
                value={createForm.notes}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, notes: event.target.value }))
                }
                placeholder="DETAILED_SPECIFICATIONS"
                className="w-full resize-none border-[0.5px] border-border-subtle bg-[rgba(122,155,168,0.02)] px-[10px] py-[8px] text-[11px] leading-relaxed text-text-primary outline-none placeholder:text-text-dim focus:border-accent-primary"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t-[0.5px] border-[rgba(122,155,168,0.1)]">
              <button
                type="button"
                onClick={closeCreateModal}
                className="border-[0.5px] border-border-subtle bg-transparent px-6 py-2 text-[10px] uppercase tracking-[0.15em] text-text-primary transition hover:border-accent-primary hover:text-accent-primary"
              >
                ABORT
              </button>
              <button
                type="button"
                onClick={createProject}
                disabled={isCreating || !createForm.title.trim()}
                className="border-[0.5px] border-accent-primary bg-transparent px-6 py-2 text-[10px] uppercase tracking-[0.15em] text-accent-primary transition hover:bg-accent-primary hover:text-bg-primary disabled:opacity-30"
              >
                {isCreating ? "PROCESS..." : "INITIALIZE"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {activeProject && (
        <Modal
          title={activeProject.title}
          eyebrow={`// PROJECT_MODULE #${activeProject.serialNumber}`}
          headerActions={
            <>
              {!isEditingNotes ? (
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(true)}
                  className="border-[0.5px] border-accent-primary bg-transparent px-3 py-2 text-[8px] uppercase tracking-[0.15em] text-accent-primary transition hover:bg-accent-primary hover:text-bg-primary"
                >
                  APPEND_TASK
                </button>
              ) : null}
              {!isEditingNotes ? (
                <button
                  type="button"
                  onClick={startEditingNotes}
                  className="border-[0.5px] border-border-subtle bg-transparent px-3 py-2 text-[8px] uppercase tracking-[0.15em] text-text-primary transition hover:border-accent-primary hover:text-accent-primary"
                >
                  EDIT_DATA
                </button>
              ) : null}
            </>
          }
          onClose={closeProjectModal}
        >
          <div className="space-y-8 px-6 py-5">
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-2">
              <div className="lg:col-span-2 border-b-[0.5px] border-border-subtle pb-4">
                <div className="text-[8px] uppercase tracking-[0.15em] text-text-dim">Objective</div>
                <div className="mt-2 text-[11px] leading-relaxed text-text-primary">
                  {activeProject.description.trim() || "No objective initialized."}
                </div>
              </div>
              
              <div>
                <div className="text-[8px] uppercase tracking-[0.15em] text-text-dim">Registry entry</div>
                <div className="mt-1 text-[11px] text-text-bright tabular-nums">
                  {formatTimestamp(activeProject.createdAt)}
                </div>
              </div>
              <div>
                <div className="text-[8px] uppercase tracking-[0.15em] text-text-dim">Last update</div>
                <div className="mt-1 text-[11px] text-text-bright tabular-nums">
                  {formatTimestamp(activeProject.updatedAt)}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between border-b-[0.5px] border-border-subtle pb-2">
                <label className="text-[8px] uppercase tracking-[0.15em] text-text-dim">
                  Internal Specifications
                </label>
                {isEditingNotes && (
                  <span className="text-[8px] uppercase tracking-[0.1em] text-accent-primary animate-pulse">MODERATING</span>
                )}
              </div>
              {isEditingNotes ? (
                <textarea
                  rows={10}
                  value={draft.notes}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, notes: event.target.value }))
                  }
                  placeholder="PROJECT_DETAILS"
                  className="w-full resize-none border-[0.5px] border-border-subtle bg-[rgba(122,155,168,0.02)] px-[10px] py-[8px] text-[11px] leading-relaxed text-text-primary outline-none placeholder:text-text-dim focus:border-accent-primary"
                />
              ) : (
                <div className="min-h-[160px] text-[11px] leading-relaxed text-text-primary whitespace-pre-wrap">
                  {activeProject.notes.trim() || "No specifications defined."}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b-[0.5px] border-border-subtle pb-2">
                <label className="text-[8px] uppercase tracking-[0.15em] text-text-dim">
                  Linked Sequences
                </label>
                <div className="text-[8px] uppercase tracking-[0.15em] text-text-dim">
                  {projectTasks.length} NODES
                </div>
              </div>

              <div className="space-y-px">
                {projectTasks.length === 0 ? (
                  <div className="py-4 text-[10px] text-text-dim uppercase tracking-[0.05em]">
                    No task sequences linked.
                  </div>
                ) : (
                  <div>
                    {projectTasks.map((task) => (
                      <div
                        key={task.id}
                        className="group flex items-start justify-between gap-4 border-b-[0.5px] border-[rgba(122,155,168,0.05)] py-3 transition hover:bg-[rgba(122,155,168,0.02)]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3 text-[8px] uppercase tracking-[0.15em]">
                            <span className="text-accent-primary opacity-60">#{task.serialNumber}</span>
                            <span className="text-text-dim tabular-nums">{task.startTime} - {task.endTime}</span>
                          </div>
                          <div className="mt-1 text-[11px] text-text-bright group-hover:text-accent-primary transition-colors">
                            {task.title}
                          </div>
                        </div>
                        <div className="text-right text-[8px] uppercase tracking-[0.15em]">
                          <div className={
                            task.status === 'completed' ? 'text-status-success' :
                            task.status === 'in_progress' ? 'text-status-warning' : 'text-text-dim'
                          }>{formatTaskStatus(task)}</div>
                          <div className="mt-1 text-text-dim opacity-50">{formatTaskPriority(task.priority)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-4 border-t-[0.5px] border-[rgba(122,155,168,0.1)] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={deleteCurrentProject}
                disabled={isDeleting}
                className="text-[8px] uppercase tracking-[0.2em] text-status-error opacity-50 hover:opacity-100 transition-opacity disabled:opacity-20"
              >
                {isDeleting ? "DECOMMISSIONING..." : "[ DELETE_MODULE ]"}
              </button>

              <div className="flex justify-end gap-3">
                {isEditingNotes ? (
                  <>
                    <button
                      type="button"
                      onClick={cancelEditingNotes}
                      className="border-[0.5px] border-border-subtle bg-transparent px-6 py-2 text-[10px] uppercase tracking-[0.15em] text-text-primary transition hover:border-accent-primary hover:text-accent-primary"
                    >
                      ABORT
                    </button>
                    <button
                      type="button"
                      onClick={saveProject}
                      disabled={isSaving || !hasDraftChanges}
                      className="border-[0.5px] border-accent-primary bg-transparent px-6 py-2 text-[10px] uppercase tracking-[0.15em] text-accent-primary transition hover:bg-accent-primary hover:text-bg-primary disabled:opacity-30"
                    >
                      {isSaving ? "COMMIT..." : "SAVE_DATA"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={closeProjectModal}
                    className="border-[0.5px] border-border-subtle bg-transparent px-6 py-2 text-[10px] uppercase tracking-[0.15em] text-text-primary transition hover:border-accent-primary hover:text-accent-primary"
                  >
                    DISMISS
                  </button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {activeProject && isTaskModalOpen && (
        <Modal
          title={`Create task for ${activeProject.title}`}
          eyebrow={`// Project #${activeProject.serialNumber}`}
          onClose={closeTaskModal}
        >
          <div className="space-y-4 px-4 py-3">
            <div className="space-y-2">
              <label className="text-[8px] uppercase tracking-[0.15em] text-text-dim">
                Title
              </label>
              <input
                autoFocus
                value={taskForm.title}
                onChange={(event) =>
                  setTaskForm((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Task title"
                className="w-full border-[0.5px] border-border-subtle bg-bg-primary px-[10px] py-[6px] text-[11px] text-text-primary outline-none placeholder:text-text-dim focus:border-accent-primary"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-1">
                <label className="text-[8px] uppercase tracking-[0.15em] text-text-dim">
                  Start
                </label>
                <input
                  value={taskForm.startTime}
                  onChange={(event) =>
                    setTaskForm((current) => ({ ...current, startTime: event.target.value }))
                  }
                  placeholder="09:00"
                  className="w-full border-[0.5px] border-border-subtle bg-bg-primary px-[10px] py-[6px] text-[11px] text-text-primary outline-none placeholder:text-text-dim focus:border-accent-primary"
                />
              </div>
              <div className="space-y-2 sm:col-span-1">
                <label className="text-[8px] uppercase tracking-[0.15em] text-text-dim">
                  End
                </label>
                <input
                  value={taskForm.endTime}
                  onChange={(event) =>
                    setTaskForm((current) => ({ ...current, endTime: event.target.value }))
                  }
                  placeholder="10:00"
                  className="w-full border-[0.5px] border-border-subtle bg-bg-primary px-[10px] py-[6px] text-[11px] text-text-primary outline-none placeholder:text-text-dim focus:border-accent-primary"
                />
              </div>
              <div className="space-y-2 sm:col-span-1">
                <label className="text-[8px] uppercase tracking-[0.15em] text-text-dim">
                  Priority
                </label>
                <select
                  value={taskForm.priority}
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      priority: event.target.value as TaskPriority,
                    }))
                  }
                  className="w-full border-[0.5px] border-border-subtle bg-bg-primary px-[10px] py-[6px] text-[11px] text-text-primary outline-none focus:border-accent-primary"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[8px] uppercase tracking-[0.15em] text-text-dim">
                Description
              </label>
              <textarea
                rows={3}
                value={taskForm.description}
                onChange={(event) =>
                  setTaskForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Task summary"
                className="w-full resize-none border-[0.5px] border-border-subtle bg-bg-primary px-[10px] py-[6px] text-[11px] text-text-primary outline-none placeholder:text-text-dim focus:border-accent-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[8px] uppercase tracking-[0.15em] text-text-dim">
                Notes
              </label>
              <textarea
                rows={7}
                value={taskForm.notes}
                onChange={(event) =>
                  setTaskForm((current) => ({ ...current, notes: event.target.value }))
                }
                placeholder="Task notes"
                className="w-full resize-none border-[0.5px] border-border-subtle bg-bg-primary px-[10px] py-[6px] text-[11px] leading-6 text-text-primary outline-none placeholder:text-text-dim focus:border-accent-primary"
              />
            </div>

            <div className="flex justify-end gap-2 border-t-[0.5px] border-border-subtle pt-3">
              <button
                type="button"
                onClick={closeTaskModal}
                className="border-[0.5px] border-border-subtle bg-transparent px-4 py-2 text-[10px] uppercase tracking-[0.1em] text-text-primary transition hover:border-accent-primary hover:text-accent-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createTaskForProject}
                disabled={
                  isCreatingTask ||
                  !taskForm.title.trim() ||
                  !taskForm.startTime.trim() ||
                  !taskForm.endTime.trim()
                }
                className="border-[0.5px] border-accent-primary bg-transparent px-4 py-2 text-[10px] uppercase tracking-[0.1em] text-accent-primary transition hover:bg-accent-primary hover:text-bg-primary disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-accent-primary"
              >
                {isCreatingTask ? "Creating..." : "Create task"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

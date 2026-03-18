"use client";

import { useEffect, useState } from "react";
import type { Task } from "@/lib/tasks/types";

type TimelineTask = Task & {
  startMinutes: number;
  endMinutes: number;
};

type TimelineLane = {
  endMinutes: number;
};

type FetchState = {
  tasks: Task[];
  loading: boolean;
};

const HOUR_START = 6 * 60;
const HOUR_END = 22 * 60;
const PX_PER_MINUTE = 2.2;
const MIN_BLOCK_HEIGHT = 88;
const VISUAL_MIN_DURATION = MIN_BLOCK_HEIGHT / PX_PER_MINUTE;
const VERTICAL_GAP_MINUTES = 8 / PX_PER_MINUTE;

function parseTime(value: string): number {
  const input = value.trim().toLowerCase();
  const match = input.match(
    /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/
  );

  if (!match) return 0;

  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  const meridiem = match[3];

  if (meridiem) {
    if (hours === 12) {
      hours = 0;
    }
    if (meridiem === "pm") {
      hours += 12;
    }
  }

  return hours * 60 + minutes;
}

function formatMinutes(total: number): string {
  const clamped = ((total % 1440) + 1440) % 1440;
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function formatRange(start: number, end: number): string {
  return `${formatMinutes(start)} - ${formatMinutes(end)}`;
}

function buildTimelineTasks(tasks: Task[]): TimelineTask[] {
  return tasks
    .map((task) => {
      const startMinutes = parseTime(task.startTime);
      const endMinutes = Math.max(parseTime(task.endTime), startMinutes + 20);

      return {
        ...task,
        startMinutes,
        endMinutes,
      };
    })
    .sort((a, b) => {
      if (a.startMinutes === b.startMinutes) {
        return b.endMinutes - a.endMinutes;
      }
      return a.startMinutes - b.startMinutes;
    });
}

function assignLanes(tasks: TimelineTask[]): number[] {
  const lanes: TimelineLane[] = [];
  const assignments: number[] = [];

  tasks.forEach((task) => {
    // The visual end of a task is the maximum of its actual end and its visual duration footprint
    const visualEnd = Math.max(task.endMinutes, task.startMinutes + VISUAL_MIN_DURATION);
    
    // Find a lane where the previous task's visual end (plus a small vertical gap) 
    // is before this task's start time.
    let laneIndex = lanes.findIndex((lane) => lane.endMinutes + VERTICAL_GAP_MINUTES <= task.startMinutes);

    if (laneIndex === -1) {
      laneIndex = lanes.length;
      lanes.push({ endMinutes: visualEnd });
    } else {
      lanes[laneIndex].endMinutes = visualEnd;
    }

    assignments.push(laneIndex);
  });

  return assignments;
}

export function TimelineView() {
  const [state, setState] = useState<FetchState>({ tasks: [], loading: true });

  useEffect(() => {
    let active = true;

    const loadTasks = async () => {
      try {
        const res = await fetch("/api/tasks");
        if (!res.ok) return;
        const data = (await res.json()) as Task[];
        if (active) {
          setState({ tasks: data, loading: false });
        }
      } catch {
        if (active) {
          setState((current) => ({ ...current, loading: false }));
        }
      }
    };

    void loadTasks();

    const refresh = () => {
      void loadTasks();
    };

    window.addEventListener("tasks:changed", refresh);

    return () => {
      active = false;
      window.removeEventListener("tasks:changed", refresh);
    };
  }, []);

  const timelineTasks = buildTimelineTasks(state.tasks);
  const laneAssignments = assignLanes(timelineTasks);
  const timelineHeight = (HOUR_END - HOUR_START) * PX_PER_MINUTE;

  return (
    <div className="relative flex flex-1 flex-col min-h-0 bg-bg-primary text-text-primary overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-60 [background-image:linear-gradient(rgba(122,155,168,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(122,155,168,0.04)_1px,transparent_1px)] [background-size:100%_64px,64px_100%]" />
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <div className="relative overflow-auto h-full">
          <div
            className="relative mx-auto min-w-[760px] h-full"
            style={{ height: `${timelineHeight + 120}px` }}
          >
            <div
              className="absolute left-[140px] top-0 bottom-0 w-px bg-[rgba(122,155,168,0.2)]"
              aria-hidden="true"
            />
            <div
              className="absolute left-[140px] top-0 bottom-0 w-[2px] bg-[linear-gradient(to_bottom,rgba(122,155,168,0.5),rgba(122,155,168,0.05))]"
              aria-hidden="true"
            />

            {Array.from({ length: 17 }).map((_, index) => {
              const hour = HOUR_START / 60 + index;
              const top = index * 60 * PX_PER_MINUTE;
              return (
                <div
                  key={hour}
                  className="absolute left-0 right-0"
                  style={{ top: `${top}px` }}
                >
                  <div className="absolute left-6 text-[8px] uppercase tracking-[0.16em] text-text-dim -translate-y-1/2">
                    {formatMinutes(hour * 60)}
                  </div>
                  <div className="absolute left-[140px] right-0 top-0 border-t border-[rgba(122,155,168,0.08)]" />
                </div>
              );
            })}

            {state.loading ? null : timelineTasks.map((task, index) => {
              const lane = laneAssignments[index];
              const laneWidth = 176;
              const laneGap = 22;
              const leftOffset = 176 + lane * (laneWidth + laneGap);
              const top = Math.max((task.startMinutes - HOUR_START) * PX_PER_MINUTE, 0);
              const height = Math.max(
                (task.endMinutes - task.startMinutes) * PX_PER_MINUTE,
                MIN_BLOCK_HEIGHT
              );
              const isActive = task.status === "in_progress";
              const isDone = task.status === "completed";

              return (
                <div
                  key={task.id}
                  className="absolute"
                  style={{
                    top: `${top + 12}px`,
                    left: `${leftOffset}px`,
                    width: `${laneWidth}px`,
                    height: `${height}px`,
                  }}
                >
                  <div
                    className={`relative h-full border px-3 py-3 shadow-[0_0_0_1px_rgba(122,155,168,0.05)] overflow-hidden ${
                      isDone
                        ? "border-status-success/40 bg-[rgba(74,152,104,0.08)]"
                        : isActive
                          ? "border-status-warning/40 bg-[rgba(184,152,72,0.09)]"
                          : "border-[rgba(122,155,168,0.14)] bg-[rgba(10,12,14,0.95)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isDone
                              ? "bg-status-success"
                              : isActive
                                ? "bg-status-warning"
                                : "bg-text-dim"
                          }`}
                        />
                        <span className="text-[8px] uppercase tracking-[0.15em] text-text-dim">
                          #{task.serialNumber}
                        </span>
                      </div>
                      <span className="text-[8px] uppercase tracking-[0.15em] text-text-dim">
                        {task.priority}
                      </span>
                    </div>

                    <div className="mt-3 text-[11px] leading-relaxed text-text-bright">
                      {task.title}
                    </div>
                     <div className="mt-1 text-[9px] uppercase tracking-[0.12em] text-text-dim">
                       {formatRange(task.startMinutes, task.endMinutes)}
                     </div>
                    <div className="mt-1 text-[8px] uppercase tracking-[0.12em] text-text-dim">
                      Attempt {task.currentAttemptNumber}
                      {task.reassignmentCount > 0 ? ` | Reassigned ${task.reassignmentCount}` : ""}
                    </div>
                    {task.notes && (
                      <div className="mt-2 text-[9px] text-text-dim overflow-hidden max-h-10">
                        {task.notes}
                      </div>
                    )}
                  </div>

                  <div
                    className={`absolute top-1/2 -translate-y-1/2 w-6 h-px ${
                      lane % 2 === 0
                        ? "left-[-24px] bg-[linear-gradient(to_left,rgba(122,155,168,0.5),transparent)]"
                        : "right-[-24px] bg-[linear-gradient(to_right,rgba(122,155,168,0.5),transparent)]"
                    }`}
                    aria-hidden="true"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

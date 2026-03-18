import { NextRequest, NextResponse } from "next/server";
import { getProject } from "@/lib/projects/store";
import {
  addTask,
  completeTask,
  deleteTask,
  getTasks,
  getTasksByProject,
  getTaskWithHistory,
  reopenTask,
  rescheduleTask,
  updateTask,
} from "@/lib/tasks/store";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  const historyId = request.nextUrl.searchParams.get("history")?.trim();

  if (historyId) {
    const task = getTaskWithHistory(historyId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json(task);
  }

  if (projectId) {
    return NextResponse.json(getTasksByProject(projectId));
  }

  return NextResponse.json(getTasks());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const startTime = String(body.startTime ?? "").trim();
    const endTime = String(body.endTime ?? "").trim();
    const projectId = body.projectId === undefined ? null : String(body.projectId).trim();

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: "title, startTime, and endTime are required" },
        { status: 400 }
      );
    }

    if (projectId && !getProject(projectId)) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const task = addTask({
      title,
      description: body.description ? String(body.description) : "",
      notes: body.notes ? String(body.notes) : "",
      projectId,
      startTime,
      endTime,
      priority:
        body.priority === "low" || body.priority === "high"
          ? body.priority
          : "medium",
    });

    return NextResponse.json(task, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid task payload" }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const id = String(body.id ?? "");
    const action = String(body.action ?? "update");
    const projectId =
      body.projectId === undefined
        ? undefined
        : body.projectId === null
          ? null
          : String(body.projectId).trim();

    if (!id) {
      return NextResponse.json({ error: "Task id is required" }, { status: 400 });
    }

    if (action === "reschedule") {
      const reason = String(body.reason ?? "").trim();
      const newStartTime = String(body.newStartTime ?? "").trim();
      const newEndTime = String(body.newEndTime ?? "").trim();

      if (!reason || !newStartTime || !newEndTime) {
        return NextResponse.json(
          { error: "reason, newStartTime, and newEndTime are required" },
          { status: 400 }
        );
      }

      try {
        const task = rescheduleTask({
          id,
          reason,
          newStartTime,
          newEndTime,
          notes: body.notes === undefined ? undefined : String(body.notes),
        });

        if (!task) {
          return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        return NextResponse.json(task);
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Unable to reschedule task" },
          { status: 400 }
        );
      }
    }

    if (action === "complete") {
      const completionNotes = String(body.completionNotes ?? "").trim();
      if (!completionNotes) {
        return NextResponse.json(
          { error: "completionNotes is required" },
          { status: 400 }
        );
      }

      try {
        const task = completeTask({
          id,
          completionNotes,
          notes: body.notes === undefined ? undefined : String(body.notes),
        });

        if (!task) {
          return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        return NextResponse.json(task);
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Unable to complete task" },
          { status: 400 }
        );
      }
    }

    if (action === "reopen") {
      const task = reopenTask(id);
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
      return NextResponse.json(task);
    }

    if (projectId && !getProject(projectId)) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const task = updateTask(id, {
      title: body.title === undefined ? undefined : String(body.title),
      description:
        body.description === undefined ? undefined : String(body.description),
      notes: body.notes === undefined ? undefined : String(body.notes),
      projectId,
      startTime:
        body.startTime === undefined ? undefined : String(body.startTime),
      endTime: body.endTime === undefined ? undefined : String(body.endTime),
      status:
        body.status === "pending" ||
        body.status === "in_progress" ||
        body.status === "completed"
          ? body.status
          : undefined,
      priority:
        body.priority === "low" ||
        body.priority === "medium" ||
        body.priority === "high"
          ? body.priority
          : undefined,
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch {
    return NextResponse.json({ error: "Invalid task payload" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const id = String(body.id ?? "");
    if (!id) {
      return NextResponse.json({ error: "Task id is required" }, { status: 400 });
    }

    const deleted = deleteTask(id);
    if (!deleted) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid task payload" }, { status: 400 });
  }
}

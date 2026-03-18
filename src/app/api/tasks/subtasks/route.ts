import { NextRequest, NextResponse } from "next/server";
import {
  addTaskSubtask,
  deleteTaskSubtask,
  getTaskSubtasks,
  reorderTaskSubtasks,
  toggleTaskSubtask,
} from "@/lib/tasks/store";

export async function GET(request: NextRequest) {
  const taskId = request.nextUrl.searchParams.get("taskId")?.trim();

  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  return NextResponse.json(getTaskSubtasks(taskId));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const taskId = String(body.taskId ?? "").trim();
    const title = String(body.title ?? "").trim();

    if (!taskId || !title) {
      return NextResponse.json(
        { error: "taskId and title are required" },
        { status: 400 }
      );
    }

    const subtask = addTaskSubtask({ taskId, title });
    if (!subtask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(subtask, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid subtask payload" }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const taskId = String(body.taskId ?? "").trim();

    if (body.action === "reorder") {
      const orderedSubtaskIds = Array.isArray(body.orderedSubtaskIds)
        ? body.orderedSubtaskIds
            .map((value: unknown) => String(value).trim())
            .filter(Boolean)
        : [];

      if (!taskId || orderedSubtaskIds.length === 0) {
        return NextResponse.json(
          { error: "taskId and orderedSubtaskIds are required" },
          { status: 400 }
        );
      }

      try {
        const subtasks = reorderTaskSubtasks({ taskId, orderedSubtaskIds });
        if (!subtasks) {
          return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }
        return NextResponse.json(subtasks);
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Unable to reorder subtasks" },
          { status: 400 }
        );
      }
    }

    const subtaskId = String(body.subtaskId ?? "").trim();

    if (!taskId || !subtaskId || typeof body.isCompleted !== "boolean") {
      return NextResponse.json(
        { error: "taskId, subtaskId, and boolean isCompleted are required" },
        { status: 400 }
      );
    }

    const subtask = toggleTaskSubtask({
      taskId,
      subtaskId,
      isCompleted: body.isCompleted,
    });

    if (!subtask) {
      return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
    }

    return NextResponse.json(subtask);
  } catch {
    return NextResponse.json({ error: "Invalid subtask payload" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const taskId = String(body.taskId ?? "").trim();
    const subtaskId = String(body.subtaskId ?? "").trim();

    if (!taskId || !subtaskId) {
      return NextResponse.json(
        { error: "taskId and subtaskId are required" },
        { status: 400 }
      );
    }

    const deleted = deleteTaskSubtask({ taskId, subtaskId });
    if (!deleted) {
      return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid subtask payload" }, { status: 400 });
  }
}

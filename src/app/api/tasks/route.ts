import { NextRequest, NextResponse } from "next/server";
import { addTask, getTasks, updateTask, deleteTask } from "@/lib/tasks/store";

export async function GET() {
  return NextResponse.json(getTasks());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const startTime = String(body.startTime ?? "").trim();
    const endTime = String(body.endTime ?? "").trim();

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: "title, startTime, and endTime are required" },
        { status: 400 }
      );
    }

    const task = addTask({
      title,
      description: body.description ? String(body.description) : "",
      notes: body.notes ? String(body.notes) : "",
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
    if (!id) {
      return NextResponse.json({ error: "Task id is required" }, { status: 400 });
    }

    const task = updateTask(id, {
      title: body.title === undefined ? undefined : String(body.title),
      description:
        body.description === undefined ? undefined : String(body.description),
      notes: body.notes === undefined ? undefined : String(body.notes),
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

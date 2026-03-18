import { NextRequest, NextResponse } from "next/server";
import {
  addProject,
  deleteProject,
  getProjects,
  updateProject,
} from "@/lib/projects/store";

export async function GET() {
  return NextResponse.json(getProjects());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const title = String(body.title ?? "").trim();

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const project = addProject({
      title,
      description: body.description ? String(body.description) : "",
      notes: body.notes ? String(body.notes) : "",
    });

    return NextResponse.json(project, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid project payload" }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const id = String(body.id ?? "");

    if (!id) {
      return NextResponse.json({ error: "Project id is required" }, { status: 400 });
    }

    const project = updateProject(id, {
      title: body.title === undefined ? undefined : String(body.title),
      description:
        body.description === undefined ? undefined : String(body.description),
      notes: body.notes === undefined ? undefined : String(body.notes),
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "Invalid project payload" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const id = String(body.id ?? "");

    if (!id) {
      return NextResponse.json({ error: "Project id is required" }, { status: 400 });
    }

    const deleted = deleteProject(id);
    if (!deleted) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid project payload" }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { addBrainDumpEntry, getBrainDumpEntries } from "@/lib/brain-dump/store";

export async function GET() {
  return NextResponse.json(getBrainDumpEntries());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const content = String(body.content ?? "").trim();

    if (!content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const entry = addBrainDumpEntry({ content });
    return NextResponse.json(entry, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid brain dump payload" }, { status: 400 });
  }
}

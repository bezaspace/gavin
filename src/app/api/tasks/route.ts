import { NextResponse } from "next/server";
import { getTasks } from "@/lib/tasks/store";

export async function GET() {
  return NextResponse.json(getTasks());
}

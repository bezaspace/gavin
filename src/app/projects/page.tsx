import type { Metadata } from "next";
import { ProjectPanel } from "@/components/projects/project-panel";

export const metadata: Metadata = {
  title: "GAVIN // Projects",
  description: "Standalone project notes and project list view",
};

export default function ProjectsPage() {
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden bg-[rgba(10,12,14,0.65)]">
      <ProjectPanel />
    </div>
  );
}

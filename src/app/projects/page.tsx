import type { Metadata } from "next";
import { ProjectPanel } from "@/components/projects/project-panel";

export const metadata: Metadata = {
  title: "GAVIN // Projects",
  description: "Standalone project notes and project list view",
};

export default function ProjectsPage() {
  return (
    <div className="flex flex-1 min-h-0 p-4 overflow-hidden">
      <div className="flex flex-1 min-h-0 border border-[rgba(122,155,168,0.1)] bg-[rgba(10,12,14,0.65)] overflow-hidden">
        <ProjectPanel />
      </div>
    </div>
  );
}

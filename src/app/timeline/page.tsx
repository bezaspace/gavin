import type { Metadata } from "next";
import { TimelineView } from "@/components/timeline/timeline-view";

export const metadata: Metadata = {
  title: "GAVIN // Timeline View",
  description: "Vertical timeline view of all scheduled tasks",
};

export default function TimelinePage() {
  return <TimelineView />;
}

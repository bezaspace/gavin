import type { Metadata } from "next";
import { BrainDumpPanel } from "@/components/brain-dump/brain-dump-panel";

export const metadata: Metadata = {
  title: "GAVIN // Brain Dump",
  description: "Timestamped capture inbox for unprocessed thoughts",
};

export default function BrainDumpPage() {
  return <BrainDumpPanel />;
}

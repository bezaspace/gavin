"use client";

import { useCallback, useEffect, useState } from "react";
import { BRAIN_DUMP_CHANGED_EVENT } from "@/components/brain-dump/events";
import type { BrainDumpEntry } from "@/lib/brain-dump/types";

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function BrainDumpPanel() {
  const [entries, setEntries] = useState<BrainDumpEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/brain-dump");
      if (!res.ok) return;
      const data = (await res.json()) as BrainDumpEntry[];
      setEntries(data);
    } catch {
      // silent fail - refresh on next event
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchEntries();

    const refresh = () => {
      void fetchEntries();
    };

    window.addEventListener(BRAIN_DUMP_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(BRAIN_DUMP_CHANGED_EVENT, refresh);
  }, [fetchEntries]);

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden bg-[rgba(10,12,14,0.65)]">
      <div className="border-b-[0.5px] border-[rgba(122,155,168,0.15)] px-6 py-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[8px] uppercase tracking-[0.15em] text-text-dim">
              {"// Thought Inbox"}
            </div>
            <h1 className="mt-2 text-[24px] font-light tracking-[-0.01em] text-text-bright">
              Brain Dump
            </h1>
            <p className="mt-2 max-w-2xl text-[10px] leading-relaxed text-text-dim">
              Capture stray thoughts instantly, then sort them later when you have time.
            </p>
          </div>

          <div className="flex items-center gap-4 text-[8px] uppercase tracking-[0.15em] text-text-dim">
            <span>
              HOTKEY <span className="text-text-bright">ALT + Q</span>
            </span>
            <span>
              ENTRIES <span className="text-text-bright">{entries.length}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center text-[8px] uppercase tracking-[0.2em] text-text-dim animate-pulse">
            Syncing thought stream
          </div>
        ) : entries.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
            <div className="text-[8px] uppercase tracking-[0.2em] text-text-dim animate-pulse">
              No Captured Thoughts
            </div>
            <div className="mt-4 max-w-md text-[10px] leading-relaxed text-text-dim/60">
              Press <span className="text-text-bright">Alt + Q</span>, type the thought,
              then press Enter to drop it here with a timestamp.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry, index) => (
              <article
                key={entry.id}
                className="border-l-[0.5px] border-t-[0.5px] border-[rgba(122,155,168,0.12)] bg-[rgba(122,155,168,0.03)] px-4 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b-[0.5px] border-[rgba(122,155,168,0.08)] pb-3">
                  <div className="flex items-center gap-3 text-[8px] uppercase tracking-[0.15em] text-text-dim">
                    <span className="text-accent-primary opacity-60">
                      ENTRY {String(entries.length - index).padStart(3, "0")}
                    </span>
                    <span className="text-text-bright">{formatTimestamp(entry.createdAt)}</span>
                  </div>
                  <span className="text-[8px] uppercase tracking-[0.15em] text-text-dim">
                    RAW CAPTURE
                  </span>
                </div>

                <div className="mt-4 whitespace-pre-wrap text-[12px] leading-relaxed text-text-bright">
                  {entry.content}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

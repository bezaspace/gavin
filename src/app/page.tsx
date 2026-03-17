import { ChatPanel } from "@/components/chat/chat-panel";
import { TaskPanel } from "@/components/tasks/task-panel";

export default function Home() {
  return (
    <div className="h-screen flex flex-col bg-bg-primary">
      {/* Header */}
      <header className="border-b border-[rgba(122,155,168,0.1)] px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
          <span className="text-[11px] font-light text-text-bright tracking-[0.1em]">
            GAVIN
          </span>
          <span className="text-[8px] uppercase tracking-[0.15em] text-text-dim">
            // Productivity Terminal
          </span>
        </div>
        <div className="text-[8px] uppercase tracking-[0.15em] text-text-dim">
          v0.1.0
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Chat Panel — takes remaining space */}
        <div className="flex-1 border-r border-[rgba(122,155,168,0.1)]">
          <ChatPanel />
        </div>

        {/* Task Panel — fixed 320px sidebar */}
        <div className="w-80 shrink-0">
          <TaskPanel />
        </div>
      </div>
    </div>
  );
}

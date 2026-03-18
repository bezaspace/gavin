"use client";

import type { UIMessage } from "ai";

const TOOL_NAMES = [
  "createTask",
  "updateTask",
  "rescheduleTask",
  "completeTask",
  "addSubtasks",
  "toggleSubtask",
  "deleteSubtask",
  "suggestSubtasks",
  "deleteTask",
  "listTasks",
] as const;
type ToolName = (typeof TOOL_NAMES)[number];

function isToolPart(part: UIMessage["parts"][number]): part is UIMessage["parts"][number] & { type: `tool-${ToolName}`; state: string } {
  return typeof part === "object" && part !== null && "type" in part && TOOL_NAMES.some((name) => part.type === `tool-${name}`);
}

function formatToolName(type: string): string {
  const name = type.replace("tool-", "");
  return name.replace(/([A-Z])/g, " $1").toUpperCase();
}

interface MessageProps {
  message: UIMessage;
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] border px-3 py-2 ${
          isUser
            ? "border-[rgba(122,155,168,0.25)] bg-[rgba(122,155,168,0.05)]"
            : "border-[rgba(122,155,168,0.1)] bg-transparent"
        }`}
      >
        <div
          className={`text-[8px] uppercase tracking-[0.15em] mb-1 ${
            isUser ? "text-text-dim text-right" : "text-text-dim"
          }`}
        >
          {isUser ? "Operator" : "Gavin"}
        </div>
        {message.parts?.map((part, i) => {
          if (part.type === "text") {
            return (
              <p
                key={i}
                className="whitespace-pre-wrap text-[11px] leading-relaxed text-text-primary"
              >
                {part.text}
              </p>
            );
          }

          if (part.type === "step-start") {
            return null;
          }

          if (isToolPart(part)) {
            const state = part.state;
            const label = formatToolName(part.type);
            return (
              <div
                key={i}
                className="mt-1 text-[9px] tracking-[0.1em] text-text-dim border-t border-[rgba(122,155,168,0.08)] pt-1"
              >
                [{label}]
                {state === "input-streaming" && " ▸ receiving..."}
                {state === "input-available" && " ▸ executing..."}
                {state === "output-available" && " ✓"}
                {state === "output-error" && " ✗ error"}
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}

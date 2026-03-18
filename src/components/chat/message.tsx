"use client";

import type { ReactNode } from "react";
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

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);

  return tokens.map((token, index) => {
    if (token.startsWith("**") && token.endsWith("**")) {
      return (
        <strong key={`${keyPrefix}-${index}`} className="font-medium text-text-bright">
          {token.slice(2, -2)}
        </strong>
      );
    }

    if (token.startsWith("`") && token.endsWith("`")) {
      return (
        <code
          key={`${keyPrefix}-${index}`}
          className="rounded-sm border border-[rgba(122,155,168,0.12)] bg-[rgba(122,155,168,0.05)] px-1 py-0.5 text-[10px] text-text-bright"
        >
          {token.slice(1, -1)}
        </code>
      );
    }

    return token;
  });
}

function renderTextBlock(block: string, key: string) {
  const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const unorderedItems = lines
    .map((line) => line.match(/^[-*]\s+(.+)$/)?.[1] ?? null);
  if (unorderedItems.every(Boolean)) {
    return (
      <ul key={key} className="space-y-1.5 pl-5 text-[11px] leading-relaxed text-text-primary list-disc">
        {unorderedItems.map((item, index) => (
          <li key={`${key}-${index}`}>{renderInline(item ?? "", `${key}-${index}`)}</li>
        ))}
      </ul>
    );
  }

  const orderedItems = lines
    .map((line) => line.match(/^\d+\.\s+(.+)$/)?.[1] ?? null);
  if (orderedItems.every(Boolean)) {
    return (
      <ol key={key} className="space-y-1.5 pl-5 text-[11px] leading-relaxed text-text-primary list-decimal">
        {orderedItems.map((item, index) => (
          <li key={`${key}-${index}`}>{renderInline(item ?? "", `${key}-${index}`)}</li>
        ))}
      </ol>
    );
  }

  if (lines.length === 1 && /^#{1,6}\s+/.test(lines[0])) {
    const content = lines[0].replace(/^#{1,6}\s+/, "");
    return (
      <div
        key={key}
        className="text-[10px] uppercase tracking-[0.15em] text-text-bright"
      >
        {renderInline(content, key)}
      </div>
    );
  }

  return (
    <p key={key} className="text-[11px] leading-relaxed text-text-primary">
      {renderInline(lines.join(" "), key)}
    </p>
  );
}

function renderTextPart(text: string) {
  const blocks = text
    .trim()
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) return null;

  return <div className="space-y-3">{blocks.map((block, index) => renderTextBlock(block, `block-${index}`))}</div>;
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === "user";

  return (
    <div className="flex flex-col gap-1.5 max-w-[90%]">
      <div className="flex items-center gap-2">
        <span className={`text-[8px] uppercase tracking-[0.2em] font-medium ${
          isUser ? "text-accent-primary" : "text-text-bright"
        }`}>
          {isUser ? "[OPERATOR]" : "[GAVIN]"}
        </span>
        <span className="h-[0.5px] flex-1 bg-[rgba(122,155,168,0.1)]" />
      </div>
      
      <div className="pl-4 space-y-3">
        {message.parts?.map((part, i) => {
          if (part.type === "text") {
            if (isUser) {
              return (
                <p
                  key={i}
                  className="whitespace-pre-wrap text-[11px] leading-relaxed text-text-primary"
                >
                  {part.text}
                </p>
              );
            }

            return <div key={i}>{renderTextPart(part.text)}</div>;
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
                className="flex items-center gap-3 text-[8px] tracking-[0.15em] text-text-dim/60"
              >
                <span className="text-accent-primary opacity-40">▸</span>
                <span>EXEC_SEQUENCE::{label}</span>
                <span className={`px-1.5 py-0.5 border-[0.5px] ${
                  state === "output-available" ? "border-status-success text-status-success" :
                  state === "output-error" ? "border-status-error text-status-error" : "border-border-subtle"
                }`}>
                  {state === "input-streaming" && "STREAMING"}
                  {state === "input-available" && "QUEUED"}
                  {state === "output-available" && "COMPLETE"}
                  {state === "output-error" && "FAILED"}
                </span>
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}

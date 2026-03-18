"use client";

import { type FormEvent } from "react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export function ChatInput({ value, onChange, onSubmit, isLoading }: ChatInputProps) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) {
        onSubmit();
      }
    }
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <div className="shrink-0 bg-transparent">
      <form onSubmit={handleFormSubmit} className="flex flex-col gap-4 w-full">
        <div className="flex flex-col gap-2">
          <label className="text-[8px] uppercase tracking-[0.2em] text-text-dim">Operational_Input</label>
          <div className="flex gap-4 items-end">
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Initialize operational directive..."
              rows={1}
              className="flex-1 bg-transparent border-b-[0.5px] border-[rgba(122,155,168,0.2)] pb-2 text-[12px] text-text-primary placeholder:text-text-dim/40 resize-none outline-none focus:border-accent-primary transition-colors min-h-[32px] max-h-[160px] rounded-none"
              style={{ lineHeight: "1.5" }}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!value.trim() || isLoading}
              className="px-6 py-2 text-[10px] uppercase tracking-[0.2em] text-accent-primary hover:text-text-bright transition-all disabled:opacity-20 disabled:cursor-not-allowed whitespace-nowrap bg-transparent"
            >
              {isLoading ? "EXEC..." : "[SEND_LINK]"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

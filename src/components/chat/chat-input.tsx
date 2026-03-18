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
    <div className="shrink-0 border-t border-[rgba(122,155,168,0.1)] px-4 py-4 bg-[rgba(10,12,14,0.4)]">
      <form onSubmit={handleFormSubmit} className="flex gap-3 items-end w-full">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter command..."
          rows={1}
          className="flex-1 bg-transparent border border-[rgba(122,155,168,0.2)] px-4 py-3 text-[12px] text-text-primary placeholder:text-text-dim resize-none outline-none focus:border-accent-primary transition-colors min-h-[44px] max-h-[160px] rounded-none"
          style={{ lineHeight: "1.5" }}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!value.trim() || isLoading}
          className="border border-[rgba(122,155,168,0.2)] px-6 py-3 text-[9px] uppercase tracking-[0.18em] text-text-primary hover:border-accent-primary hover:text-text-bright transition-all disabled:opacity-20 disabled:cursor-not-allowed whitespace-nowrap bg-[rgba(122,155,168,0.02)] hover:bg-[rgba(122,155,168,0.06)]"
        >
          {isLoading ? "Processing..." : "Send"}
        </button>
      </form>
    </div>
  );
}

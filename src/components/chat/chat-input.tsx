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
    <div className="border-t border-[rgba(122,155,168,0.1)] p-3">
      <form onSubmit={handleFormSubmit} className="flex gap-2 items-end">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter command..."
          rows={1}
          className="flex-1 bg-transparent border border-[rgba(122,155,168,0.2)] px-3 py-2 text-[11px] text-text-primary placeholder:text-text-dim resize-none outline-none focus:border-accent-primary transition-colors min-h-[32px] max-h-[120px]"
          style={{ lineHeight: "1.4" }}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!value.trim() || isLoading}
          className="border border-[rgba(122,155,168,0.2)] px-4 py-2 text-[8px] uppercase tracking-[0.15em] text-text-primary hover:border-accent-primary hover:text-text-bright transition-colors disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isLoading ? "Processing..." : "Send"}
        </button>
      </form>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Message } from "./message";
import { ChatInput } from "./chat-input";
import { onTasksChanged } from "@/components/tasks/task-panel";
import { onProjectsChanged } from "@/components/projects/project-panel";

export function ChatPanel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onFinish: () => {
      onTasksChanged();
      onProjectsChanged();
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  const handleSubmit = useCallback(() => {
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input.trim() });
    setInput("");
  }, [input, isLoading, sendMessage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="border-b border-[rgba(122,155,168,0.1)] px-4 py-3 shrink-0">
        <div className="text-[8px] uppercase tracking-[0.15em] text-text-dim">
          {"// Chat Terminal"}
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-text-dim text-[11px] text-center py-12">
            <div className="text-[8px] uppercase tracking-[0.15em] mb-2">
              Gavin Terminal v0.1
            </div>
            <p>
              Ready. Describe your tasks in natural language.
            </p>
            <p className="mt-1">
              Try: &quot;I need to finish the report by Friday&quot;
            </p>
          </div>
        )}
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="text-[9px] text-text-dim animate-pulse">
              ▸ Processing...
            </div>
          </div>
        )}
      </div>

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}

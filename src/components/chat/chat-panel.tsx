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
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-transparent">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-[8px] uppercase tracking-[0.3em] text-text-dim mb-4 opacity-40">
              GAVIN_SYSTEM_READY_V0.1
            </div>
            <div className="max-w-xs space-y-2">
              <p className="text-[11px] text-text-dim leading-relaxed">
                Awaiting natural language directives. Initialize sequence by describing operational requirements.
              </p>
              <p className="text-[9px] text-accent-primary opacity-40 uppercase tracking-[0.1em]">
                Example: &quot;Schedule system audit for Friday 14:00&quot;
              </p>
            </div>
          </div>
        )}
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 text-[8px] uppercase tracking-[0.2em] text-accent-primary animate-pulse">
              <span>▸</span>
              <span>Processing_Data_Stream</span>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 pb-6">
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

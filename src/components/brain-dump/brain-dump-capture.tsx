"use client";

import { useEffect, useRef, useState } from "react";
import { notifyBrainDumpChanged } from "@/components/brain-dump/events";

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return (
    target.isContentEditable ||
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select"
  );
}

export function BrainDumpCapture() {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    textareaRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || event.repeat) return;

      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        setIsOpen(false);
        setValue("");
        return;
      }

      const isAltQ =
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === "q";

      if (!isAltQ) return;

      event.preventDefault();

      if (!isOpen) {
        setIsOpen(true);
        return;
      }

      if (!isEditableTarget(event.target)) {
        textareaRef.current?.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const closeModal = () => {
    setIsOpen(false);
    setValue("");
    setIsSubmitting(false);
  };

  const submitEntry = async () => {
    const content = value.trim();
    if (!content || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/brain-dump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) return;

      notifyBrainDumpChanged();
      closeModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(4,6,8,0.8)] px-4 py-6 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close brain dump capture"
        onClick={closeModal}
        className="absolute inset-0"
      />

      <div className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden border-[0.5px] border-border-subtle bg-bg-panel">
        <div className="flex items-start justify-between gap-4 border-b-[0.5px] border-border-subtle px-4 py-3">
          <div>
            <div className="text-[8px] uppercase tracking-[0.15em] text-text-dim">
              {"// Quick Capture"}
            </div>
            <h2 className="mt-1 text-[18px] font-light text-text-bright">Brain Dump</h2>
          </div>
          <div className="text-right text-[8px] uppercase tracking-[0.15em] text-text-dim">
            <div>ALT + Q</div>
            <div className="mt-1">ENTER TO STORE</div>
          </div>
        </div>

        <div className="space-y-4 px-4 py-4">
          <textarea
            ref={textareaRef}
            rows={6}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submitEntry();
              }
            }}
            placeholder="Drop the thought here before it disappears..."
            className="w-full resize-none border-[0.5px] border-border-subtle bg-[rgba(122,155,168,0.02)] px-[12px] py-[10px] text-[12px] leading-relaxed text-text-primary outline-none placeholder:text-text-dim focus:border-accent-primary"
          />

          <div className="flex flex-col-reverse gap-3 border-t-[0.5px] border-[rgba(122,155,168,0.1)] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[8px] uppercase tracking-[0.12em] text-text-dim">
              Shift + Enter for newline. Escape to close.
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="border-[0.5px] border-border-subtle bg-transparent px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-text-primary transition hover:border-accent-primary hover:text-accent-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitEntry()}
                disabled={isSubmitting || !value.trim()}
                className="border-[0.5px] border-accent-primary bg-transparent px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-accent-primary transition hover:bg-accent-primary hover:text-bg-primary disabled:opacity-30"
              >
                {isSubmitting ? "Storing..." : "Store Thought"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

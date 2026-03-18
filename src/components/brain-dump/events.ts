export const BRAIN_DUMP_CHANGED_EVENT = "brain-dump:changed";

export function notifyBrainDumpChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(BRAIN_DUMP_CHANGED_EVENT));
}

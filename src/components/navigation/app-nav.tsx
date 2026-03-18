"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Terminal" },
  { href: "/tasks", label: "Tasks" },
  { href: "/projects", label: "Projects" },
  { href: "/brain-dump", label: "Brain Dump" },
  { href: "/timeline", label: "Timeline" },
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-[rgba(122,155,168,0.1)] bg-[rgba(10,12,14,0.92)] backdrop-blur px-4 py-2 shrink-0">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
          <span className="text-[11px] font-light text-text-bright tracking-[0.1em]">
            GAVIN
          </span>
          <span className="hidden sm:inline text-[8px] uppercase tracking-[0.15em] text-text-dim">
            {"// Productivity Terminal"}
          </span>
        </div>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`border px-3 py-1 text-[8px] uppercase tracking-[0.16em] transition-colors ${
                  active
                    ? "border-accent-primary bg-[rgba(122,155,168,0.1)] text-text-bright"
                    : "border-[rgba(122,155,168,0.12)] text-text-dim hover:border-accent-primary hover:text-text-bright hover:bg-[rgba(122,155,168,0.04)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="text-[8px] uppercase tracking-[0.15em] text-text-dim">
          v0.1.0
        </div>
      </div>
    </header>
  );
}

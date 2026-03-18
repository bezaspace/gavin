# Productivity App — Build Plan

**Date**: 2026-03-18  
**POC**: AdaL  
**TL;DR**: Build an AI chat agent that extracts and manages tasks from natural conversation, using Vercel AI SDK 6 with an OpenAI-compatible provider, styled in the existing Tactical HUD design system, with a shared app shell and a dedicated timeline view.

---

## Phase 1: AI Chat Agent with Task Extraction

### Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  Browser (React Client)                         │
│  ┌───────────────┐  ┌───────────────────────┐   │
│  │  Chat Panel   │  │  Tasks Page           │   │
│  │  (useChat)    │  │  (full-page queue)    │   │
│  └───────┬───────┘  └───────────────────────┘   │
│          │                                       │
│          ├──────────── Shared Nav ─────────────┐ │
│          │                                      │ │
│          └──────────── Timeline Page ───────────┘ │
└──────────┼───────────────────────────────────────┘
           │ Route Handler
┌──────────┼───────────────────────────────────────┐
│  Next.js Server                                   │
│  ┌───────┴───────────────────────────────┐       │
│  │  ToolLoopAgent                        │       │
│  │  ├── Model: OpenAI-compatible (TBD)   │       │
│  │  ├── System prompt: task-aware chat   │       │
│  │  └── Tools:                           │       │
│  │      ├── createTask                   │       │
│  │      ├── updateTask                   │       │
│  │      ├── deleteTask                   │       │
│  │      └── listTasks                    │       │
│  └───────────────────────────────────────┘       │
│                                                  │
│  ┌───────────────────────────────────────┐       │
│  │  Task Storage (SQLite database)       │       │
│  └───────────────────────────────────────┘       │
│  ┌───────────────────────────────────────┐       │
│  │  Shared Navigation Shell             │       │
│  └───────────────────────────────────────┘       │
└──────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **AI SDK 6 `ToolLoopAgent`** — Defines the agent once with model, instructions, and tools. Handles the multi-step tool execution loop automatically (model calls tool → result fed back → model responds). This is cleaner than inline `streamText` + tools.

2. **Tool-based task management** — Instead of asking the LLM to output structured JSON and parsing it ourselves, we give the agent actual tools (`createTask`, `updateTask`, `deleteTask`, `listTasks`). The agent decides *when* to call them based on conversation context. This is more reliable and natural.

3. **OpenAI-compatible provider** — Using `@ai-sdk/openai-compatible` with `createOpenAICompatible()`. User provides `baseURL`, `apiKey`, and `model` later. Config lives in `.env.local`.

4. **Route handler + `useChat`** — The chat UI streams through a Next.js route handler backed by `useChat`, which keeps the client simple and the transport explicit.

5. **Tactical HUD styling** — All UI follows the existing design spec: `#0a0c0e` bg, `#7a9ba8` accent, JetBrains Mono, `0.5px` borders, uppercase labels.

6. **SQLite task storage** — Tasks are persisted in a local SQLite database via `better-sqlite3`. This keeps the app lightweight while giving us durable storage and straightforward SQL access.

7. **Shared navigation shell** — One top nav routes between the terminal and timeline views so the app feels like a single product rather than separate screens.

8. **Dedicated task route** — The task queue now lives on its own `/tasks` page so the chat view can use the full available height.

---

### File Structure (New/Modified Files)

```
src/
├── app/
│   ├── layout.tsx              # MODIFY: app shell with shared nav
│   ├── page.tsx                # MAIN: chat-only home
│   ├── tasks/page.tsx          # NEW: full-page task queue
│   ├── timeline/page.tsx       # NEW: vertical timeline route
│   └── globals.css             # MODIFY: add HUD design tokens
│
├── lib/
│   ├── ai/
│   │   ├── provider.ts         # NEW: OpenAI-compatible provider setup
│   │   └── task-agent.ts       # NEW: ToolLoopAgent with task tools
│   │
│   └── tasks/
│       ├── store.ts            # NEW: SQLite-backed task store (CRUD ops)
│       └── types.ts            # NEW: Task type definitions
│
└── components/
    ├── navigation/
    │   └── app-nav.tsx         # NEW: shared top navigation
    │
    ├── chat/
    │   ├── chat-panel.tsx      # NEW: Chat message list + input
    │   ├── message.tsx         # NEW: Single message bubble (HUD style)
    │   └── chat-input.tsx      # NEW: Input field with send button
    │
    └── tasks/
        ├── task-panel.tsx      # NEW: Task list view
        ├── task-card.tsx       # NEW: Individual task card (HUD style)
        └── timeline-view.tsx   # NEW: Vertical timeline schedule view

scripts/
└── seed-tasks.mjs              # NEW: Seed/reset SQLite with fixture tasks
```

---

### Dependencies to Install

```bash
bun add ai @ai-sdk/openai-compatible zod
```

For the SQLite-backed store, we also need:

```bash
bun add better-sqlite3
bun add -d @types/better-sqlite3
```

That's it. No extra UI libraries — we build to the HUD spec with Tailwind.

---

### Implementation Steps

#### Step 1: Foundation
- Install dependencies (`ai`, `@ai-sdk/openai-compatible`, `zod`)
- Set up `.env.local` with placeholder values (user fills in later)
- Add CSS design tokens to `globals.css`
- Add JetBrains Mono font to `layout.tsx`
- Add a shared navigation shell in the root layout

#### Step 2: Task Domain Layer
- Define `Task` type (`id`, `serialNumber`, `title`, `description`, `notes`, `startTime`, `endTime`, `status`, `priority`, `createdAt`)
- Build a SQLite-backed store with CRUD operations (`addTask`, `updateTask`, `deleteTask`, `getTasks`, `getTask`)
- Create the tasks table and indexes on startup
- Ensure the database file is created locally and survives server restarts
- Support schema migration for existing task rows

#### Step 3: AI Agent
- Set up OpenAI-compatible provider (`provider.ts`)
- Define tool schemas with Zod (`createTask`, `updateTask`, `deleteTask`, `listTasks`)
- Wire tool `execute` functions to the task store
- Create `ToolLoopAgent` with system prompt that instructs it to be a helpful conversationalist who proactively creates/updates tasks when the user discusses things to do
- Require start/end time when creating tasks, and carry notes through create/update flows

#### Step 4: Server Action
- Create a route handler that calls `streamText()` with messages from `useChat`
- Return the stream to the client

#### Step 5: Chat UI
- Build `ChatPanel` with `useChat` hook connected to the server action
- Style messages in HUD aesthetic (monospace, subtle borders, status indicators for tool calls)
- Show tool invocations as subtle inline indicators (e.g., `[TASK CREATED]`)

#### Step 6: Task Panel UI
- Build `TaskPanel` as a standalone full-page task queue at `/tasks`
- HUD-styled task cards with status indicators, priority markers, serial numbers, notes, and time ranges
- Tasks update in real-time when the agent creates/modifies them (re-fetch after tool calls)
- Add a seed script that repopulates the local database with fixture tasks for demos

#### Step 7: Layout Integration
- Compose `ChatPanel` as the full-height chat-only home page
- Add a shared nav in `layout.tsx` for Terminal, Tasks, and Timeline
- Add a dedicated vertical timeline page that renders tasks as time-based blocks
- Keep the chat composer pinned to the bottom to use the full viewport height

---

### System Prompt Strategy (for the agent)

```
You are a productivity assistant embedded in a tactical command interface.
You have a natural conversation with the user. When the user mentions
things they need to do, goals, deadlines, or action items — you
proactively create tasks using your tools. You can also update or
delete tasks when asked. Always confirm what you did in conversation.

Be concise. Match the technical tone of the interface. Use short sentences.
```

---

### What's NOT in This Phase (Future)

- User authentication
- Task categories/projects
- Due dates and reminders
- Multiple conversations/sessions
- Drag-and-drop task reordering
- Calendar/day switching for the timeline view

---

### Open Questions for You
1. **Model details** — What's the `baseURL`, `apiKey`, and `model ID` for your OpenAI-compatible provider? (Still needed if we want to finish provider wiring.)
2. **Timeline behavior** — Should the timeline stay day-only, or should we add date switching next?

# Productivity App — Build Plan

**Date**: 2026-03-18  
**POC**: AdaL  
**TL;DR**: Build an AI chat agent that extracts and manages tasks from natural conversation, using Vercel AI SDK 6 with an OpenAI-compatible provider, styled in the existing Tactical HUD design system.

---

## Phase 1: AI Chat Agent with Task Extraction

### Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  Browser (React Client)                         │
│  ┌───────────────┐  ┌───────────────────────┐   │
│  │  Chat Panel   │  │  Task Sidebar/Panel   │   │
│  │  (useChat)    │  │  (task list state)    │   │
│  └───────┬───────┘  └───────────────────────┘   │
│          │                                       │
└──────────┼───────────────────────────────────────┘
           │ Server Action
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
│  │  Task Storage (in-memory / future DB) │       │
│  └───────────────────────────────────────┘       │
└──────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **AI SDK 6 `ToolLoopAgent`** — Defines the agent once with model, instructions, and tools. Handles the multi-step tool execution loop automatically (model calls tool → result fed back → model responds). This is cleaner than inline `streamText` + tools.

2. **Tool-based task management** — Instead of asking the LLM to output structured JSON and parsing it ourselves, we give the agent actual tools (`createTask`, `updateTask`, `deleteTask`, `listTasks`). The agent decides *when* to call them based on conversation context. This is more reliable and natural.

3. **OpenAI-compatible provider** — Using `@ai-sdk/openai-compatible` with `createOpenAICompatible()`. User provides `baseURL`, `apiKey`, and `model` later. Config lives in `.env.local`.

4. **Server Action + `useChat`** — AI SDK 6 pattern: server action streams directly to the client hook. No `/api/chat` route needed. Clean, type-safe.

5. **Tactical HUD styling** — All UI follows the existing design spec: `#0a0c0e` bg, `#7a9ba8` accent, JetBrains Mono, `0.5px` borders, uppercase labels.

6. **In-memory task storage for now** — Tasks stored in a server-side Map/module. Easy to swap to a DB later without changing the tool implementations.

---

### File Structure (New/Modified Files)

```
src/
├── app/
│   ├── layout.tsx              # MODIFY: add JetBrains Mono font import
│   ├── page.tsx                # REWRITE: main app layout (chat + tasks)
│   └── globals.css             # MODIFY: add HUD design tokens
│
├── lib/
│   ├── ai/
│   │   ├── provider.ts         # NEW: OpenAI-compatible provider setup
│   │   └── task-agent.ts       # NEW: ToolLoopAgent with task tools
│   │
│   └── tasks/
│       ├── store.ts            # NEW: In-memory task store (CRUD ops)
│       └── types.ts            # NEW: Task type definitions
│
└── components/
    ├── chat/
    │   ├── chat-panel.tsx      # NEW: Chat message list + input
    │   ├── message.tsx         # NEW: Single message bubble (HUD style)
    │   └── chat-input.tsx      # NEW: Input field with send button
    │
    └── tasks/
        ├── task-panel.tsx      # NEW: Task list sidebar
        └── task-card.tsx       # NEW: Individual task card (HUD style)
```

---

### Dependencies to Install

```bash
bun add ai @ai-sdk/openai-compatible zod
```

That's it. No extra UI libraries — we build to the HUD spec with Tailwind.

---

### Implementation Steps

#### Step 1: Foundation
- Install dependencies (`ai`, `@ai-sdk/openai-compatible`, `zod`)
- Set up `.env.local` with placeholder values (user fills in later)
- Add CSS design tokens to `globals.css`
- Add JetBrains Mono font to `layout.tsx`

#### Step 2: Task Domain Layer
- Define `Task` type (`id`, `title`, `description`, `status`, `priority`, `createdAt`)
- Build in-memory store with CRUD operations (`addTask`, `updateTask`, `deleteTask`, `getTasks`, `getTask`)

#### Step 3: AI Agent
- Set up OpenAI-compatible provider (`provider.ts`)
- Define tool schemas with Zod (`createTask`, `updateTask`, `deleteTask`, `listTasks`)
- Wire tool `execute` functions to the task store
- Create `ToolLoopAgent` with system prompt that instructs it to be a helpful conversationalist who proactively creates/updates tasks when the user discusses things to do

#### Step 4: Server Action
- Create a server action that calls `taskAgent.stream()` with messages from `useChat`
- Return the stream to the client

#### Step 5: Chat UI
- Build `ChatPanel` with `useChat` hook connected to the server action
- Style messages in HUD aesthetic (monospace, subtle borders, status indicators for tool calls)
- Show tool invocations as subtle inline indicators (e.g., `[TASK CREATED]`)

#### Step 6: Task Panel UI
- Build `TaskPanel` sidebar showing all tasks
- HUD-styled task cards with status indicators, priority markers
- Tasks update in real-time when the agent creates/modifies them (re-fetch after tool calls)

#### Step 7: Layout Integration
- Compose `ChatPanel` + `TaskPanel` in `page.tsx`
- Responsive: side-by-side on desktop, stacked on mobile
- Header with app title in HUD style

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

- Persistent database (Prisma/SQLite/PostgreSQL)
- User authentication
- Task categories/projects
- Due dates and reminders
- Multiple conversations/sessions
- Drag-and-drop task reordering

---

### Open Questions for You

1. **Model details** — What's the `baseURL`, `apiKey`, and `model ID` for your OpenAI-compatible provider? (I'll set up placeholders for now)
2. **Task panel placement** — Sidebar on the right, or a toggleable overlay? I'm leaning toward a right sidebar that's always visible on desktop.
3. **Anything else** for Phase 1 before I start?

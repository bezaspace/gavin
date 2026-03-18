# GAVIN — Project Brief

**Updated**: 2026-03-18  
**Purpose**: Quick orientation for a new engineer joining the project.

## What This App Is

GAVIN is a tactical-HUD productivity app built in Next.js. It combines:

- a chat terminal that creates and updates tasks through AI tools
- a dedicated task workspace with queue + detail editing
- a projects workspace where projects and their linked tasks are managed
- a timeline view for time-based task scanning

## Core Product Behavior

- Chat on `/` uses the AI SDK to create, update, delete, and list tasks.
- Tasks can optionally belong to a project.
- Tasks can be assigned in two ways:
  - by mentioning the project in chat using title or `#serial`
  - by creating a task directly inside a project modal
- `/tasks` shows the task queue on the left and the selected task detail on the right.
- On `/tasks`, only task notes are editable; all other task fields are read-only.
- `/projects` shows projects as cards; clicking a card opens a modal.
- In a project modal, project title/description are read-only after creation; only project notes are editable.
- Each project modal also shows tasks linked to that project.
- Deleting a project does not delete its tasks; linked tasks become unassigned.

## Routes

- `/` — chat terminal
- `/tasks` — task queue + right-side task detail panel
- `/projects` — project card grid + modals
- `/timeline` — timeline view
- `/api/chat` — AI chat route
- `/api/tasks` — task CRUD
- `/api/projects` — project CRUD

## Design Rules

Follow `DESIGN_SPECIFICATION.md`.

Important practical rules:

- sharp corners
- `0.5px` borders
- JetBrains Mono throughout
- dark tactical HUD palette
- compact uppercase labels
- no decorative/glassy UI unless explicitly added later

## Data Model Snapshot

### Project
- `id`
- `serialNumber`
- `title`
- `description`
- `notes`
- `createdAt`
- `updatedAt`

### Task
- `id`
- `serialNumber`
- `title`
- `description`
- `notes`
- `projectId | null`
- `projectTitle | null`
- `projectSerialNumber | null`
- `startTime`
- `endTime`
- `status`
- `priority`
- `createdAt`

SQLite is local and managed through `better-sqlite3`.

## Key Files

- `src/lib/db/index.ts` — schema + lightweight migrations
- `src/lib/tasks/store.ts` — task persistence and project joins
- `src/lib/projects/store.ts` — project persistence
- `src/lib/ai/task-agent.ts` — AI tools + system prompt
- `src/components/chat/chat-panel.tsx` — chat UI and refresh wiring
- `src/components/tasks/task-panel.tsx` — task queue and task detail editing
- `src/components/tasks/task-card.tsx` — queue card UI
- `src/components/projects/project-panel.tsx` — project grid, project modal, create-task flow
- `scripts/seed-tasks.mjs` — resets and seeds demo data

## Current Demo State

Run:

```bash
npm run seed:tasks
```

This currently seeds:

- 5 projects
- 25 tasks
- 5 tasks linked to each project

## Important Implementation Conventions

- Keep task/project refreshes event-driven via `onTasksChanged()` and `onProjectsChanged()`.
- Preserve read-only metadata patterns for detail views; only notes are editable in current task/project detail UIs.
- Keep API validation conservative and migration-safe for old local databases.
- Prefer extending existing HUD components/patterns over introducing new UI systems.

## Likely Next Work

- filtering tasks by project
- moving an existing task between projects from the UI
- surfacing project task counts directly on project cards
- expanding timeline behavior
- tightening provider/env onboarding if AI setup needs to be easier

## Environment Note

The app uses an OpenAI-compatible provider via the AI SDK. Required runtime config lives in `.env.local`.

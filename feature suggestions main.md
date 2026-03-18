# GAVIN — Feature Suggestions

**Date**: 2026-03-18  
**Status**: Unified feature backlog — not yet prioritized or planned

---

## Overview

GAVIN is an AI-powered productivity terminal with a tactical HUD design system. It uses a chat agent that extracts and manages tasks from natural conversation via AI tool calls, with a task sidebar and vertical timeline view.

The current implementation includes:
- A chat interface where users converse with an AI agent to create, update, delete, and list tasks
- A task panel sidebar showing all tasks with status counts (pending, active, done)
- A vertical timeline view displaying tasks scheduled throughout the day with time-based positioning
- SQLite database for local-first data persistence
- Task schema with: id, serialNumber, title, description, notes, startTime, endTime, status, priority, createdAt
- Dark tactical HUD aesthetic with monospace fonts and specific color palette (#0a0c0e background, #7a9ba8 accent)

This document captures feature ideas for future development, merged from multiple suggestions and checked for redundancy.

---

## Context & Time Features

These features address the biggest gaps in the current implementation — the app has no memory and no sense of time flow.

### 3. Due Dates & Overdue Indicators

Tasks have `startTime` and `endTime` but no concept of "due date." Add a `dueDate` field to the task schema and surface overdue indicators in both the task panel and timeline. The current task type in `/src/lib/tasks/types.ts` does not include a dueDate field. Visual indicators (red status, pulsing dot) should appear for overdue tasks. The AI agent should support setting due dates via chat ("remind me at 3pm") with system prompt updates to instruct the agent to ask for or suggest due dates.

### 4. Date-Aware Timeline

The timeline currently shows tasks for a single day with no date switching capability. Users cannot view past or future days. This requires adding a date picker or prev/next day navigation to the timeline page header, filtering tasks by `startTime` date, and showing the selected date (e.g., `MON 18 MAR 2026`). A "Today" button should allow quick return to the current day.

### 5. Reminders System

Complementing due dates, implement a reminder system with browser notifications or in-app toast alerts when a task is due. This requires the dueDate field implementation plus notification handling.

### 6. Daily Briefing

When you open GAVIN, the AI should summarize: overdue tasks, today's schedule, and pending items by priority. This makes the HUD feel alive and transforms the app from a static tool to an active ops center. Implementation would involve a new `/api/briefing` endpoint that queries the database and generates a summary to display on load.

### 13. Conversation Context Memory

Currently, each chat starts cold — the AI doesn't remember previous conversations. Store conversation summaries in SQLite and inject them into the system prompt. This doesn't need to be complex; even a rolling 5-message summary helps maintain context across sessions. Requires new `conversations` and `messages` tables in the database.

---

## Structure & Organization Features

These features help scale the app beyond a simple list of tasks.

### 7. Task Filtering & Sorting

Add filter and sort controls to the task panel sidebar. Filters should include: status (pending / in_progress / completed), priority (low / medium / high), and potentially project or category. Sort options should include: by time range, by priority, by creation date, by serial number. UI: small dropdown or toggle buttons in the task panel header, above the task list. Active filters should be visually indicated with highlighted chips or buttons. Filters should apply to both the sidebar task list and the timeline view.

### 8. Search

Global search across all tasks (title, description, notes). A search bar in the task panel header or as a global command (e.g., `Ctrl+K`) with real-time filtering as the user types. Highlight matching text in results with an option to clear/reset search quickly. Fits naturally with the terminal aesthetic.

### 9. Task Editing via UI

Task cards are currently display-only. Add the ability to manually edit tasks without using the chat. Click a task card to open an edit modal or inline expansion. Editable fields include: title, description, notes, start time, end time, status, priority. Uses the existing PATCH `/api/tasks` endpoint. After saving, the task list and timeline should refresh. Optionally add a delete button in the edit view. Style: keep the modal/edit form in the HUD aesthetic — dark panel, 0.5px borders, monospace inputs.

### 10. Projects / Contexts

Tasks need grouping beyond simple lists: "Work", "Personal", "Side project". New `projects` table in the database with tasks getting a `projectId` foreign key. Filter by project in task panel. The AI agent should support creating and assigning projects via chat.

### 11. Tags

A lightweight alternative or complement to projects for cross-cutting concerns like "waiting-on" or "quick-win". Many-to-many `task_tags` table. Visual indicator with colored tag badges on task cards following existing badge/tag design. Database migration: add `tags` JSON column or separate tags table. AI agent should support assigning tags via chat.

### 12. Bulk Operations

"Mark all completed", "Move to project X", "Delete selected". Checkbox selection in task panel with batch actions toolbar.

---

## Proactive AI Features

These features leverage the AI agent to make GAVIN stand out from other task apps.

### 14. Smart Suggestions

After creating a task, the AI should suggest: "Want me to block time for this?", "Should I break this into subtasks?", "This seems related to Task #87." Implemented as a post-tool-call hook where the agent generates suggestions as follow-up messages. This is a key differentiator that makes GAVIN feel like an intelligent assistant rather than a passive tool.

### 15. Natural Language Queries

Allow users to ask: "What did I work on last week?" or "Show me all high-priority tasks for Project X." New `queryTasks` tool that translates natural language questions into SQL-like queries against the database. Extends beyond simple listTasks to provide intelligent filtering and aggregation.

### 16. Stale Task Detection

AI flags tasks that haven't been updated in X days. "Task #92 hasn't been touched in 5 days — still relevant?" Cron-like check on app load or periodic background job. Could surface in the daily briefing.

### 17. Daily Standup Mode

"What did you accomplish yesterday? What's the plan today?" The AI captures answers and updates task statuses accordingly. Could be a dedicated "standup" command or automatic daily trigger. Integrates naturally with the conversation-first interface.

---

## UI/UX Polish Features

### 1. Error Handling & Loading States

SQLite errors, AI failures, network issues — all likely unhandled currently. Add toast notifications for errors, retry logic for failed operations, and graceful degradation. Loading states for async operations throughout the app.

### 19. Keyboard Shortcuts

Terminal-like keyboard shortcuts for power users. `Ctrl+K` or `/` to focus chat input, `Ctrl+N` to create new task or new conversation, `j`/`k` to navigate up/down through task list, `Enter` to open selected task for editing, `Escape` to close modals and clear selection, `?` or `Ctrl+/` to show keyboard shortcuts help overlay. Visual shortcut hints in the UI (small dim text in corners). A HUD without keyboard navigation feels wrong — this is essential for the terminal aesthetic.

### 20. Mobile Responsive

The current split-pane layout (chat on left, task panel on right) will break on mobile. Collapse task panel behind a drawer on small screens. Ensure timeline view is usable on mobile or provide a simplified mobile alternative.

### 21. Dark/Light Mode Toggle (Stretch)

While the design spec is intentionally dark, a high-contrast light variant could broaden accessibility. New color tokens for light mode (inverted palette, warm whites). Toggle in the nav bar or settings with preference persisted in localStorage. Note: This is a larger design effort and may want to be deferred.

---

## Advanced Features

### 18. Conversation History with Persistence

Multiple chat sessions with persistence. Store conversations in the SQLite database with a sidebar or dropdown to switch between conversations. Start new conversation button. AI agent context should be scoped to the current conversation. Optionally: name conversations automatically based on content, or let the user rename them. Archive or delete old conversations.

### 22. Task Analytics Dashboard

Dashboard with productivity metrics and visualizations. Features include: completion rate over time (daily/weekly), time breakdown: hours spent vs. planned per category, streak tracker: consecutive days with completed tasks, priority distribution chart, most active hours heatmap. The HUD design system is well-suited for dense data displays — use sparklines, metric blocks, and status indicators. New page: `/analytics` in the nav.

### 23. Export (CSV / JSON)

Export tasks for reporting or backup. Export all tasks or filtered tasks in formats: CSV, JSON. Button in task panel header or settings menu. Optional: scheduled auto-export to a file. Could also support import from CSV for bulk task creation.

### Drag-and-Drop Task Reordering

Let users visually reorder tasks in the sidebar. Drag to reorder tasks (changes `serial_number` ordering). Persist new order via PATCH to the API. Smooth animations within the HUD style (subtle translate, no bounce). Optional: drag from sidebar to timeline to reschedule.

---

## Engineering & Documentation

### 2. Test Suite

Zero tests currently exist. Any refactor is risky. Start with: task store unit tests, API route integration tests, AI agent tool call tests. This is foundational infrastructure that enables all future development with confidence.

### 24. Real README

Currently the default Next.js template. Add proper setup instructions, screenshots, architecture overview, and environment configuration documentation. Essential for any open source project or team onboarding.

---

## Features to Avoid (For Now)

- **Authentication / multi-user**: The app is local SQLite. Adding auth adds complexity without value until there's a reason to share/sync.

- **Drag-and-drop**: While useful, low ROI compared to other features. Manual reordering via chat ("move task 5 after task 8") fits the HUD vibe better.

- **Calendar integrations** (Google Calendar, etc.): Premature. Get the internal timeline solid first.

- **Real-time sync / websockets**: Over-engineering for a local-first single-user app.

---

## Summary

The features above represent the evolution of GAVIN from a Phase 1 AI task extractor into an "Intelligent Ops Dashboard" — leaning into the HUD metaphor and proactive AI agent rather than becoming a conventional project manager. The focus areas are:

1. **Context & Time**: Daily briefing, date-aware timeline, conversation memory, due dates
2. **Structure & Organization**: Projects, tags, filtering, search, bulk operations
3. **Proactive AI**: Smart suggestions, natural language queries, stale task detection, standup mode
4. **Polish & Ship-Readiness**: Tests, error handling, keyboard shortcuts, mobile responsive
5. **Advanced**: Analytics, export, conversation history

All features should maintain the existing tactical HUD design language — dark theme, monospace fonts, 0.5px borders, and the distinctive #7a9ba8 accent color.

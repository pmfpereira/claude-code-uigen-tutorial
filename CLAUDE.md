# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Initial setup (installs deps, generates Prisma client, runs migrations)
npm run setup

# Development server (Turbopack)
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run a single test file
npx vitest run src/__tests__/path/to/test.ts

# Lint
npm run lint

# Reset database (destructive)
npm run db:reset
```

The dev server requires `node-compat.cjs` — this is handled by the npm scripts via `NODE_OPTIONS`.

## Environment

Copy `.env.example` to `.env`. `ANTHROPIC_API_KEY` is optional; the app falls back to a mock provider that generates demo components when it's absent.

## Architecture

**UIGen** is an AI-powered React component generator with live preview. Users chat with Claude to generate/edit React components, which are rendered in a sandboxed iframe.

### Request Flow

1. User sends a message in `ChatInterface` → `useChat()` (Vercel AI SDK) POSTs to `/api/chat`
2. `/api/chat/route.ts` streams back `streamText()` responses with tool calls
3. Tool calls (`str_replace_editor`, `file_manager`) update the **virtual file system** (in-memory, no disk writes)
4. File system changes trigger `PreviewFrame` re-render via context refresh
5. `jsx-transformer.ts` compiles JSX → runnable HTML via Babel Standalone + import maps
6. Auto-save: chat messages + serialized file system state persist to SQLite via Prisma

### Virtual File System

`src/lib/file-system.ts` — an in-memory tree structure. State is serialized to JSON and stored in the `Project.data` column. Components never read/write real files.

### AI Integration

- Model selection in `src/lib/provider.ts` — returns Anthropic Claude Haiku 4.5 if `ANTHROPIC_API_KEY` is set, otherwise a mock provider
- System prompt + tools defined in `src/app/api/chat/route.ts`
- Max 40 tool-use steps per request (4 for mock)
- Tool schemas live in `src/lib/tools/`

### State Management

Two React contexts:
- `src/lib/contexts/chat-context.tsx` — wraps `useChat()`, tracks anonymous work
- `src/lib/contexts/file-system-context.tsx` — exposes virtual FS + refresh triggers

### Authentication

JWT sessions via HTTP-only cookies (`src/lib/auth.ts`). Uses `JWT_SECRET` env var (falls back to `"development-secret-key"`). Server actions in `src/actions/index.ts` handle sign-up/sign-in/sign-out and project CRUD. Anonymous users can work freely; projects only persist for authenticated users.

### Database

Prisma + SQLite. Two models: `User` and `Project`. `Project.messages` and `Project.data` are JSON strings (chat history and virtual file system respectively).

### UI Layout

`src/app/main-content.tsx` — `ResizablePanelGroup` split into:
- Left (35%): Chat panel
- Right (65%): Tabs for Preview (iframe) and Code (file tree + Monaco editor)

Shadcn/ui components (new-york style, neutral base) in `src/components/ui/`.

### Path Alias

`@/*` maps to `./src/*`.

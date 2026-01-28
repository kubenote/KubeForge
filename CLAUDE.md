# KubeForge - Claude Code Configuration

## Project Overview

KubeForge is a visual-first toolkit for building, validating, and managing Kubernetes deployment configurations. It provides a drag-and-drop interface backed by live schema references for creating valid deployment YAMLs.

## Tech Stack

- **Framework:** Next.js 15 with React 19 (App Router)
- **Language:** TypeScript 5
- **Database:** SQLite with Prisma ORM
- **Styling:** Tailwind CSS 4 with shadcn/ui components
- **Flow Visualization:** @xyflow/react
- **State Management:** Zustand + React Context

## Project Structure

```
src/
├── app/              # Next.js app router (pages & API routes)
├── components/       # React components
│   ├── flow/         # Flow diagram components
│   ├── sidebar/      # Sidebar components
│   ├── projects/     # Project management
│   ├── dialog/       # Dialog components
│   └── ui/           # Reusable UI (shadcn)
├── providers/        # React context providers
├── contexts/         # Additional contexts
├── hooks/            # Custom React hooks
├── services/         # API service layer
├── lib/              # Utility libraries
└── types/            # TypeScript type definitions

prisma/               # Database schema & migrations
schema-cache/         # Kubernetes JSON schemas (git submodule)
```

## Key Commands

```bash
npm run dev          # Start development server (Turbopack)
npm run build        # Build for production
npm run lint         # Run ESLint
npm run db:setup     # Generate Prisma client & run migrations
npm run db:reset     # Reset database
npm run db:studio    # Open Prisma Studio
```

## Claude Code Settings

### Generated Documentation

All Claude-generated markdown documentation should be placed in:
```
docs/claude-generated/
```

### Commit Messages

Do not include Claude credit or co-author lines in commit messages. Use standard commit message format without attribution.

### Code Style

- Follow existing patterns in the codebase
- Use TypeScript strict mode
- Prefer editing existing files over creating new ones
- Use shadcn/ui components for UI elements
- Follow the established provider/hook patterns

## Known Issues to Address

When working on this codebase, be aware of these existing issues:

1. **No test coverage** - Tests should be added when modifying core logic
2. **Unsafe JSON.parse calls** - Wrap in try-catch when encountered
3. **Excessive `any` types** - Replace with proper types when touching affected code
4. **Console.log in production** - Remove or replace with proper logging

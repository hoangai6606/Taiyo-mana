# TAIYO NISSHIN Production Management System

## Overview
A production and quality inspection management system for TAIYO NISSHIN (Vietnam). Built with React + TypeScript + Vite + Tailwind CSS. The app is fully frontend — all data is served from mock data in `src/lib/mock-data.ts`.

## Architecture
- **Frontend only** — no backend server
- **React 18** with TypeScript
- **Vite** as the dev server (port 5000)
- **Tailwind CSS** for styling
- **Lucide React** for icons
- All data is mocked in `src/lib/mock-data.ts` (no live database connection)

## Key Directories
- `src/pages/` — top-level page components (Dashboard, Production, Inspection, Master, Import, Debit, AuditLog)
- `src/components/` — shared UI components and the Layout shell
- `src/lib/` — types (`database.types.ts`), API client (`api.ts`)
- `src/contexts/` — React context for auth (`AuthContext.tsx`), currently uses a mock profile
- `src/services/` — business-logic helpers (inspection calc, quantity summary, approval)
- `drizzle/` — Drizzle ORM schema definitions and seed data

## Running the App
```bash
npm run dev
```
Serves on `http://localhost:5000`.

## Workflow
- **Start application**: `npm run dev` → port 5000 (webview)

## Notes
- Authentication uses JWT tokens with Express backend.
- Database uses NeonDB (PostgreSQL) with Drizzle ORM.

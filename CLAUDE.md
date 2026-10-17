# Gas Station Portal

Desktop app for gas station operators (shifts, cash management, stock/dip readings). Built with Electron + React 19 + TypeScript, bundled by electron-vite. Solo-developer project.

Reference material (specs, sketches, sample PDFs/spreadsheets) lives one level up in `../`. Read it when a task touches business rules.

## Commands

- `npm run dev` — run the app with HMR
- `npm run typecheck` — node + web projects; must pass before finishing a task
- `npm run lint` / `npm run format` — ESLint / Prettier
- `npm run build` — typecheck + production build

Always run `typecheck` and `lint` after changes. Don't claim a UI change works unless it was run in `npm run dev`.

## Structure

- `src/main` — Electron main process (windows, filesystem, DB, IPC handlers). Node APIs allowed.
- `src/preload` — the only bridge between main and renderer. Expose a minimal, typed API via `contextBridge`; update `index.d.ts` with it.
- `src/renderer/src` — React UI. No Node/Electron imports here; talk to main only through the preload API.

Organize renderer code by feature, not by file type:

```
src/renderer/src/
  features/<feature>/   # components, hooks, api, types for one domain (shifts, stock, cash)
  components/           # shared, presentational UI only
  hooks/                # shared hooks
  lib/                  # pure utilities
```

Keep a feature's internals private; import from its `index.ts` only.

## Electron security (non-negotiable)

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` where possible.
- Never expose `ipcRenderer` or `require` wholesale. Expose one narrow function per operation.
- Validate and type every IPC payload in the main handler; never trust renderer input.
- No remote content in the app window; set a strict CSP in `index.html`.
- Secrets never go in the renderer or the repo.

## TypeScript

- `strict` stays on. No `any`; use `unknown` and narrow. No `@ts-ignore` (use `@ts-expect-error` with a reason).
- Prefer `type` for unions/props, `interface` for extensible object shapes.
- Model states with discriminated unions rather than boolean flags.
- Share IPC channel names and payload types from one place so main, preload and renderer can't drift.
- Use `import type` for type-only imports.

## React

- Function components and hooks only. React 19: no `forwardRef` (ref is a prop), use `use`, `useActionState`, `useOptimistic` where they fit.
- Keep components small and single-purpose; extract logic into custom hooks.
- Derive state instead of syncing it with `useEffect`. Effects are for synchronizing with external systems only, and need cleanup.
- Don't add `useMemo`/`useCallback` by default; add only for measured problems or stable-identity needs. (If React Compiler is adopted, remove existing manual memoization.)
- Lift state only as high as needed. Prefer local state, then context, then a store (e.g. Zustand) if it's truly shared.
- Server/async data: use a data-fetching layer (TanStack Query) rather than hand-rolled `useEffect` fetching, once IPC calls multiply.
- Stable `key`s from data ids, never array index for dynamic lists.
- Forms: controlled inputs with schema validation (Zod); validate the same schema again in main before persisting.
- Accessibility: semantic elements, labels on every input, keyboard-operable controls, visible focus.

## Styling

- Plain CSS with CSS variables (design tokens in `assets/base.css`) or CSS Modules. Don't introduce a styling library without asking.
- No inline styles except for dynamic values.

## Domain rules

- Money: store and compute in integer minor units (cents), never floats. Format only at the display edge with `Intl.NumberFormat`.
- Fuel volumes: keep units explicit in names (`litres`, `dipMm`); no bare numbers.
- Dates/times: store ISO 8601 UTC; convert to local at display. A shift's business date is not necessarily its calendar date.
- Records that affect cash or stock are append-only or audited; correct via adjustments, not silent edits.

## Code style

- Prettier and ESLint are the source of truth (`.prettierrc`, `eslint.config.mjs`); don't hand-format or debate style.
- Named exports; default export only where a tool requires it.
- File names: `PascalCase.tsx` for components, `camelCase.ts` for everything else.
- Comments explain _why_, not what. Delete dead code instead of commenting it out.
- Handle errors explicitly at boundaries (IPC, file I/O, parsing); surface user-friendly messages, log details.

## Testing

- Add Vitest + React Testing Library when logic grows; test behavior through the UI, not implementation details.
- Unit test all money, volume and date calculations — these are the highest-risk code.

## Git hooks and commits

Husky runs these automatically; never bypass with `--no-verify`. Fix the cause instead.

- `pre-commit` — `lint-staged` (ESLint `--fix` + Prettier on staged files), then `npm run typecheck`.
- `commit-msg` — commitlint enforces Conventional Commits.
- `pre-push` — `npm run typecheck` and `npm run lint`.

Commit format: `type(scope): subject`

- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- Scope optional, lowercase, names the feature (`shifts`, `stock`, `cash`, `main`, `preload`).
- Subject: imperative mood, lowercase start, no trailing period, header ≤ 72 chars.
- Body (optional, blank line after header): explain why, wrap at 100 chars.
- Breaking changes: `!` after type/scope and a `BREAKING CHANGE:` footer.
- One logical change per commit.

## Working agreements for Claude

- Match existing patterns before introducing new ones; ask before adding dependencies or restructuring.
- Make the smallest change that solves the task; no drive-by refactors.
- Don't touch `out/`, `build/` or `node_modules/`.
- Commit only when asked.

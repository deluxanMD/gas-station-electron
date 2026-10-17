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
- Forms: React Hook Form with `zodResolver` and a Zod schema per form. Infer the form type with `z.infer`. Keep schemas next to the feature and reuse the same schema in main to validate before persisting.
- Accessibility: semantic elements, labels on every input, keyboard-operable controls, visible focus.

## Styling

- Tailwind CSS v4 (via `@tailwindcss/vite`) plus shadcn/ui (Radix, `new-york` style, lucide icons). Theme tokens are CSS variables in `src/renderer/assets/main.css`; change the theme there, not per component.
- Style with Tailwind utilities and merge conditional classes with `cn()` from `@/lib/utils`. No arbitrary values when a token exists. No inline styles except for dynamic values.
- Theme: light and dark share one token set in `main.css` (`:root` and `.dark`). Dark mode is a `.dark` class on `<html>`, managed by `ThemeProvider` (`light | dark | system`, persisted in localStorage); read/change it with `useTheme()` and `ThemeToggle`.
- Always use semantic colour classes (`bg-background`, `text-muted-foreground`, `border-border`, `bg-primary`). Never hard-code hex/`slate-500` colours; they break dark mode.
- Status meaning has its own tokens: `success`, `warning`, `info`, `destructive` (each with `-foreground`). Use them only for meaning (e.g. low stock = warning, cash variance = destructive), never decoration.
- `sidebar-*` tokens are for the app navigation; `chart-1..5` for charts. Add new tokens in both `:root` and `.dark` and register them in `@theme inline`.
- Import with the `@/` alias (maps to `src/renderer/src`).

## UI components (shadcn/ui)

- Add components with `npx shadcn@latest add <name>`. The CLI can't detect this Electron setup and may write to a literal `@/` folder; if so, move the files into `src/renderer/src/components/ui/`.
- `components/ui/` is generated code: excluded from ESLint and Prettier, so don't hand-edit it. Wrap or compose in `components/` or the feature folder instead; if a real change is needed, do it deliberately and say so.
- Forms use the shadcn `Form` primitives with React Hook Form + Zod.
- Tables use TanStack Table (`@tanstack/react-table`) rendered with the shadcn `Table` components. Define column definitions per feature, keep them typed, and keep row/sorting/filtering state in the table, not duplicated in React state.
- Use lucide-react for icons.

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

Three layers; pick the cheapest one that can catch the bug.

| Layer     | Tool                                               | Files                         | Command                  |
| --------- | -------------------------------------------------- | ----------------------------- | ------------------------ |
| Unit      | Vitest + React Testing Library (jsdom)             | `src/**/*.test.ts(x)`         | `npm run test:unit`      |
| Component | Vitest Browser Mode (real Chromium via Playwright) | `src/**/*.component.test.tsx` | `npm run test:component` |
| E2E       | Playwright driving the built Electron app          | `e2e/*.spec.ts`               | `npm run test:e2e`       |

- Tests live next to the code they cover (`Foo.tsx` / `Foo.test.tsx`); E2E lives in `e2e/`.
- Unit: pure logic (money, volume, date maths, schemas, hooks) and simple component behaviour. Highest priority is the money/volume/date calculations.
- Component: anything that needs real layout, focus, keyboard or CSS (dialogs, tables, forms). Use `vitest-browser-react` and role/label locators.
- E2E: a few critical user journeys through the real app including main/preload/IPC (e.g. open shift, record dip reading, close shift). `npm run test:e2e` builds first. Keep these few and stable.
- Query by role/label/text, never by class or implementation detail. Prefer `userEvent` / locator clicks over firing events.
- Don't mock what you own; mock only the IPC boundary (the preload API) in unit/component tests.
- `pre-push` runs typecheck, lint and unit tests. Run `npm test` (unit + component) before finishing a task; run `test:e2e` when touching main, preload or critical flows.
- Setup files: `src/renderer/src/test/setup.unit.ts` and `setup.component.ts`. Config: `vitest.config.mts`, `playwright.config.ts`.

## Git hooks and commits

Husky runs these automatically; never bypass with `--no-verify`. Fix the cause instead.

- `pre-commit` — `lint-staged` (ESLint `--fix` + Prettier on staged files), then `npm run typecheck`.
- `commit-msg` — commitlint enforces Conventional Commits.
- `pre-push` — `npm run typecheck`, `npm run lint` and `npm run test:unit`.

Commit format: `type(scope): subject`

- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- Scope optional, lowercase, names the feature (`shifts`, `stock`, `cash`, `main`, `preload`).
- Subject: imperative mood, lowercase start, no trailing period, header ≤ 72 chars.
- Body (optional, blank line after header): explain why, wrap at 100 chars.
- Breaking changes: `!` after type/scope and a `BREAKING CHANGE:` footer.
- One logical change per commit.

## CI (GitHub Actions)

`.github/workflows/ci.yml` runs on pull requests into `dev` and `main`. PRs into `main` must come from `dev` (enforced by the `Branch policy` job); PRs into `dev` can come from any branch.

Parallel jobs: typecheck, lint, prettier (`npm run format:check`), unit tests, component tests, E2E tests (under `xvfb`). All must pass to merge; mark them as required checks in branch protection for `dev` and `main`.

- CI overrides the Electron mirrors from `.npmrc` with the official GitHub downloads.
- E2E runs with a fresh temp `--user-data-dir` (and `--no-sandbox` when `CI` is set); keep new E2E tests independent of persisted state.

## Working agreements for Claude

- Match existing patterns before introducing new ones; ask before adding dependencies or restructuring.
- Make the smallest change that solves the task; no drive-by refactors.
- Don't touch `out/`, `build/` or `node_modules/`.
- Commit only when asked.

# 05 — Team Workflow

## Day-to-day

```bash
# 1. Latest code
git pull

# 2. Dependencies — package-lock.json may have changed
npm install

# 3. Branch
git checkout -b feature/village-master

# 4. Work
npm run dev              # http://localhost:5173

# 5. Check it compiles and lints
npm run build            # tsc -b + vite build — catches type errors
npm run lint

# 6. Commit — read git status before you do
git status
git add src/
git commit -m "Add village master list and form"
git push -u origin feature/village-master
```

`npm run dev` alone does **not** type-check the whole project. Vite strips
types without checking them, so a type error can sit unnoticed until the
build. Run `npm run build` before pushing — it is the only step that runs
`tsc -b` across everything.

## You need the backend running

This app has no data of its own. Before starting work:

1. Start `iwms-backend` (see its `helpDoc/04-commands-reference.md`).
2. Make sure it has been seeded — an unseeded database means empty screens
   everywhere, which looks exactly like a frontend bug.
3. Point `VITE_API_LOCAL` at it and set `VITE_PROD=false`.
4. Your frontend's origin must be allowed by the backend's
   `CORS_ALLOWED_ORIGIN_REGEXES`. Running on a LAN IP rather than
   `localhost` usually means adding a regex there.

## Adding a new master screen, end to end

Say the backend has just gained `/api/v1/masters/villages/`.

1. **Schema** — `src/schemas/masters/village.schema.ts`. Copy
   `district.schema.ts` and adjust; keep the fields in step with the backend
   serializer.
2. **Pages** — `src/pages/admin/modules/masters/village/` with
   `VillageListPage.tsx` and `VillageForm.tsx`, copied from the district
   equivalents. You inherit the shared table, filtering, export and form
   wiring for free.
3. **Route** — register the components in `AdminEncryptedRouter`, add the
   segment to `routeMap.ts`, and add a builder to `routePaths.ts`. Always
   navigate via the builder so the segment is encrypted.
4. **Sidebar** — add the entry to `navRouteMap.ts`.
5. **Permissions** — the screen must exist in the backend's screen-management
   data. Without this, nobody but a superadmin sees it
   ([04](04-routing-and-permissions.md)).
6. **Translations** — add every user-facing string to `locales/en.ts`,
   `ta.ts` and `hi.ts`.
7. **Verify** — as superadmin *and* as a normal user with the permission
   granted. Those two paths behave differently, and testing only as
   superadmin hides permission bugs.

## Conventions worth following

**Import with `@/`.** The alias is configured in `vite.config.ts`. Never
`../../../`.

**Use the shared axios instance** (`@/api`), never bare axios — otherwise
you lose the base URL and the auth header.

**Copy the neighbouring screen.** The list/form pattern carries a lot of
shared behaviour (scoping, filters, export, permission checks) that is easy
to omit when starting fresh.

**Prefer what is already there.** The project already carries three chart
libraries and two component libraries. Use the one the surrounding screens
use rather than adding another.

**Don't edit `src/components/ui/` by hand.** Those are generated shadcn
primitives; wrap or compose them instead.

**Add strings to all three locales**, not just English.

**Never hard-code a URL or key.** Config belongs in `.env` as a `VITE_`
variable — remembering it is public ([02](02-environment-and-api.md)).

## Before you push — checklist

- [ ] `npm run build` passes (this is the real type check)
- [ ] `npm run lint` is clean
- [ ] `git status` shows only intended source files — no `.env`, no `dist/`,
      no `node_modules/`
- [ ] No API keys, tokens, passwords or IP addresses in the code
- [ ] New strings added to `en` / `ta` / `hi`
- [ ] Tested as superadmin **and** as a permission-restricted user
- [ ] `console.log` debugging removed
- [ ] If you added an env variable, `.env.example` has it too

## Committing

- Branch off the current main branch; never commit to it directly.
- One feature per branch; commit messages describe the change, not the files.
- If the feature needs backend work, say so in the PR: which endpoint, and
  which `seed --group` a reviewer must run.

Next: [06-gitignore-and-secrets.md](06-gitignore-and-secrets.md).

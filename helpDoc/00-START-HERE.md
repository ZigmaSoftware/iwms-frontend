# IWMS Frontend — Help Docs (Start Here)

This `helpDoc/` folder explains the entire `iwms-frontend` project from
scratch, assuming you know nothing about it yet — not the architecture, not
React, not this team's specific workflow. Read the files in order the first
time; after that, use them as reference.

If you only remember one thing from this whole folder, remember this:

> **This app renders almost nothing on its own. Every screen is driven by
> two things fetched from the backend at runtime: the user's JWT (who they
> are and what company/project they belong to) and their permission set
> (which screens, actions and even table columns they may see). A screen
> that "doesn't appear" is usually a permission problem, not a routing bug.**

Everything else below explains why, and how.

## Reading order

1. **[01-architecture-overview.md](01-architecture-overview.md)** — The
   stack, how the app boots, the provider tree, and how a page gets its data.
2. **[02-environment-and-api.md](02-environment-and-api.md)** — The `.env`
   file, which API the app talks to, the axios instance, and the external
   GPS/weighbridge APIs.
3. **[03-project-structure.md](03-project-structure.md)** — A tour of
   `src/`: where pages, components, schemas and hooks live, and where to put
   a new screen.
4. **[04-routing-and-permissions.md](04-routing-and-permissions.md)** — The
   encrypted router, protected routes, and the permission system down to
   column level. Read this before debugging a missing screen.
5. **[05-team-workflow.md](05-team-workflow.md)** — Day-to-day workflow,
   adding a new master screen end to end, and the pre-push checklist.
6. **[06-gitignore-and-secrets.md](06-gitignore-and-secrets.md)** — What is
   and isn't tracked, and the important point that **nothing in a frontend
   `.env` is actually secret**.
7. **[07-build-and-troubleshooting.md](07-build-and-troubleshooting.md)** —
   Building for production, deploying the `dist/` folder, and a
   symptom→fix table of real problems already hit.

## The one-paragraph map of the whole project

```text
iwms-frontend/
├── index.html            the single HTML page Vite serves
├── vite.config.ts        build config; the "@" -> "./src" alias
├── src/
│   ├── main.tsx             entry point
│   ├── AppProviders.tsx     the nested context providers
│   ├── App.tsx              the route table
│   ├── api/                 axios instance + interceptors
│   ├── pages/               screens, grouped by audience then module
│   ├── layouts/             admin/dashboard shells + encrypted routers
│   ├── components/          shared UI (ui/ is shadcn-style primitives)
│   ├── contexts/            user, permissions, roles, theme, project
│   ├── hooks/               reusable logic
│   ├── schemas/             zod validation, mirrors the backend masters
│   ├── utils/               permissions, exports, route crypto, storage
│   ├── locales/             en / ta / hi translations
│   └── types/               shared TypeScript types
├── .env                  your machine's settings — NOT in git
└── .env.example          template: copy to .env
```

The backend that serves this app is **`iwms-backend`**. Its own `helpDoc/`
explains the API. When a screen shows no data, having both open side by side
is the fastest way to find out whether the problem is here or there.

## Who is this for?

Anyone who needs to work on, build, or simply understand this frontend —
including someone who has never opened this repo before. Every file tries to
explain *why* something is set up the way it is, not just *what* the command
is.

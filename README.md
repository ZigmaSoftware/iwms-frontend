# IWMS Frontend

Web client for the **Integrated Waste Management System** — a React 19 +
TypeScript + Vite single-page application that serves the IWMS admin console,
the operational dashboards, and the district / local-body / citizen screens.

It covers master data (geography, waste types, vehicles, staff), trip
scheduling and daily operations, vehicle tracking, complaint ticketing,
workforce attendance, and reporting — scoped per company and project, in
English, Tamil and Hindi.

All data comes from the **`iwms-backend`** REST API. This app has no server
of its own.

---

## How IWMS fits together

IWMS is two repositories plus a database. This one is the browser half.

```text
   ┌──────────────────────────────────────────────────────────────┐
   │  BROWSER                                                     │
   │                                                              │
   │   iwms-frontend  (this repo)                                 │
   │   React 19 + Vite → built to static files in dist/           │
   │                                                              │
   │   Admin console · Dashboards · District / Local-body         │
   │   · Citizen screens · Vehicle tracking                       │
   └───────────────┬──────────────────────────────────────────────┘
                   │
                   │  HTTPS + JSON
                   │  Authorization: Bearer <JWT>
                   │
   ┌───────────────▼──────────────────────────────────────────────┐
   │  iwms-backend   (Django 5.2 + DRF)                           │
   │                                                              │
   │   /api/v1/<group>/<resource>/                                │
   │   masters · waste-types · transport-masters · user-creations │
   │   schedule-setup · schedule-operations · customer-masters    │
   │   complaint-ticket · reports · dashboard · login             │
   └───────────────┬──────────────────────────────────────────────┘
                   │  SQL
   ┌───────────────▼──────────────────────────────────────────────┐
   │  MySQL / MariaDB — one database, scoped by company + project │
   └──────────────────────────────────────────────────────────────┘

   Called straight from the browser, not through the backend:
   Vamosys GPS  ·  Weighbridge / attendance APIs   (see helpDoc/02)
```

### What happens when someone uses the app

```text
1. LOGIN
   Auth.tsx  ──▶  POST /api/v1/login/…        ──▶  JWT (5 hours, no refresh)
             ──▶  GET  login/my-permissions   ──▶  permission set

   Both are written to localStorage by utils/authStorage.ts.
   Permissions are fetched HERE and only here — see step 4.

2. BOOT
   main.tsx  ──▶  AppProviders  ──▶  App.tsx (routes)
                  Roles · Theme · Module · User · Permission · Project

3. NAVIGATE
   URL ──▶ ProtectedRoute (token valid?)
       ──▶ AdminEncryptedRouter (decrypt the segment → which page?)
       ──▶ PermissionProtectedRoute (may this user see it?)
       ──▶ the page component

4. RENDER
   The page reads the CACHED permission set to decide what to show:
     • whole screen   → PermissionProtectedRoute
     • buttons        → hasPermission(module, screen, action)
     • table columns  → useScreenColumnPermissions
     • form fields    → useFieldVisibility

5. FETCH DATA
   page ──▶ TanStack Query ──▶ api (axios) ──▶ backend
            interceptor attaches the Bearer token automatically
            results scoped to the selected company/project

6. ACT
   Forms validate with zod, POST/PATCH back through the same axios instance.
   Tables export via xlsx / jspdf. Maps render with Leaflet.
```

**The one consequence worth remembering:** permissions are read at login and
cached. An admin granting access does not reach a logged-in user until that
user logs out and back in.

---

## Quick start

Requires **Node.js 20+** and a running `iwms-backend`.

```bash
# 1. Dependencies
npm install

# 2. Settings — copy the template, then point it at your backend
cp .env.example .env

# 3. Run
npm run dev
```

Open **http://localhost:5173**.

> The backend must be running **and seeded**, or every screen will be empty.
> See `iwms-backend/helpDoc/04-commands-reference.md`.

> **New here?** Read **[helpDoc/00-START-HERE.md](helpDoc/00-START-HERE.md)**.
> It explains the whole project from scratch, assuming no prior knowledge of
> it or of React.

---

## Documentation

The `helpDoc/` folder is the full guide. Read it in order the first time,
then use it as reference.

| # | File | Covers |
|---|---|---|
| 00 | [START HERE](helpDoc/00-START-HERE.md) | Orientation and reading order |
| 01 | [Architecture overview](helpDoc/01-architecture-overview.md) | Stack, boot sequence, provider tree, request flow |
| 02 | [Environment and API](helpDoc/02-environment-and-api.md) | `.env` keys, the axios instance, external GPS/weighbridge APIs |
| 03 | [Project structure](helpDoc/03-project-structure.md) | Tour of `src/`; where to put a new screen |
| 04 | [Routing and permissions](helpDoc/04-routing-and-permissions.md) | Encrypted routes, guards, permission system |
| 05 | [Team workflow](helpDoc/05-team-workflow.md) | Adding a screen end to end; pre-push checklist |
| 06 | [.gitignore and secrets](helpDoc/06-gitignore-and-secrets.md) | What's ignored, and why frontend env values are public |
| 07 | [Build and troubleshooting](helpDoc/07-build-and-troubleshooting.md) | Production builds, SPA deploy, symptom→fix table |

---

## Scripts

```bash
npm run dev        # dev server with HMR -> http://localhost:5173
npm run build      # tsc -b && vite build -> dist/
npm run preview    # serve dist/ locally to check a production build
npm run lint       # eslint
```

> `npm run dev` does **not** type-check — Vite strips types without checking
> them. `npm run build` is the real check. Run it before pushing.

---

## Project layout

```text
iwms-frontend/
├── index.html            the single page Vite serves
├── vite.config.ts        build config; the "@" -> "./src" alias
├── src/
│   ├── main.tsx             entry point
│   ├── AppProviders.tsx     nested context providers
│   ├── App.tsx              route table
│   ├── api/                 axios instance + interceptors
│   ├── pages/               screens, by audience then module
│   ├── layouts/             admin/dashboard shells + encrypted routers
│   ├── components/          shared UI (ui/ = shadcn primitives)
│   ├── contexts/            user, permissions, roles, theme, project
│   ├── hooks/               reusable logic
│   ├── schemas/             zod validation, mirrors backend masters
│   ├── utils/               permissions, exports, route crypto, storage
│   ├── locales/             en / ta / hi
│   └── types/               shared types
├── helpDoc/              full documentation (start at 00)
├── .env                  your machine's settings — NOT in git
└── .env.example          template: copy to .env
```

---

## Environment variables

All configuration comes from `.env`, which is **git-ignored**.
`.env.example` is the committed template listing every key.

```bash
cp .env.example .env
```

The two that matter most:

```env
VITE_PROD=false                                   # exactly "true" or "false"
VITE_API_LOCAL=http://localhost:8000/api/v1       # used when VITE_PROD=false
VITE_API_PROD=https://your-host/api/v1            # used when VITE_PROD=true
```

Full table of every key:
**[helpDoc/02-environment-and-api.md](helpDoc/02-environment-and-api.md)**.

> ### Nothing in this `.env` is secret
> Vite compiles every `VITE_` variable into the JavaScript bundle at build
> time. Anyone who opens the site can read the values in DevTools. They are
> configuration, not credentials. If a key must stay private, the call has to
> go through the backend.
> See [helpDoc/06-gitignore-and-secrets.md](helpDoc/06-gitignore-and-secrets.md) —
> including a note on values already in this repo's history.

> Variables without the `VITE_` prefix are **not** exposed to the app. Vite
> reads `.env` at startup only — restart the dev server after editing it.

---

## Building and deploying

```bash
# Set VITE_PROD=true and VITE_API_PROD in .env FIRST — Vite bakes them in
npm run build          # -> dist/
```

`dist/` is static files. Serve them from any web server, with **one required
piece of config**: an SPA fallback, so deep links survive a refresh.

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

Also add the deployed origin to the backend's
`CORS_ALLOWED_ORIGIN_REGEXES`. Details and pitfalls:
[helpDoc/07-build-and-troubleshooting.md](helpDoc/07-build-and-troubleshooting.md).

---

## Packages

**71 runtime dependencies and 18 dev dependencies.** 27 of the 71 are
individual `@radix-ui/react-*` primitives, all consumed inside
`src/components/ui/` and nowhere else — so the list is shorter in practice
than the count suggests.

### Core

| Package | Version | What it does |
|---|---|---|
| `react`, `react-dom` | 19.2 | The framework |
| `typescript` | 5.9 | Types (dev) |
| `vite` | 7.2 | Dev server and bundler (dev) |
| `@vitejs/plugin-react` | 5.1 | React fast-refresh for Vite (dev) |

### Routing, data and forms

| Package | Version | What it does |
|---|---|---|
| `react-router-dom` | 7.9 | Routing. Module routes carry AES-obscured segments |
| `@tanstack/react-query` | 5.90 | Server state — caching, refetching, loading flags |
| `axios` | 1.13 | HTTP. **One shared instance in `src/api`** — always use it |
| `react-hook-form` | 7.67 | Form state |
| `zod` | 4.4 | Schema validation, mirroring the backend serializers |
| `jwt-decode` | 4.0 | Reads expiry and claims out of the access token |
| `crypto-js` | 4.2 | AES for `routeCrypto.tsx` (obfuscation, not security) |

### UI

| Package | Version | What it does |
|---|---|---|
| `primereact` + `primeicons` | 10.9 / 7.0 | **The dominant UI library — used in ~109 files** |
| `@radix-ui/react-*` (27 pkgs) | various | Headless primitives behind `components/ui/` |
| `tailwindcss` + `@tailwindcss/vite` | 4.1 | Styling |
| `lucide-react` | 0.555 | Icons — used in ~82 files |
| `class-variance-authority`, `clsx`, `tailwind-merge` | — | Conditional class composition (the `cn()` helper) |
| `sonner` | 2.0 | Toasts |
| `cmdk`, `vaul`, `input-otp`, `react-day-picker`, `react-resizable-panels`, `embla-carousel-react`, `flatpickr` | — | Command palette, drawer, OTP input, date picker, panels, carousel, date input |
| `next-themes` | 0.4 | Light/dark switching |
| `framer-motion` | 12.23 | Animation |

### Tables, charts, maps

| Package | Version | What it does |
|---|---|---|
| `@tanstack/react-table` | 8.21 | Every admin list screen |
| `recharts` | 3.5 | Charts — **the most used of the three (~9 files)** |
| `apexcharts` + `react-apexcharts` | 5.13 | Charts — 1 file |
| `chart.js` + `react-chartjs-2` | 4.5 | Charts — 1 file |
| `leaflet` | 1.9 | Maps and geofences — ~17 files |

### Export, i18n, misc

| Package | Version | What it does |
|---|---|---|
| `xlsx` | 0.18 | Excel export (`utils/exportExcel.ts`) |
| `jspdf` | 4.2 | PDF export (`utils/exportPdf.ts`) |
| `file-saver` | 2.0 | Triggers the browser download |
| `i18next` + `react-i18next` | 25.7 / 16.5 | English, Tamil, Hindi |
| `qr.js`, `react-qr-code` | — | QR codes for bins and customers |

### Dev tooling

`eslint` 9 with `typescript-eslint`, `eslint-plugin-react-hooks` and
`eslint-plugin-react-refresh`; `prettier` 3; `tw-animate-css`; plus the
`@types/*` packages.

### Known redundancy — read before adding a dependency

This list has grown organically and carries duplication worth knowing about:

- **Three charting libraries.** Recharts (~9 files), ApexCharts (1), Chart.js
  (1). **Use Recharts** for new charts unless you are editing one of the two
  existing screens.
- **Two component libraries.** PrimeReact dominates (~109 files); the Radix
  primitives live only inside `components/ui/`. Follow whatever the
  surrounding screen already uses rather than mixing them in one view.
- **Two unused packages.** `lottie-react` and `react-icons` are installed but
  imported nowhere in `src/`. They are safe to remove.

The rule: **prefer what the neighbouring screen already uses.** Adding a
fourth chart library is how this section got long.

---

## A screen isn't showing up?

That is nearly always permissions, not routing. Work through the ordered
checklist in
[helpDoc/04-routing-and-permissions.md](helpDoc/04-routing-and-permissions.md).
Quick split: log in as superadmin — superadmins bypass permission checks, so
if the screen appears, routing is fine and the problem is permission data.

---

## Contributing

1. `git pull`, then `npm install`
2. Branch: `git checkout -b feature/<name>`
3. Build it — schema → pages → route → sidebar → permissions → translations
   ([helpDoc/03](helpDoc/03-project-structure.md))
4. `npm run build` and `npm run lint`
5. **Run `git status` and read it** — no `.env`, no `dist/`, no
   `node_modules/`
6. Test as superadmin **and** as a permission-restricted user
7. Push and open a PR, noting any backend changes reviewers need

Full workflow: [helpDoc/05-team-workflow.md](helpDoc/05-team-workflow.md).

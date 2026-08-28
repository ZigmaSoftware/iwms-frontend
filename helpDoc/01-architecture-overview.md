# 01 — Architecture Overview

## What this project is

The web client for **IWMS (Integrated Waste Management System)**. It is a
single-page React application that talks to the `iwms-backend` REST API. It
serves several distinct audiences from one codebase:

- **Admin / superadmin** — master data, staff, vehicles, schedules,
  complaint tickets, reports
- **Dashboard users** — operational dashboards and charts
- **District and local-body users** — their own scoped dashboards
- **Citizens** — public-facing screens

There is no server of its own. `npm run build` produces static files
(`dist/`) that any web server can host; all data comes from the backend over
HTTPS.

## The stack

| Concern | Choice |
|---|---|
| Framework | React 19 + TypeScript |
| Build tool | Vite 7 |
| Routing | react-router-dom 7 |
| Server state | TanStack Query 5 |
| HTTP | axios (one configured instance) |
| Forms | react-hook-form + zod |
| UI primitives | Radix UI + Tailwind CSS 4 (shadcn-style) |
| Extra UI | PrimeReact, lucide/react-icons |
| Tables | TanStack Table |
| Charts | ApexCharts, Chart.js, Recharts |
| Maps | Leaflet |
| Export | xlsx, jspdf, file-saver |
| i18n | i18next — English, Tamil, Hindi |
| Auth | JWT in localStorage, decoded with jwt-decode |

Three chart libraries and two component libraries is more than a project
needs. It is the result of screens being built at different times. When you
build something new, prefer what the neighbouring screen already uses rather
than adding a fourth option.

## How the app boots

```text
index.html
   └── src/main.tsx                 mounts React, imports i18n and CSS
        └── AppProviders.tsx        the context stack (order matters)
             └── App.tsx            the route table
                  └── a layout      AdminLayout / DashboardLayout
                       └── a page   the actual screen
```

### The provider stack

`src/AppProviders.tsx` nests these, outermost first:

| Provider | Gives every screen |
|---|---|
| `RolesProvider` | The role list |
| `ThemeProvider` | Light/dark theme |
| `ModuleProvider` | Which functional module is active |
| `UserProvider` | The logged-in user and profile |
| `PermissionProvider` | What this user may see and do |
| `ProjectSelectorProvider` | The selected company/project scope |
| `TooltipProvider`, `BrowserRouter` | Radix tooltips, then routing |

The order is deliberate: `PermissionProvider` sits inside `UserProvider`
because permission checks are meaningless without a user, and
`BrowserRouter` is innermost so every route can read all of the above. If
you add a provider, think about what it depends on rather than appending it
at the end.

(Permissions themselves are fetched once at login and cached, not fetched by
the provider — see [04-routing-and-permissions.md](04-routing-and-permissions.md).)

## How a request travels

Take "open the Districts list".

1. **Route match** — `App.tsx` matches the URL and wraps the screen in
   `ProtectedRoute` (is there a valid, unexpired token?) and a layout.
2. **Encrypted router** — admin module routes go through
   `AdminEncryptedRouter`, which decrypts the URL segment to decide which
   page component to render. See
   [04-routing-and-permissions.md](04-routing-and-permissions.md).
3. **Permission check** — `PermissionProtectedRoute` /
   `usePermission()` confirm the user may view this screen. If not, they are
   redirected rather than shown an empty table.
4. **Data fetch** — the page calls the backend through the shared axios
   instance in `src/api/index.ts`, usually wrapped in a TanStack Query hook
   so results are cached and re-fetched sensibly.
5. **The interceptor** attaches `Authorization: Bearer <token>` from
   localStorage automatically — except on login calls.
6. **Render** — the response feeds a TanStack Table, a chart, or a form.
   Column-level permissions can hide individual columns at this point.

## Multi-tenancy on the client

Like the backend, everything is scoped to a **company** and **project**.
`ProjectSelectorContext` holds the current selection, and hooks such as
`useCompanyProjectSelection` and `useFormCompanyProjectSync` keep forms and
list filters in step with it.

This is the second most common source of "my data disappeared" after
permissions: the list is fine, but the selected project has no rows.

## Internationalisation

`src/i18n.ts` configures i18next with three locales in `src/locales/` —
`en.ts`, `ta.ts`, `hi.ts`. The chosen language is stored under
`iwms.language`. Ward and panchayat names come through in Tamil and Hindi, so
never assume ASCII when formatting or exporting text.

When you add a user-facing string, add it to all three locale files. An
English string hard-coded into a component will not translate.

Next: [02-environment-and-api.md](02-environment-and-api.md).

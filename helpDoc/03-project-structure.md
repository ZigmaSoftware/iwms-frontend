# 03 — Project Structure

Everything lives in `src/`. The `@` alias (configured in `vite.config.ts`)
points at it, so imports read `@/components/...` from anywhere — never
`../../../`.

## Top level

```text
src/
├── main.tsx          entry: mounts React, loads i18n and global CSS
├── AppProviders.tsx  the context stack
├── App.tsx           the route table
├── api/              axios instance + interceptors
├── pages/            screens
├── layouts/          page shells + encrypted routers
├── components/       shared UI
├── contexts/         global state
├── hooks/            reusable logic
├── schemas/          zod form validation
├── utils/            helpers
├── types/            shared TypeScript types
├── features/         two self-contained feature folders
├── locales/          en / ta / hi
├── config/           gpsApiConfig.ts
├── lib/              small primitives (notify, cn, zod errors)
└── docs/             permission-system notes
```

## `src/pages/` — the screens

Organised by **audience** first, then by module:

```text
pages/
├── Auth.tsx, auth/           login, forgot password, verify OTP, reset
├── admin/                    the big one
│   ├── AdminHome.tsx
│   └── modules/
│       ├── masters/              districts, cities, zones, wards, panchayats...
│       ├── superadmin/           audits, common masters
│       ├── superadminMasters/    company, project
│       ├── staffMasters/         staff records
│       ├── transportMasters/     vehicles, vehicle types, fuel
│       ├── wasteManagementMasters/  waste types, bins, properties
│       ├── core_modules/         schedule setup, daily operations
│       ├── workforcemanagement/  attendance, day/date reports
│       ├── vehicletracking/      GPS screens
│       ├── reports/              report screens
│       └── Dashboard/
├── dashboard/                the dashboard app
├── district/                 district-user dashboard
├── localbody/                local-body dashboard
└── NotFound.tsx
```

### The shape of one master screen

Every master follows the same two-file pattern, and copying the nearest
existing one is by far the fastest way to add a new screen correctly:

```text
district/
├── DistrictListPage.tsx     table, filters, search, export, row actions
└── DistrictForm.tsx         create/edit form (react-hook-form + zod)
```

## `src/layouts/`

| Folder | What |
|---|---|
| `admin/AdminLayout.tsx` | Sidebar + header shell for admin screens |
| `admin/components/` | `AppSidebar`, `AppHeader`, `AdminBreadcrumb`, `Backdrop` |
| `admin/navRouteMap.ts` | Maps sidebar entries to routes |
| `admin/encryptedRouting/` | `AdminEncryptedRouter` — see [04](04-routing-and-permissions.md) |
| `dashboard/` | Dashboard shell, horizontal nav, mobile nav sheet |
| `shared/RoleBasedLayout` | Picks the right shell for the user's role |

## `src/components/`

| Folder | What |
|---|---|
| `ui/` | shadcn-style Radix + Tailwind primitives (button, dialog, table…). **Generated — prefer composing over editing.** |
| `form/` | Shared form controls wired to react-hook-form |
| `common/` | Cross-screen pieces |
| `auth/` | Login-related components |
| `header/`, `map/`, `modules/` | Header pieces, Leaflet maps, module switching |
| `ProtectedRoute.tsx`, `PermissionProtectedRoute.tsx`, `PermissionSidebar.tsx` | Access control — see [04](04-routing-and-permissions.md) |

`components.json` is the shadcn config that controls where new primitives are
generated.

## `src/contexts/`

| Context | Holds |
|---|---|
| `UserContext` | Logged-in user and profile |
| `PermissionContext` | Permission set, cached at login; exposes `usePermission()` |
| `RolesContext` | Available roles |
| `ProjectSelectorContext` | Selected company/project — scopes most queries |
| `ModuleContext` | Active functional module |
| `ThemeContext` | Light/dark |
| `SideBarContext` | Sidebar open/collapsed |

## `src/hooks/`

Notable ones:

| Hook | Use |
|---|---|
| `usePermissionHelpers` | Convenience wrappers over `usePermission()` |
| `useScreenColumnPermissions` | Which table columns this user may see |
| `useFieldVisibility` | Show/hide individual form fields |
| `useCompanyProjectSelection`, `useFormCompanyProjectSync` | Keep forms/lists in step with the selected project |
| `useScopedLocationOptions`, `useCollectionPointLocationOptions`, `useZonePanchayatVisibility` | Location dropdowns filtered to the user's scope |
| `useFilterBarFilters` | Shared list filter-bar state |
| `use-mobile`, `useModal`, `use-toast` | UI utilities |

## `src/schemas/` — zod validation

Mirrors the backend's master groups (`masters/`, `transportMasters/`,
`wasteManagementMasters/`, `superadminMasters/`, `staffMasters/`,
`core_modules/`, `shared/`). One schema per entity, e.g.
`masters/district.schema.ts`.

Keep these honest against the backend serializer. When the API rejects a
field the frontend accepted, this is where the mismatch usually is.

## `src/utils/`

| File | Use |
|---|---|
| `permissions.ts`, `permissionFilters.ts` | Fetch, normalise and check permissions |
| `authStorage.ts` | Token/user storage keys, decode and expiry |
| `routeCrypto.tsx`, `routeMap.ts`, `routePaths.ts`, `routeCache.ts` | URL encryption and the route registry |
| `exportExcel.ts`, `exportPdf.ts`, `adminListExport.ts` | Export a table to XLSX/PDF |
| `listQueryContext.ts`, `listSearchHeader.tsx`, `pagination.ts`, `tableFilterMatch.ts` | Shared list behaviour |
| `geofenceParser.ts`, `geolocation.ts` | Map and geofence handling |
| `wasteApi.ts`, `wasteTypeColors.ts` | Weighbridge calls; consistent waste-type colours |
| `formatTime.ts`, `capitalize.ts`, `forms.ts`, `customerUtils.ts` | Small helpers |

## `src/features/`

`complaintTicketing/` and `grievances/` are organised feature-first
(components, hooks and API calls together) rather than split across the
folders above. Both patterns exist in the codebase; follow whichever the
surrounding code uses.

## Where to put a new screen

1. **Schema** → `src/schemas/<group>/<thing>.schema.ts`
2. **Pages** → `src/pages/admin/modules/<group>/<thing>/` — a `ListPage` and
   a `Form`, copied from the nearest existing master
3. **Route** → register in the relevant encrypted router and `routeMap.ts`
4. **Sidebar** → add to `navRouteMap.ts`
5. **Permissions** → the screen must exist in the backend's screen-management
   data, or nobody will see it ([04](04-routing-and-permissions.md))
6. **Translations** → add strings to `locales/en.ts`, `ta.ts`, `hi.ts`

Next: [04-routing-and-permissions.md](04-routing-and-permissions.md).

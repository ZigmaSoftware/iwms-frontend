# 04 — Routing and Permissions

Read this before debugging "my screen doesn't show up". In this app that is
almost always routing or permissions, not the page component.

## The route table

`src/App.tsx` holds the top-level routes. Each screen is wrapped in helpers
that stack the guards:

```tsx
function withAdmin(children) {
  return (
    <ProtectedRoute>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  );
}
```

Broadly there are four route families:

| Family | Entry | Audience |
|---|---|---|
| Auth | `Auth`, `ForgotPassword`, `VerifyOTP`, `ResetPassword` | Everyone, unauthenticated |
| Admin | `AdminHome` + `AdminEncryptedRouter` | Admin / superadmin |
| Dashboard | `Dashboard` + `DashboardEncryptedRouter` | Dashboard users |
| Scoped | `LocalBodyAuth`/`LocalBodyDashboard`, `DistrictAuth`/`DistrictDashboard` | Local-body and district users |

`RoleBasedLayout` picks the right shell for the user's role, and
`src/types/roles.ts` holds the role constants, normalisation
(`normalizeRole`) and the admin view-mode preference. Roles arriving from the
API vary in casing and spelling, which is exactly why `normalizeRole` exists
— compare through it, never with a raw string equality check.

## Encrypted routing

Admin and dashboard module routes do not appear in the URL as readable
paths. Instead a single dynamic segment carries an AES-encrypted value, and
`AdminEncryptedRouter` / `DashboardEncryptedRouter` decrypt it to decide
which page component to render.

`src/utils/routeCrypto.tsx` provides the pair:

```ts
encryptSegment("districts")   // -> URL-safe AES ciphertext
decryptSegment(segment)       // -> "districts" | null
```

Ciphertext is made URL-safe by swapping `+ / =` for `- _ ~` and back.
`decryptSegment` returns `null` on anything it cannot decrypt, and the router
redirects rather than crashing.

Supporting files: `routeMap.ts` (segment → component), `routePaths.ts` (path
builders — **use these instead of hand-writing URLs**, since a hand-typed
path will not be encrypted), and `routeCache.ts`.

### Be clear about what this does and doesn't do

This obscures URLs. It is **not** a security control:

- The key is a constant in `routeCrypto.tsx`, compiled into the bundle that
  every visitor downloads. Anyone can read it in DevTools and decrypt or
  forge segments.
- Real access control is the backend's job — it re-checks permissions on
  every request. That is what actually protects the data.

So treat encrypted routes as cosmetic. Never rely on an unguessable URL to
keep a screen private, and never put anything sensitive in a route segment.

## The permission system

> **Note:** `src/docs/PERMISSION_SYSTEM.md` in the source tree describes an
> older design with 10-second polling. The current code does not poll — that
> file is out of date. What follows describes the code as it is today.

**Where permissions come from.** They are fetched **once, at login**.
`src/pages/Auth.tsx` calls `login/my-permissions` (see
`src/helpers/admin/endpoints.ts`), stores the result via
`src/utils/authStorage.ts`, and hands it to `updatePermissions()`.

`PermissionContext` itself does **no fetching**. It initialises its state
from localStorage (`getStoredPermissions()`) and exposes checks over it.

The practical consequence: **a permission change by an admin does not reach a
logged-in user until they log in again.** When someone says "you gave me
access but I still can't see it", that is the first thing to check.

**Three levels of granularity:**

1. **Route** — `PermissionProtectedRoute` blocks the screen entirely.
2. **Action** — `usePermission()` in a component hides or disables
   create/edit/delete controls.
3. **Column** — `useScreenColumnPermissions` hides individual table columns,
   and `useFieldVisibility` individual form fields.

**Using it in a component.** Note the signature: **module, screen, action** —
the action defaults to `"view"`.

```tsx
import { usePermission } from "@/contexts/PermissionContext";

const { hasPermission, hasColumnPermission } = usePermission();

{hasPermission("masters", "districts", "create") && <AddButton />}
{hasColumnPermission("masters", "districts", "population") && <Column ... />}
```

The context also exposes `permissionDetails`, `isEmptyPermissions` and
`lastVersion`. `isEmptyPermissions` is worth knowing about: it distinguishes
"this user is allowed nothing" from "permissions haven't loaded yet", which
otherwise look identical in the UI.

`hasPermission()` resolves **aliases**, because screen and module names have
drifted between frontend and backend over time (the `schedule-masters` split
and the `userscreenpermissions` → `companywisescreenpermissions` rename both
have fallbacks). If a check behaves oddly, read the alias tables in
`src/utils/permissions.ts` before assuming the backend is wrong.

**The sidebar is permission-driven too.** `PermissionSidebar` only renders
entries the user may reach, which is why a new screen can be completely
invisible even though its route works.

## Why a new screen doesn't appear — in order

Work down this list; it is roughly the order of likelihood:

1. **No permission row exists in the backend.** A new screen must be present
   in the screen-management data. Run the backend's
   `seed --group screen-managements`, or add it through the screen-management
   UI. This is the most common cause by far.
2. **The user's role has not been granted it** — or was granted it *after*
   they logged in. Permissions are cached at login, so have them log out and
   back in before investigating further. Check with a superadmin login too:
   if the screen appears there but not for a normal user, it is a grant
   problem, not a code problem.
3. **Not registered in the encrypted router / `routeMap.ts`.** The route
   resolves to nothing and redirects.
4. **Not in `navRouteMap.ts`.** The screen works if you navigate directly but
   has no sidebar entry.
5. **Permission name mismatch.** The module/screen strings passed to
   `hasPermission(module, screen, action)` don't match the backend's names,
   and no alias covers them.
6. **Wrong project selected.** The screen renders but the list is empty
   because the selected company/project genuinely has no rows.

A fast way to split 1–2 from 3–5: log in as superadmin. Superadmins bypass
permission checks, so if the screen appears, the routing is fine and the
problem is permission data.

## Token and session behaviour

- Tokens live in `localStorage` (`access_token`), with the keys defined in
  `src/utils/authStorage.ts`.
- The backend issues **5-hour access tokens and disables refresh** — there is
  no silent refresh. `ProtectedRoute` checks expiry and sends the user back
  to login.
- Because permissions are cached in localStorage and only refreshed at login,
  **logging out must clear the permission and config keys too**, not just the
  token. `authStorage.ts` has helpers for this. Leftover permissions from a
  previous user on a shared machine are a real bug source.

Next: [05-team-workflow.md](05-team-workflow.md).

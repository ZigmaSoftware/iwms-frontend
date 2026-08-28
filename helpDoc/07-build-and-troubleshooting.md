# 07 — Build and Troubleshooting

## The scripts

```bash
npm run dev        # Vite dev server, HMR, http://localhost:5173
npm run build      # tsc -b && vite build  ->  dist/
npm run preview    # serve dist/ locally, to check a production build
npm run lint       # eslint
```

`npm run build` is the only one that type-checks. `npm run dev` strips types
without checking them, so run the build before pushing.

## Building for production

**Set the environment first.** Vite bakes `.env` into the bundle at build
time, so the values present when you build are the values that ship:

```bash
# In .env:
#   VITE_PROD=true
#   VITE_API_PROD=https://your-production-host/api/v1

npm run build
```

Get this wrong and you deploy a bundle that calls `localhost:8000` from your
users' browsers. It is the single most common deployment mistake here. Verify
before shipping:

```bash
npm run preview     # then check the console line: [api] API_ROOT {...}
grep -r "VITE_API_PROD_VALUE_HERE" dist/assets/*.js   # confirm what's baked in
```

`src/api/index.ts` logs the resolved `API_ROOT` to the browser console on
load — the fastest way to check what a deployed bundle is actually talking
to.

## Deploying

`dist/` is plain static files — HTML, JS, CSS, images. Any web server or
static host will serve them.

**One required piece of config: SPA fallback.** This is a single-page app
with client-side routing. A user refreshing on `/admin/districts` asks the
server for a file that does not exist, and gets a 404 unless the server is
told to return `index.html` for unknown paths.

nginx:

```nginx
server {
    root /var/www/iwms-frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;    # <- the SPA fallback
    }
}
```

Apache needs the equivalent `.htaccess` rewrite; Netlify/Vercel-style hosts
have a redirects setting for it.

Also make sure the backend allows the deployed origin in
`CORS_ALLOWED_ORIGIN_REGEXES`, and serve over HTTPS if the API is HTTPS —
browsers block mixed content.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Blank white page, console: `Failed to resolve module` | Stale build or dependency mismatch | `rm -rf node_modules package-lock.json && npm install` |
| `import.meta.env.VITE_X` is `undefined` | Missing `VITE_` prefix, or dev server not restarted | Add the prefix; restart — Vite reads `.env` only at startup |
| API calls go to the wrong host | `VITE_PROD` / API URL wrong at **build** time | Fix `.env`, rebuild. `VITE_PROD` must be exactly `true`/`false` |
| "blocked by CORS policy" | Frontend origin not allowed by the backend | Add a regex to the backend's `CORS_ALLOWED_ORIGIN_REGEXES` |
| `Network Error` on every call | Backend not running, or wrong port | Start the backend; check `VITE_API_LOCAL` |
| 401 on every call after a while | Token expired — 5h lifetime, refresh disabled | Log in again. This is by design |
| Logged in but redirected to login | Expired or malformed token in localStorage | Clear site data and log in again |
| 404 on refresh of a deep link | No SPA fallback on the web server | Add `try_files ... /index.html` |
| Screen missing from the sidebar | Almost always permissions | Work through the list in [04](04-routing-and-permissions.md) |
| Screen works for superadmin, not others | Permission not granted for that role | Grant it in screen management |
| Table renders but is empty | Wrong company/project selected, or backend not seeded | Check the project selector; seed the backend |
| Some table columns missing | Column-level permissions | `useScreenColumnPermissions` — check the grants |
| Route redirects to home unexpectedly | `decryptSegment` returned `null` | Navigate via `routePaths.ts` builders, not hand-written URLs |
| Type errors only on build, never in dev | `npm run dev` doesn't type-check | Expected — always run `npm run build` before pushing |
| Tamil/Hindi text renders as boxes | Font lacks the glyphs | Use a font with Indic coverage |
| A string won't translate | Hard-coded in the component, or missing from a locale | Add the key to `en.ts`, `ta.ts` and `hi.ts` |
| Build is very slow / out of memory | Large bundle, many chart libraries | `NODE_OPTIONS=--max-old-space-size=4096 npm run build` |

## Clean rebuild

When the dev server behaves inexplicably:

```bash
rm -rf node_modules package-lock.json dist
npm install
npm run dev
```

Deleting `package-lock.json` will re-resolve versions — commit the new one
deliberately if you keep it, or restore it with `git checkout
package-lock.json` if you only wanted a clean `node_modules`.

## Useful checks

```bash
npx tsc --noEmit          # type-check without building
npm run lint -- --fix     # auto-fix what eslint can
npm outdated              # what's behind
du -sh dist/              # bundle size after a build
```

Back to [00-START-HERE.md](00-START-HERE.md).

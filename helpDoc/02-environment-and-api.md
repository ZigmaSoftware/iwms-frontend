# 02 — Environment and API

## The `.env` file

Vite reads `.env` at **build time** and substitutes values into the bundle.
Copy the template on a fresh clone:

```bash
cp .env.example .env
```

`.env` is git-ignored. `.env.example` is committed and lists every key.

### The VITE_ prefix rule

Vite only exposes variables that start with `VITE_` to browser code. A
variable without the prefix is simply `undefined` at runtime — which is why
`FRONTEND_LIVE_URL`, `PHP_MYADMIN` and similar entries that have appeared in
past `.env` files did nothing. If it must reach the app, it needs the prefix.

### Nothing here is secret

This is the most important point in this file.

**Every `VITE_` variable is compiled into the JavaScript bundle and shipped
to the browser.** Anyone who opens the site can read them in DevTools. They
are configuration, not secrets.

So an API key in this `.env` is a **public** API key. If a key must stay
private, the call has to go through the backend, which can hold the key
server-side. Read
[06-gitignore-and-secrets.md](06-gitignore-and-secrets.md) before adding any
credential here.

## Choosing which backend to talk to

```env
VITE_PROD=false
VITE_API_LOCAL=http://localhost:8000/api/v1
VITE_API_PROD=https://your-production-host/api/v1
```

`src/api/index.ts` picks between them:

```ts
const IS_PROD  = import.meta.env.VITE_PROD === "true";
const API_ROOT = IS_PROD
  ? import.meta.env.VITE_API_PROD
  : import.meta.env.VITE_API_LOCAL;
```

Two things to note:

- The comparison is against the **string** `"true"`. `VITE_PROD=1` or
  `VITE_PROD=TRUE` both evaluate to false. Write exactly `true` or `false`.
- This is decided at build time, not runtime. A `dist/` built with
  `VITE_PROD=false` will point at localhost no matter where you deploy it.
  **Set `VITE_PROD=true` before running `npm run build` for production.**

The module logs the resolved `API_ROOT` to the console on load, which is the
quickest way to check what a deployed bundle is actually talking to.

## The axios instance

`src/api/index.ts` exports one configured `api` instance. Use it for every
backend call rather than importing axios directly — otherwise you lose the
base URL and the token header.

```ts
import { api } from "@/api";

const { data } = await api.get("/masters/districts/");
```

Its request interceptor:

1. reads the JWT from `localStorage` under `access_token`,
2. attaches `Authorization: Bearer <token>`,
3. **skips** that for URLs containing `/login/`, so login calls are not sent
   with a stale token.

Response handling lives in `src/api/interceptors.ts`.

Note that the backend issues **5-hour access tokens with refresh disabled**.
There is no silent refresh to implement — when the token expires the user
logs in again. `src/utils/authStorage.ts` holds the storage keys and decodes
the token to check expiry.

## External APIs

The app also calls third-party services directly from the browser.

### Vamosys GPS

| Variable | Used for |
|---|---|
| `VITE_GPS_VEHICLE_HISTORY_API` | Vehicle history — needs `userId`, `groupName`, `vehicleId`, `fromDateUTC`, `toDateUTC` |
| `VITE_GPS_VEHICLE_TRACKING_API` | Live tracking — needs `providerName`, `fcode` |
| `VITE_GPS_TRIP_SUMMARY_API` | Trip summary — needs `vehicleId`, date range, `userId`, `duration` |
| `VITE_GPS_USER_ID`, `VITE_GPS_GROUP_NAME`, `VITE_GPS_PROVIDER_NAME`, `VITE_GPS_FCODE`, `VITE_GPS_TRIP_USER_ID` | Default parameters for the above |

Configuration lives in `src/config/gpsApiConfig.ts`. Used by the vehicle
tracking screens.

### Weighbridge and attendance

| Variable | Used for |
|---|---|
| `VITE_GPS_DAY_WISE_API` | Day-wise weighment |
| `VITE_GPS_DATE_WISE_API` | Date-range weighment |
| `VITE_GPS_ATTENDANCE_API` | Attendance sync |
| `VITE_WEIGHBRIDGE_WASTE_API` | Waste-collected summary |
| `VITE_WEIGHBRIDGE_WASTE_COLLECTION_KEY` | Key for that API |
| `VITE_WEIGHBRIDGE_WASTE_COLLECTION_CORS_PROXY` | CORS proxy for it |

Helpers are in `src/utils/wasteApi.ts`.

The CORS proxy entry is worth understanding: the weighbridge API does not
send CORS headers, so the browser refuses the direct call and requests are
bounced through a proxy. That is a workaround, not a design — a public proxy
sees every request and its key. The durable fix is to have the backend make
this call. Treat `VITE_WEIGHBRIDGE_WASTE_COLLECTION_KEY` as public until
then.

## Adding a new variable

1. Add it to `.env` with the real value.
2. Add the key to `.env.example` with a blank or safe placeholder, **in the
   same commit** — otherwise the next person's build silently misbehaves.
3. Prefix it `VITE_`, or the app cannot read it.
4. Restart the dev server. Vite loads `.env` at startup; it does not hot-
   reload environment changes.

Next: [03-project-structure.md](03-project-structure.md).

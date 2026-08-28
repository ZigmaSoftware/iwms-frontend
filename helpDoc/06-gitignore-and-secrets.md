# 06 — .gitignore and Secrets

## The principle

Git history is permanent and shared. Anything committed once is on every
clone and fork of the repo, forever, even after a later commit deletes it.

For a frontend there is a second principle that matters just as much:

> **Nothing shipped to the browser is secret.** Every `VITE_` variable is
> compiled into the bundle and readable by anyone who opens DevTools.

Both are covered below.

## What is ignored, and why

### `.env`

```gitignore
.env
.env.*
!.env.example
```

`.env` is per-machine: your local API URL differs from your colleague's and
from production. Tracking it would break other people's builds even setting
secrecy aside.

`.env.example` is committed — it lists every key with blank or safe values so
a new developer knows what to fill in. **When you add a variable, add its key
to `.env.example` in the same commit.**

### `node_modules/`

Hundreds of megabytes, rebuilt from `package.json` + `package-lock.json` with
`npm install`. Never commit it.

**Do commit `package-lock.json`** — it pins the exact dependency versions so
everyone builds the same tree. It is not a build artefact.

### `dist/`

Build output from `npm run build`. Regenerated on every build and specific to
the `.env` it was built with. Deploy it; don't track it.

### Logs, caches, editor and OS files

```gitignore
*.log  npm-debug.log*  yarn-debug.log*  pnpm-debug.log*
coverage/
.vscode/*  .idea  .DS_Store  Thumbs.db
```

`.vscode/*` has one exception, `!.vscode/extensions.json`, so the team can
share recommended extensions without sharing personal settings.

### Per-machine scripts

```gitignore
frontend_sync.sh
*.deb
```

`frontend_sync.sh` contains server-specific paths for one machine's deploy.
`*.deb` catches downloaded installers committed by accident.

## Frontend "secrets" — the part that matters

Vite substitutes `VITE_` variables into the JavaScript at **build time**.
After `npm run build`, the values are plain strings inside `dist/assets/*.js`.
You can verify this yourself:

```bash
npm run build
grep -r "your-api-key-value" dist/
```

It will be there.

So:

- **A key in the frontend `.env` is a public key.** Nothing in this file is
  protected by being git-ignored — that only keeps it out of *history*, not
  out of the shipped bundle.
- **If a credential must stay private, the frontend cannot hold it.** The
  call has to go through the backend, which keeps the key server-side and
  proxies the request.
- **Restrict what you can.** Third-party keys that must live in the client
  should be locked down at the provider — HTTP-referrer restrictions, IP
  allowlists, read-only scopes, low quotas.

The `VITE_WEIGHBRIDGE_WASTE_COLLECTION_KEY` and the Vamosys GPS parameters
are in exactly this position today: they ship to the browser, so treat them
as public and rely on provider-side restrictions. Moving those calls behind
the backend is the durable fix
([02-environment-and-api.md](02-environment-and-api.md)).

The route-encryption key in `src/utils/routeCrypto.tsx` is the same story: a
constant in the bundle, so URL encryption is obfuscation, not access control
([04-routing-and-permissions.md](04-routing-and-permissions.md)).

## Real leak found in this repo — read this

An audit found that **`.env` had been committed to this repository**, and the
old `.gitignore` did not list `.env` at all. It has now been removed from
tracking (`git rm --cached`) and the ignore rules fixed.

**Removing a file from tracking does not remove it from history.** Anyone
with a clone or with access to the remote can still read the old values, so
the keys it held should be treated as exposed:

- [ ] Weighbridge waste-collection key
- [ ] Vamosys GPS identifiers (`userId`, `fcode`, `providerName`, group name)
- [ ] Any internal URLs or hosts that were recorded there

Because these values ship to the browser anyway, rotating them matters less
than it does on the backend — but the internal hostnames and the
phpMyAdmin/server URLs that were also in that file are genuinely worth not
publishing. The backend's own leak is more serious; see
`iwms-backend/helpDoc/06-gitignore-and-secrets.md`, which lists database and
SMTP credentials that need rotating.

## Habits

**Read `git status` before every commit.** Most leaks are one careless
`git add .`.

```bash
git add src/              # explicit, not "git add ."
git diff --cached         # see exactly what you're committing
git check-ignore -v .env  # confirm a file is ignored
git ls-files | grep -iE "\.env|secret|key|password"   # nothing tracked?
```

**Never put credentials in scratch files.** `notes.txt`, `install.txt` and
`prompt.md` are exactly where secrets end up.

**If you commit a secret, say so immediately.** The fix is rotating it, and
that only happens if the team knows. Deleting the file in a follow-up commit
achieves nothing — the value is still in history.

Next: [07-build-and-troubleshooting.md](07-build-and-troubleshooting.md).

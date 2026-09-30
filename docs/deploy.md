# Sharing the game with friends and family

There are two separate deploys, and it matters which is which.

| | Who | What runs | Saves and recordings |
|---|---|---|---|
| **Home** ([server/README.md](../server/README.md)) | Asher, on your network | `app/` **and** the Node backup server | Backed up to the NAS |
| **Public** (this page) | Friends and family, over the internet | `app/` only — a static site | Stay on each family's own device |

The public copy has no server and no backup API. That is deliberate. See
[No backup API on the public copy](#no-backup-api-on-the-public-copy) below — it is the
reason not to simply point friends at the NAS.

## One-time setup

You need a free Cloudflare account. Nothing is installed permanently; `npm run deploy`
fetches wrangler on demand.

1. Sign up at [dash.cloudflare.com](https://dash.cloudflare.com). No domain or card needed.
2. From the repo root, log in and publish:
   ```
   npx -y wrangler@4 login          # opens a browser once
   npm run deploy                   # uploads app/ and prints the URL
   ```
   The live copy is at **https://wordcraft-valley.wordcraft-valley.workers.dev**. It runs on
   Cloudflare Workers static assets — what Cloudflare Pages became; wrangler no longer creates
   classic Pages projects. The files in `app/` are served as-is; the few-line
   [cloudflare/worker.js](../cloudflare/worker.js) only answers requests no file matches
   (`/` → `index.html`, anything else → 404).
3. Open that URL on any iPad or phone and choose **Add to Home Screen**. HTTPS comes with
   Cloudflare, so offline play and the microphone both work.

That URL is all a friend needs. Send it to them.

Project settings live in [wrangler.toml](../wrangler.toml); cache rules are in
[app/_headers](../app/_headers), which mirrors what the home server sends so the game
updates the same way on both.

Two settings in `wrangler.toml` matter for the home-screen app. `html_handling = "none"`
stops Cloudflare redirecting `/index.html` to `/`: the service worker caches the app under
`index.html`, and a redirected copy fails to open on the next launch. And there is
deliberately no catch-all fallback to `index.html`, because a missing voice clip would then
come back as a web page that the service worker keeps as that clip forever.

### A custom name (optional)

Cloudflare → Workers & Pages → `wordcraft-valley` → Settings → **Domains & Routes** → add a custom domain, → add e.g. `wordcraft.<your-domain>`.
If the domain is already on Cloudflare the DNS record is made for you.

## Updating the public copy

Push to `main`. [.github/workflows/deploy.yml](../.github/workflows/deploy.yml) waits for the
`test` workflow to pass and then deploys that commit, so a red build never ships. It needs two
repo secrets (Settings → Secrets and variables → Actions):

| Secret | Where to get it |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → Create Token → template **Edit Cloudflare Workers** |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard sidebar, or `npx wrangler whoami` |

Until those are set, deploy by hand with `npm run deploy`.

As at home, run `npm run release` when you change anything in `app/`. Installed home-screen apps
only notice a new build when `sw.js`'s `VERSION` string changes.

## What friends get, and what they don't

Everything in the game works: the valley, the mine, the books, recording his own voice, races,
pets, all 1791 voice clips. Each family's progress lives in that device's own browser storage,
completely separate from everyone else's, and from Asher's.

What they don't get is the NAS backup. On their device, progress lives in one browser profile.
If they delete the app or clear website data, that valley is gone. Worth saying when you send
the link. The Grown-up menu → Settings still shows a **Home server backup** row, which will read
"Not found at https://…" — harmless, and a parent with their own server could type its address
there.

## No backup API on the public copy

The obvious shortcut — expose the NAS server so friends load the game from it — would put every
family into a **single shared** backup store, because the game defaults to backing up to whatever
server it was loaded from ([`base()`](../app/index.html#L8635) returns `location.origin`):

- The game would offer one kid another kid's valley. `checkOther()`
  ([app/index.html:8692](../app/index.html#L8692)) pops up *"You played on another device!"*
  whenever the newest snapshot in the shared pool is further along than the local save.
- Every snapshot contains **his voice recordings**, and `TOKEN` is empty by default
  ([docker-compose.yml](../server/docker-compose.yml)), CORS is `*`, and `GET /api/latest`
  returns the whole newest backup ([server/server.js:57](../server/server.js#L57)). Anyone with
  the URL could download any family's audio.

Serving the game as a static site avoids all of it: there is no `/api/*` to find, so
`Sync.ping()` fails, auto-backup quietly does nothing, and no recording ever leaves the device.
The home deploy keeps its backups exactly as before.

If you ever do want backups for other families, that needs a real change to the server — a
per-family key that namespaces `snapshots/` and `blobs/` and is required on every route — not
just a public port.

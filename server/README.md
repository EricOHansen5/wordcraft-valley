# Wordcraft Valley home server

Serves the game to the iPad and keeps daily backups of everything: progress, his recordings, and your voice.

This server is for **your network only**. Everything below assumes the devices on it are yours.
To share the game with friends and family, use [docs/deploy.md](../docs/deploy.md) instead — a
static copy with no server, so each family keeps their own progress and no recording leaves their
device. Don't just open this server to the internet: every device that loads the game from it
backs up into the *same* snapshot store, and offers one child another child's valley.

## Synology (Container Manager)
1. Install **Git Server** (Package Center) so the NAS has `git`, then over SSH: `cd /volume1/docker && git clone https://github.com/<you>/wordcraft-valley.git wordcraft`
   (private repo: use a fine-grained GitHub token with read-only Contents access as the password, or a deploy key).
2. Container Manager → **Project** → **Create** → path `docker/wordcraft/server` → it finds `docker-compose.yml` → **Build**.
3. The game is now at `http://<nas-ip>:8088`.

## HTTPS (needed on the iPad)
The home-screen app, offline mode and the microphone only work over HTTPS. Pick one:
- **DSM reverse proxy:** Control Panel → Login Portal → Advanced → Reverse Proxy → add `https://wordcraft.<your-domain>` → `http://localhost:8088`, then give it a certificate under Security → Certificate.
- **Tailscale:** run `tailscale serve --bg 8088` on the NAS, then open `https://<nas>.<tailnet>.ts.net` on the iPad.

Open that HTTPS address on the iPad and choose **Add to Home Screen**. Backups then work with no setup, because the game finds the server at the address it was loaded from.

## Several devices
Put the game on every iPad, phone or laptop from the same HTTPS address. Each one backs up after he plays. When a device that is behind is opened, it offers to carry on from the newest valley. An automatic backup never replaces newer progress from another device.

## Backups
- The game backs up about once a day while he plays, and whenever the app goes to the background (at most every 30 minutes).
- It keeps the last 60 snapshots, plus the first snapshot of every month forever.
- Each recording is stored only once, however many snapshots include it.
- Files are in `server/data/snapshots` and `server/data/blobs`. Add `server/data/` to Hyper Backup.
- To restore, go to Grown-up menu → Settings → Home server backup → **Restore**.
- To lock the server, set `TOKEN=` in `docker-compose.yml`, then type the same word in the game's token box.

## Updating the game
`cd /volume1/docker/wordcraft && git pull`. `app/` is mounted live, so no restart is needed (restart the project only if `server/` changed). The iPad picks up the new version on its next launch, because `npm run release` gives sw.js a new version string each release.

To pull automatically, add a DSM Task Scheduler job (user: root, e.g. every 15 min): `cd /volume1/docker/wordcraft && git pull -q`.

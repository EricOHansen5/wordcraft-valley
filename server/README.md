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

## The listener
"Talk to me" (Grown-up menu → Settings) lets him answer out loud. At home the NAS does the listening: a second, optional container in `server/hear/` runs Whisper (faster-whisper, the `base.en` model, on the CPU). The game sends it a clip of 1 to 4 seconds with the two to four answers the question allows ("cat, cot, cap"), and gets back which one it heard and how sure it is. Nothing is stored: the clip is transcribed in memory and let go. Without the listener the game matches his voice on the iPad instead, so it is fine to leave it out.

- It needs about 500 MB of free memory and takes 1–3 seconds a clip on a Synology-class CPU (Intel or ARM, 64-bit).
- **The first start downloads the model, about 150 MB,** into `server/hear-cache` (git-ignored). Until it is there the game quietly matches on the iPad. Later starts load it from that folder in a few seconds.
- The backup server passes `POST /api/hear` to it (the same token as backups) and answers `GET /api/hear` with `{"ok":true}` once it is ready. A slow clip gives up after 10 seconds; the game then asks him to tap the answer instead.

### Adding it in Container Manager
The project was made by pasting a compose file, so the new service is pasted too:

1. Over SSH, fetch the new files and make the model folder:
   `cd /volume1/docker/wordcraft && git pull && mkdir -p server/hear-cache`
2. Container Manager → **Project** → select the Wordcraft project → **Action** → **Stop**.
3. Open the project's **YAML** (its settings; **Edit**), and replace it with the file below. Keep your own `TOKEN=` word if you set one.
4. **Save**, then **Build** (or **Action** → **Build**). The listener's image takes a few minutes to build the first time (about 570 MB).
5. When both containers show **Running**, open `https://<your game address>/api/hear` in a browser (add `?token=<your word>` if you set a token). It says `{"ok":true,...}` once the model has downloaded. The listener's log (Container Manager → Container → `wordcraft-hear` → Log) says `base.en ready`.

```yaml
services:
  wordcraft:
    build: /volume1/docker/wordcraft/server
    container_name: wordcraft
    restart: unless-stopped
    ports:
      - "8088:8080"
    environment:
      - TOKEN=
      - KEEP=60
      - HEAR_URL=http://hear:9000/hear
    volumes:
      - /volume1/docker/wordcraft/app:/app:ro
      - /volume1/docker/wordcraft/server/data:/data
  hear:
    build: /volume1/docker/wordcraft/server/hear
    container_name: wordcraft-hear
    restart: unless-stopped
    volumes:
      - /volume1/docker/wordcraft/server/hear-cache:/root/.cache
```

The listener has no port of its own on the network: only the backup server talks to it, by the name `hear`. To take it out again, delete the `hear:` block (and set `HEAR_URL=off`), then Build. After a `git pull` that changes `server/hear/`, Build again.

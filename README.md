# 🛡️ Vault Guardian

> **This is a fork.** Vault Guardian was created by **[avaler0](https://github.com/avaler0)**, and the original project lives at **[avaler0/vaultGuardian](https://github.com/avaler0/vaultGuardian)**. This fork, maintained by [Bardin08](https://github.com/Bardin08), adds the changes listed in [What this fork changes](#what-this-fork-changes). It is not affiliated with or endorsed by the original author. For the original game, issues about it, and its author's plans, go to the upstream repository.

A local-first, offline **prompt-injection game** in the style of [Lakera's Gandalf](https://gandalf.lakera.ai/baseline). A defender AI holds a secret password; you chat with it and try to trick it into leaking the password, then submit your guess to a server-side validator. Seven levels (L1–L7) of escalating defenses, all editable from an admin console.

All AI inference runs **locally, in-process, fully offline** through [QVAC](https://qvac.tether.io) (`@qvac/sdk`) on the [Bare](https://bare.pears.com) runtime. No cloud, no external API calls, no accounts, no telemetry. The default model fits in about 4 GB RAM.

> ⚠️ Educational sandbox — the "passwords" are game tokens, not real credentials.

## What this fork changes

Everything below the original release (`1b6b911`) was added in this fork:

- **Prompt budget per level.** Each level allows a set number of messages (12 by default, 0 for unlimited). A message stopped by a guard still counts; a model error gives it back. Guessing keeps working after the budget runs out, and only New game refills it.
- **New game.** Players can reset their own progress, budgets and conversations from the player screen.
- **Context trimming.** History sent to the model is trimmed by turns and estimated tokens, with both limits set per level, so long conversations no longer overflow the model context.
- **Conversation restored after a reload.** The page brings back the exchanges the player already saw, including which guard blocked a message.
- **Redesigned interface.** The player screen is now a vault door with one tumbler per level, and the operator console shares its design tokens. Fonts are self-hosted, so the game stays fully offline. See `DESIGN.md` and `PRODUCT.md`.
- **Markdown replies.** Guardian replies render emphasis, bold, paragraphs and lists. The output guard also checks each reply with the markdown markers removed, so formatting cannot hide a leaked password.
- **Less repetitive guardian.** Chat uses explicit sampling settings from the Qwen3 model card and a short style directive. The leak classifier runs with fixed, repeatable settings.
- **Level export.** The operator console exports one level, or all levels, as a markdown document describing the system prompt, every guard and what the server adds at runtime. The password is left out unless the operator chooses to include it.
- **Operational fixes.** Script and style URLs are versioned so browsers never mix old and new files after an update, and the layout no longer breaks when a browser extension injects elements into the page.
- **Tests.** A shared test harness with suites for every module (`npm test`).

## Requirements

- [Bare](https://bare.pears.com) runtime (`npm i -g bare`). The native QVAC modules are not compatible with the Node.js runtime.
- ~2.5 GB free disk for the default model (downloaded once on first real run).

## Quick start

```bash
npm install

# Dev mode — no model download, uses a deterministic fake model.
# Great for exercising the guard pipeline and UI instantly.
npm run dev

# Real mode — loads QWEN3_4B_INST_Q4_K_M locally via QVAC (downloads once).
npm start
```

Then open:

- **Player:** http://localhost:8787/
- **Admin:**  http://localhost:8787/admin  (set the admin passphrase on first visit)

### First run

The admin console has **no default passphrase**. The first time you open `/admin`
you'll be asked to create one (min 8 chars). You can also preset it with the
`ADMIN_PASSPHRASE` env var. Passphrases are stored as PBKDF2-SHA256 hashes
using 600,000 iterations; older 120,000-iteration hashes are upgraded after a
successful login.

## Configuration (env vars)

| Var | Default | Meaning |
|-----|---------|---------|
| `PORT` | `8787` | HTTP port |
| `HOST` | `127.0.0.1` | Bind address. Keep the loopback default unless you intentionally want LAN access. |
| `VAULT_DATA_DIR` | `./data` | Runtime state directory; useful for isolated tests or disposable runs. |
| `QVAC_MODEL` | `QWEN3_4B_INST_Q4_K_M` | QVAC model constant (a 4B-Q4 is the practical 4 GB ceiling; try `QWEN3_8B_INST_Q4_K_M` with ~8 GB RAM) |
| `QVAC_CTX` | `4096` | Context window (tokens) — keeps RAM in check |
| `QVAC_THINKING` | — | `1` = let Qwen3 reason in `<think>` blocks before answering (slower turns; reasoning is never shown to players) |
| `QVAC_MOCK` | — | `1` = use the built-in fake model (no download; dev only) |
| `FREE_ROAM` | — | `1` = all levels unlocked (default is unlock-on-solve) |
| `ADMIN_PASSPHRASE` | — | Preset the admin passphrase instead of first-run setup |

When binding `HOST` to a non-loopback address, `ADMIN_PASSPHRASE` is required
so another device cannot claim the first-run admin setup.

## How it works

### The security invariant

**The password never reaches the browser.** Both the chat and the guess
validation happen server-side. The client only ever receives (a) model output
*after* the output guard runs, and (b) a boolean from `/api/guess`. `GET
/api/state` returns public fields only. Guess submissions are rate-limited per
level to blunt brute-forcing.

### Guard pipeline (per chat turn)

Each send costs one prompt from the level's **prompt budget** (12 by default, `0` means unlimited, set per level in admin). When it runs out, chat stops on that level but guessing still works. A model error refunds the prompt. **New game** on the player screen clears the browser's progress, budgets and conversations.

Before the model runs, history is **trimmed** to the level's memory limits: at most `maxTurns` exchanges, and at most `maxContextTokens` estimated tokens (3 characters per token), never more than `QVAC_CTX` minus 512 for the reply.

1. **Input guard** — blocklist (substrings or `/regex/`) on the user message; trips → canned refusal, model skipped.
2. **Model completion** — system prompt + conversation, streamed from QVAC.
3. **Output guard** — blocks if the reply contains the password; optional **fuzzy** mode also catches `S P A C E D`, `l33t`, and reversed variants.
4. **Guard-model check** — optional 2nd-pass LLM classifier ("does this reply leak the secret? YES/NO").
5. Surviving reply is streamed/sent to the player.

The **win** is independent of chat: `/api/guess` compares your submission to the
password under the level's `submitValidation.mode` (`exact` | `case_insensitive`
| `trimmed` | `normalized`).

### Levels (shipped defaults)

| Level | Defense |
|-------|---------|
| L1 — The Open Door | Shares the password if asked (tutorial) |
| L2 — The Promise | Told not to reveal it (social-engineering intro) |
| L3 — The Sentry | Output "contains password" filter — the classic |
| L4 — The Gatekeeper | Input keyword guard + output filter |
| L5 — The Silent Order | Topic refusal + fuzzy output filter |
| L6 — The Inquisitor | All of the above + guard-model self-check |
| L7 — The Vault Itself | Everything on, harder rotated password (boss) |

Every field of every level is editable in the admin console; **reset-to-default**
restores the shipped presets.

## Admin console

- **Level CRUD** — edit every field, create, duplicate, reorder, delete, reset.
- **Export** — download or copy a level, or all levels, as a markdown account of the setup; the password is redacted unless included on purpose.
- **Test-attack panel** — paste a candidate prompt and watch each stage's verdict (input guard → raw model output → output guard → guard-model check). The core tuning tool.
- **Preview chat** — chat against any level as admin (bypasses the unlock gate).
- **Logs** — optional local-only attempt log with a clear button.

## Architecture

```
Browser (static SPA)  ──HTTP/SSE──▶  Bare backend process
  player + admin UI                    @qvac/sdk (model in-process)
                                       guard pipeline · level store (JSON)
                                       owns all secrets
```

- **Backend:** one Bare process (`src/server.js`) — serves static assets, the player API, and an auth-gated admin API; owns the model, guards, and passwords.
- **Persistence:** local JSON under `./data/` (levels, progress, auth hash). Local-only.
- **Model lifecycle:** loaded once on boot and kept warm; unloaded cleanly on `SIGINT`/`SIGTERM`.

### Files

```
src/
  server.js    HTTP router, SSE streaming, static serving, API
  qvac.js      QVAC model load/complete/unload (Bare plugin wiring) + dev mock
  guards.js    input / output / fuzzy / guard-model pipeline + guess validation
  context.js   history trimming by turns and estimated tokens
  play.js      prompt budget around a chat turn
  levels.js    L1–L7 presets, level normalization, the persisted store
  auth.js      admin passphrase (PBKDF2) + signed session tokens
  sessions.js  per-browser conversations, progress, prompt budgets, guess rate limiting
  store.js     atomic local JSON persistence
public/        player (index/app/style), operator console (admin.html/js/css), shared tokens.css, self-hosted fonts
```

## Notes on QVAC / Bare

Bare has no `process` global and does not auto-register SDK plugins, so
`src/qvac.js` installs `bare-process` globally and registers the llama.cpp
completion plugin explicitly before the first SDK call:

```js
import bareProcess from 'bare-process'
globalThis.process = bareProcess
const { plugins, QWEN3_4B_INST_Q4_K_M } = await import('@qvac/sdk')
const { llmPlugin } = await import('@qvac/sdk/llamacpp-completion/plugin.js')
const { loadModel, completion, unloadModel } = plugins([llmPlugin])
```

This follows the official `@qvac/sdk` Bare quickstart. For longer sessions you can
lower `QVAC_CTX` or enable TurboQuant KV-cache compression rather than raising the
RAM ceiling.

## Credits and license

Vault Guardian was designed and first released by [avaler0](https://github.com/avaler0) in [avaler0/vaultGuardian](https://github.com/avaler0/vaultGuardian). This fork keeps the original author's work and history and builds on it. The upstream repository has no LICENSE file; its `package.json` declares `"license": "ISC"`, and this fork keeps that declaration unchanged. Questions about licensing of the original code belong with the original author.

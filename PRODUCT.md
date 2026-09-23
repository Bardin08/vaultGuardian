# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Engineers and security-minded developers learning prompt injection hands-on: on their own laptop, in a team workshop or talk demo run by the operator, and at a conference showcase stand where passers-by take a short turn on a shared screen. Secondary user: the operator (admin), who tunes levels, guards and budgets from the admin console, often on the spot.

## Product Purpose
A local, offline prompt-injection game in the style of Lakera's Gandalf. A defender AI guards a password across seven levels of escalating defenses; the player chats to extract it and submits a guess to a server-side validator. Success: a player understands, by losing and then winning, why each defense layer exists and how it fails.

## Positioning
Runs entirely on-device through QVAC on the Bare runtime: no cloud, no accounts, no telemetry. The operator can see and edit every defense layer live, and the admin test-attack panel shows each stage's verdict for a single prompt.

## Operating Context
Solo play on a laptop; workshop or talk on a projector; conference stand where many short sessions happen on one machine and the operator resets between visitors. The model runs one completion at a time, so replies take seconds, not milliseconds.

## Capabilities and Constraints
- Seven shipped levels (L1–L7), all editable, creatable, duplicable and resettable in the admin console.
- Guard pipeline: input blocklist, model, output password filter (optional fuzzy), optional guard-model classifier.
- The password never reaches the browser.
- No build step: plain HTML, CSS and JavaScript served by the Bare server.
- Fully offline: no CDN fonts or assets; everything self-hosted under `public/`. CSP is `'self'` only.

## Brand Commitments
Name: Vault Guardian. Keep the wizard fantasy: each level is a theatrical guardian character (The Open Door, The Promise, The Sentry, The Gatekeeper, The Silent Order, The Inquisitor, The Vault Itself).

## Evidence on Hand
Level names, hints and guardian copy in `src/levels.js`. No logo, illustration or imagery exists; none may be fabricated as a real brand asset.

## Product Principles
1. The secret stays server-side; the interface never implies otherwise.
2. Every defense is legible: the player should feel which layer stopped them.
3. Short sessions must still land: a visitor at a stand gets the idea in one or two levels.
4. The operator is always one click from a clean slate.

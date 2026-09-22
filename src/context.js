// Decides which past exchanges the model still sees on a turn. Bare has no
// tokenizer we can call cheaply, so tokens are estimated on the high side.

export const DEFAULT_CTX_SIZE = 4096
export const REPLY_RESERVE_TOKENS = 512
const CHARS_PER_TOKEN = 3

export function estimateTokens (text) {
  return Math.ceil(String(text ?? '').length / CHARS_PER_TOKEN)
}

// Levels are always normalized upstream, so a missing limit here is a bug to
// surface, not to guess around: an undefined limit would otherwise turn
// trimming off silently via NaN comparisons.
function requireFiniteNumber (value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`trimHistory: ${name} must be a finite number, got ${value}`)
}

// history is [user, assistant, user, assistant, ...]; whole pairs are dropped,
// oldest first, until both the turn cap and the token limit hold.
export function trimHistory ({ systemPrompt, history, message, maxTurns, maxContextTokens, ctxSize = DEFAULT_CTX_SIZE, replyReserve = REPLY_RESERVE_TOKENS }) {
  requireFiniteNumber(maxTurns, 'maxTurns')
  requireFiniteNumber(maxContextTokens, 'maxContextTokens')
  requireFiniteNumber(ctxSize, 'ctxSize')
  requireFiniteNumber(replyReserve, 'replyReserve')
  const limit = Math.min(maxContextTokens, ctxSize - replyReserve)
  const pairs = []
  for (let i = 0; i + 1 < history.length; i += 2) pairs.push([history[i], history[i + 1]])

  const cost = ([user, assistant]) => estimateTokens(user.content) + estimateTokens(assistant.content)
  let total = estimateTokens(systemPrompt) + estimateTokens(message) + pairs.reduce((sum, pair) => sum + cost(pair), 0)
  let forgotten = 0
  while (pairs.length > 0 && (pairs.length > maxTurns || total > limit)) {
    total -= cost(pairs.shift())
    forgotten++
  }
  return { history: pairs.flat(), forgotten }
}

// Reads the model context size from the QVAC_CTX environment value. Anything
// that is not a positive whole number falls back to the default, loudly, so a
// typo cannot reach trimHistory as NaN.
export function parseCtxSize (raw, warn = console.warn) {
  if (raw === undefined || raw === '') return DEFAULT_CTX_SIZE
  const n = Number(raw)
  if (Number.isSafeInteger(n) && n > 0) return n
  warn(`QVAC_CTX must be a positive whole number, got ${JSON.stringify(raw)}; using ${DEFAULT_CTX_SIZE}`)
  return DEFAULT_CTX_SIZE
}

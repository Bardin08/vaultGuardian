// Player sessions: per-browser cookie, in-memory conversations, persisted
// solve progress, and a sliding-window rate limit for password guesses.
import crypto from 'bare-crypto'
import { readJSON, writeJSON } from './store.js'

const PROGRESS_FILE = 'progress.json'
// Trimming decides what the model sees; this only bounds memory use.
export const MAX_STORED_TURNS = 100

const sessions = new Map()
let progress = new Map()
const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function emptyProgress () {
  return { solved: [], promptsUsed: Object.create(null) }
}

// Accepts the current shape and the older { sid: [levelId, ...] } one.
export function initSessions () {
  const saved = readJSON(PROGRESS_FILE, {})
  progress = new Map()
  for (const [sid, value] of Object.entries(saved)) {
    if (!isValidSessionId(sid)) continue
    const record = emptyProgress()
    const rawSolved = Array.isArray(value) ? value : value?.solved
    record.solved = Array.isArray(rawSolved) ? rawSolved.filter(levelId => typeof levelId === 'string') : []
    const rawPromptsUsed = Array.isArray(value) ? {} : (value?.promptsUsed || {})
    for (const [levelId, used] of Object.entries(rawPromptsUsed)) {
      if (Number.isInteger(used) && used >= 0) record.promptsUsed[levelId] = used
    }
    progress.set(sid, record)
  }
}

function saveProgress () {
  writeJSON(PROGRESS_FILE, Object.fromEntries(progress))
}

function progressOf (sid) {
  if (!progress.has(sid)) progress.set(sid, emptyProgress())
  return progress.get(sid)
}

export function getSession (sid) {
  let s = sessions.get(sid)
  if (!s) {
    s = { conversations: new Map(), blocked: new Map(), guesses: new Map() }
    sessions.set(sid, s)
  }
  return s
}

export function newSessionId () {
  return crypto.randomUUID()
}

export function isValidSessionId (sid) {
  return typeof sid === 'string' && SESSION_ID_RE.test(sid)
}

export function conversation (sid, levelId) {
  const s = getSession(sid)
  if (!s.conversations.has(levelId)) s.conversations.set(levelId, [])
  return s.conversations.get(levelId)
}

// Where each exchange was blocked, one entry per exchange, kept beside the
// model history so that history stays { role, content } only.
function blockedList (sid, levelId) {
  const s = getSession(sid)
  if (!s.blocked.has(levelId)) s.blocked.set(levelId, [])
  return s.blocked.get(levelId)
}

export function pushTurn (sid, levelId, userMsg, assistantMsg, blockedAt = null) {
  const conv = conversation(sid, levelId)
  const blocked = blockedList(sid, levelId)
  conv.push({ role: 'user', content: userMsg }, { role: 'assistant', content: assistantMsg })
  blocked.push(blockedAt)
  while (conv.length > MAX_STORED_TURNS * 2) {
    conv.splice(0, 2)
    blocked.shift()
  }
}

// The exchanges as the player saw them.
export function storedTurns (sid, levelId) {
  const conv = conversation(sid, levelId)
  const blocked = blockedList(sid, levelId)
  const turns = []
  for (let i = 0; i + 1 < conv.length; i += 2) {
    turns.push({ you: conv[i].content, reply: conv[i + 1].content, blockedAt: blocked[i / 2] ?? null })
  }
  return turns
}

export function resetConversation (sid, levelId) {
  const s = getSession(sid)
  s.conversations.delete(levelId)
  s.blocked.delete(levelId)
}

export function solvedLevels (sid) {
  return new Set(progress.get(sid)?.solved || [])
}

export function markSolved (sid, levelId) {
  const record = progressOf(sid)
  if (!record.solved.includes(levelId)) record.solved.push(levelId)
  saveProgress()
}

// Returns remaining guesses in the current window, or -1 if rate limited.
export function checkGuessLimit (sid, levelId, perMinute) {
  const s = getSession(sid)
  const now = Date.now()
  let times = s.guesses.get(levelId) || []
  times = times.filter(t => now - t < 60000)
  if (times.length >= perMinute) {
    s.guesses.set(levelId, times)
    return -1
  }
  times.push(now)
  s.guesses.set(levelId, times)
  return perMinute - times.length
}

// null means the level has no budget (maxPrompts 0).
export function promptsLeft (sid, level) {
  const max = level.promptBudget?.maxPrompts || 0
  if (max === 0) return null
  const used = progress.get(sid)?.promptsUsed[level.id] || 0
  return Math.max(0, max - used)
}

// Changes a prompt count and persists it; if the save fails the count goes
// back to what it was, so memory never disagrees with what is on disk.
function adjustPromptsUsed (record, levelId, delta) {
  const before = record.promptsUsed[levelId] || 0
  record.promptsUsed[levelId] = before + delta
  try {
    saveProgress()
  } catch (err) {
    record.promptsUsed[levelId] = before
    throw err
  }
}

export function spendPrompt (sid, level) {
  const left = promptsLeft(sid, level)
  if (left === null) return true
  if (left === 0) return false
  adjustPromptsUsed(progressOf(sid), level.id, 1)
  return true
}

export function refundPrompt (sid, level) {
  const record = progress.get(sid)
  if (!record || !record.promptsUsed[level.id]) return
  adjustPromptsUsed(record, level.id, -1)
}

// New game: forget solves, budgets, conversations and guess windows.
export function resetGame (sid) {
  progress.delete(sid)
  sessions.delete(sid)
  saveProgress()
}

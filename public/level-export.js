// Builds a markdown account of how a level is defended: its secret, budget,
// system prompt, what the server adds on every turn, and each guard stage.
// Pure: no DOM, no fetch, so the admin console and the tests share it.

export const REDACTED = '••••••'

const PLACEHOLDERS = /(\{password\}|\{reply\})/
const REGEX_ENTRY = /^\/(.+)\/([a-z]*)$/
const MIN_FENCE = 3
const LEVEL_PREFIX = /^level\s*\d+\s*[^a-z0-9]*\s*/i
const QWEN3_PREFIX = 'QWEN3'
const VERDICT_WINDOW = 40
const MARKDOWN_MARKERS = '* _ ` ~'
const CLASSIFIER_SYSTEM = 'You are a strict security classifier. Answer with a single word: YES or NO.'

const ROMAN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]

const GUESS_MODES = {
  exact: 'exact: the guess must match character for character',
  trimmed: 'trimmed: surrounding spaces are ignored, case matters',
  case_insensitive: 'case-insensitive: surrounding spaces and letter case are ignored',
  normalized: 'normalized: only letters and digits count, case ignored'
}

function roman (n) {
  let out = ''
  for (const [value, numeral] of ROMAN) {
    while (n >= value) { out += numeral; n -= value }
  }
  return out
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Replaces every case-insensitive occurrence of the password, leaving the
// {password} and {reply} placeholders exactly as written.
function redactor (password, includePassword) {
  if (includePassword || !password) return (text) => String(text ?? '')
  const pattern = new RegExp(escapeRegExp(password), 'gi')
  return (text) => String(text ?? '')
    .split(PLACEHOLDERS)
    .map(part => PLACEHOLDERS.test(part) ? part : part.replace(pattern, REDACTED))
    .join('')
}

function longestRun (text, char) {
  let longest = 0
  let current = 0
  for (const c of text) {
    current = c === char ? current + 1 : 0
    if (current > longest) longest = current
  }
  return longest
}

function fenced (text) {
  const fence = '`'.repeat(Math.max(MIN_FENCE, longestRun(text, '`') + 1))
  return `${fence}\n${text}\n${fence}`
}

function code (text) {
  const ticks = '`'.repeat(longestRun(text, '`') + 1)
  const pad = text.startsWith('`') || text.endsWith('`') ? ' ' : ''
  return `${ticks}${pad}${text}${pad}${ticks}`
}

function quoted (text) {
  return text.split('\n').map(line => `> ${line}`).join('\n')
}

const pairs = (sampling) => Object.entries(sampling || {}).map(([k, v]) => code(`${k}: ${v}`)).join(', ')
const onOff = (on) => on ? 'ON' : 'OFF'

// GitHub's heading anchor: lowercase, punctuation dropped, spaces to hyphens.
function anchor (heading) {
  return heading.toLowerCase().replace(/[^\p{L}\p{N} _-]/gu, '').replace(/ /g, '-')
}

function slug (text) {
  return String(text ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function header (level, redact, { position, total, edited }, h) {
  const lines = [`${h} ${redact(level.name)}`, '', `Level id: ${code(level.id)}`]
  if (position && total) lines.push(`Position: Tumbler ${roman(position)} of ${roman(total)}`)
  lines.push(`Player hint: ${level.hint ? redact(level.hint) : '(none)'}`)
  if (edited) lines.push('', '> This export reflects unsaved changes in the editor, not the saved level.')
  return lines
}

function secret (level, redact, includePassword, h) {
  const shown = !level.password ? '(not set)' : includePassword ? code(level.password) : REDACTED
  const mode = level.submitValidation.mode
  return [
    `${h}# Secret`, '',
    `- Password: ${shown}`,
    `- Guess check: ${GUESS_MODES[mode] || code(mode)}`,
    `- Guesses per minute: ${level.submitValidation.maxGuessesPerMinute}`
  ]
}

function budget (level, h) {
  const max = level.promptBudget.maxPrompts
  return [
    `${h}# Budget and memory`, '',
    `- Maximum prompts: ${max === 0 ? 'unlimited' : max}`,
    `- Turns remembered: ${level.memory.maxTurns} (older exchanges are dropped, oldest first)`,
    `- Maximum context tokens: ${level.memory.maxContextTokens} (the server also caps this below the model's context size, keeping room for the reply)`
  ]
}

function thinkingLine (runtime) {
  if (runtime.thinking) return 'Thinking is on: `/no_think` is not added, and any reasoning is captured and never shown to the player.'
  if (!String(runtime.model || '').startsWith(QWEN3_PREFIX)) return 'Thinking switch: not added, the model is not a Qwen3 model.'
  return '`/no_think` is appended to the system prompt, so the model answers without reasoning first.'
}

function model (level, redact, runtime, h) {
  const lines = [`${h}# The model`, '', 'System prompt, as the level stores it:', '', fenced(redact(level.systemPrompt)), '']
  if (!runtime) return [...lines, 'What the server adds on every turn is not available in this export.']
  return [
    ...lines,
    'What the server adds on every turn:', '',
    '- Style directive, appended to the system prompt:', '',
    quoted(runtime.styleDirective).replace(/^/gm, '  '), '',
    `- ${thinkingLine(runtime)}`,
    `- Chat sampling: ${pairs(runtime.chatSampling)}`,
    `- Context size: ${runtime.ctxSize} tokens`,
    `- Model: ${code(String(runtime.model))}`
  ]
}

function inputGuard (level, redact, h) {
  const g = level.inputGuard
  const lines = [`${h}## Input guard: ${onOff(g.enabled)}`, '']
  if (!g.enabled) return [...lines, "The player's message goes to the model unchecked."]
  const rules = g.blocklist.filter(e => REGEX_ENTRY.test(e))
  const phrases = g.blocklist.filter(e => !REGEX_ENTRY.test(e))
  const list = (entries) => entries.length ? entries.map(e => `- ${code(redact(e))}`) : ['- (none)']
  return [
    ...lines,
    "Checks the player's message before the model sees it. A message is refused if it contains any phrase below, ignoring case, or matches any rule. Rules always ignore case; a rule that does not compile never matches.", '',
    'Blocked phrases:', '', ...list(phrases), '',
    'Regex rules:', '', ...list(rules), '',
    'Block message:', '', quoted(redact(g.onBlock))
  ]
}

function outputGuard (level, redact, h) {
  const g = level.outputGuard
  const lines = [`${h}## Output guard: ${onOff(g.enabled)}`, '']
  if (!g.enabled) return [...lines, 'Replies are not checked for the password.']
  if (!g.blockIfContainsPassword) return [...lines, 'Password matching is off, so no reply is blocked at this stage.']
  const fuzzy = g.fuzzy
    ? [
        '- Fuzzy, spacing and punctuation: the password spelled out with anything between its letters',
        '- Fuzzy, leetspeak: digits and symbols read back as letters (0 as o, 4 as a, @ as a, and so on)',
        '- Fuzzy, reversed: the password written backwards'
      ]
    : ['- Fuzzy matching: OFF']
  return [
    ...lines,
    'Checks the whole reply before the player sees it; a match replaces the reply with the block message. Replies are not streamed while this stage is on.', '',
    '- Exact match: the password anywhere in the reply, ignoring case',
    `- Formatting removed: the same, after the markdown markers ${MARKDOWN_MARKERS} are stripped`,
    ...fuzzy, '',
    'Block message:', '', quoted(redact(g.onBlock))
  ]
}

function guardModel (level, redact, runtime, h) {
  const g = level.guardModelCheck
  const lines = [`${h}## Guard-model check: ${onOff(g.enabled)}`, '']
  if (!g.enabled) return [...lines, 'No second reading of the reply.']
  const sampling = runtime ? [`Classifier sampling (fixed, same verdict for the same reply): ${pairs(runtime.classifierSampling)}`, ''] : []
  return [
    ...lines,
    `The same model reads the reply again, markdown markers removed, and answers YES or NO. A verdict with YES in its first ${VERDICT_WINDOW} characters blocks the reply with the output guard's block message. Replies are not streamed while this stage is on.`, '',
    'Classifier system message:', '', fenced(CLASSIFIER_SYSTEM), '',
    'Classifier prompt:', '', fenced(redact(g.prompt)), '',
    'The server fills `{password}` with the password and `{reply}` with the reply before asking.', '',
    ...sampling,
    'Block message:', '', quoted(redact(level.outputGuard.onBlock))
  ]
}

function pipeline (level, redact, runtime, h) {
  return [
    `${h}# Defence pipeline`, '',
    'Each turn runs these stages in order; the model answers between the input guard and the output guard.', '',
    ...inputGuard(level, redact, h), '',
    ...outputGuard(level, redact, h), '',
    ...guardModel(level, redact, runtime, h)
  ]
}

function footer ({ generatedAt, runtime, includePassword }) {
  return [
    '---', '',
    `Generated ${generatedAt.toISOString().replace('T', ' ').slice(0, 16)} UTC. Model: ${runtime ? code(String(runtime.model)) : 'unknown'}. ${includePassword ? 'The password is included.' : `The password is redacted as ${REDACTED}.`}`
  ]
}

function levelBody (level, { includePassword, position, total, runtime, edited }, h) {
  const redact = redactor(level.password, includePassword)
  return [
    ...header(level, redact, { position, total, edited }, h), '',
    ...secret(level, redact, includePassword, h), '',
    ...budget(level, h), '',
    ...model(level, redact, runtime, h), '',
    ...pipeline(level, redact, runtime, h)
  ]
}

export function levelToMarkdown (level, {
  includePassword = false,
  position,
  total,
  runtime,
  generatedAt = new Date(),
  edited = false
} = {}) {
  return [
    ...levelBody(level, { includePassword, position, total, runtime, edited }, '#'), '',
    ...footer({ generatedAt, runtime, includePassword })
  ].join('\n') + '\n'
}

export function levelsToMarkdown (levels, { includePassword = false, runtime, generatedAt = new Date() } = {}) {
  const ordered = [...levels].sort((a, b) => a.order - b.order)
  const total = ordered.length
  const seen = new Map()
  const contents = ordered.map(level => {
    const name = redactor(level.password, includePassword)(level.name)
    const base = anchor(name)
    const count = seen.get(base) || 0
    seen.set(base, count + 1)
    return `${ordered.indexOf(level) + 1}. [${name}](#${count ? `${base}-${count}` : base})`
  })
  const bodies = ordered.flatMap((level, i) => [
    ...levelBody(level, { includePassword, position: i + 1, total, runtime }, '##'), ''
  ])
  return [
    '# Vault Guardian levels', '',
    ...contents, '',
    ...bodies,
    ...footer({ generatedAt, runtime, includePassword })
  ].join('\n') + '\n'
}

export function exportFileName (level) {
  const id = slug(level.id) || 'level'
  const name = slug(String(level.name ?? '').replace(LEVEL_PREFIX, ''))
  return `vault-guardian-${name ? `${id}-${name}` : id}.md`
}

export function allLevelsFileName (date) {
  return `vault-guardian-levels-${date.toISOString().slice(0, 10)}.md`
}

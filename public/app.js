// Player screen: the vault door. Talks only to the public API; the password
// never reaches this file.
import { renderMarkdown } from '/markdown.js'

const $ = (id) => document.getElementById(id)
const SVG_NS = 'http://www.w3.org/2000/svg'

const DOOR_RADIUS = 305
const HUB_RADIUS = 106
const RING_GAP = 4
// A door with few tumblers keeps them at this width and shows the plate around them.
const MAX_BAND = 46
const GAP_TO_BAND = 0.2
const NOTCH_WIDTH = 8
const NOTCH_INSET = 2
const ALIGNED_ANGLE = -90
const LOOSE_ANGLE_START = 60
const LOOSE_ANGLE_SPAN = 180
const FNV_OFFSET = 2166136261
const FNV_PRIME = 16777619
const MIX_A = 0x85ebca6b
const MIX_B = 0xc2b2ae35
const MAX_LABEL_SIZE = 16
const MIN_LABEL_SIZE = 11
const LABEL_TO_BAND = 0.6
const NUMERAL_TO_BAND = 0.8
// Below this a numeral is noise: the ring goes unlabelled and the hall kicker names the tumbler.
const MIN_NUMERAL_SIZE = 8
// A label keeps clear of the notches: it may span this many degrees either side of twelve o'clock.
const LABEL_HALF_SPAN_DEG = LOOSE_ANGLE_START - 15
const GUESS_WINDOW_MS = 60000
const MAX_PIPS = 24
const WRONG_SHAKE_MS = 400
const TUMBLER_TURN_MS = 1200
const EVENT_PREFIX = 'event: '
const DATA_PREFIX = 'data: '
const NO_ANSWER = 'The door did not answer. Try again.'
// The server refunds the prompt whenever the model fails, before or during the reply.
const MODEL_FAILED = 'The guardian lost his words. Your breath was returned.'
const MODEL_FAILED_STATUS = 500
// Desktop layout, the small-door range where the password field leaves the hub for the hall,
// and phones, which also show the field below the conversation.
// These breakpoints also live in public/style.css; change both together.
const DESKTOP_QUERY = '(min-width: 901px)'
const PHONE_QUERY = '(max-width: 900px)'
const SMALL_DOOR_QUERY = `${DESKTOP_QUERY} and ((width < 1219px) or (height < 656px))`
const FIELD_BELOW_HALL_QUERY = `${PHONE_QUERY}, ${SMALL_DOOR_QUERY}`

const WARD_LABELS = {
  input: 'Word ward on your tongue',
  output: 'Seal on his lips',
  fuzzy: 'Keen seal on his lips',
  guardModel: 'A second mind reads every reply'
}
const BLOCK_LABELS = {
  input: 'Stopped at the word ward · he never heard you',
  output: 'Caught by the seal on his lips',
  guardModel: 'The second mind struck this reply'
}

let state = { levels: [], model: {} }
let current = null
let busy = false
// Set while a reopened level's conversation is on its way, so nothing new lands before the old turns.
let restoring = false
let selectSeq = 0
const forgottenSeen = new Map()
const guessWindows = new Map()
const rings = new Map()

// ---- helpers ----
async function api (path, opts) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts })
  const body = await res.json().catch(() => ({}))
  return { status: res.status, ...body }
}

function roman (n) {
  const table = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
  let out = ''
  for (const [value, glyph] of table) while (n >= value) { out += glyph; n -= value }
  return out
}

function guardianName (level) {
  return level.name.replace(/^Level\s+\d+\s*[—–-]\s*/i, '')
}

function shortName (level) {
  return guardianName(level).replace(/^The\s+/i, '')
}

function firstWord (level) {
  return shortName(level).split(/\s+/)[0]
}

function looseAngle (id) {
  // FNV-1a with a murmur3 finish, so ids that differ only in their last character still land far apart.
  let hash = FNV_OFFSET
  for (const ch of id) hash = Math.imul(hash ^ ch.charCodeAt(0), FNV_PRIME)
  hash = Math.imul(hash ^ (hash >>> 16), MIX_A)
  hash = Math.imul(hash ^ (hash >>> 13), MIX_B)
  hash = (hash ^ (hash >>> 16)) >>> 0
  return LOOSE_ANGLE_START + hash % LOOSE_ANGLE_SPAN
}

function svg (tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  return el
}

function levelIndex (id) { return state.levels.findIndex(l => l.id === id) }
function levelById (id) { return state.levels.find(l => l.id === id) }

function ringStatus (level) {
  if (level.solved) return 'solved'
  if (level.id === current) return 'live'
  return level.unlocked ? 'open' : 'locked'
}

function statusWord (status) {
  return { live: 'current', solved: 'turned', open: 'open', locked: 'sealed' }[status]
}

// ---- the door ----
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

function doorGeometry (count) {
  const band = count ? Math.min(MAX_BAND, (DOOR_RADIUS - HUB_RADIUS) / count) : 0
  const gap = Math.min(RING_GAP, band * GAP_TO_BAND)
  const width = band - gap
  const labelSize = Math.min(MAX_LABEL_SIZE, width * LABEL_TO_BAND)
  const thin = labelSize < MIN_LABEL_SIZE
  const fontSize = thin ? Math.min(MAX_LABEL_SIZE, width * NUMERAL_TO_BAND) : labelSize
  return { band, gap, width, thin, fontSize, unlabelled: fontSize < MIN_NUMERAL_SIZE, outer: HUB_RADIUS + band * count }
}

function buildDoor () {
  const door = $('door')
  door.replaceChildren()
  rings.clear()
  const { band, gap, width, thin, fontSize, unlabelled, outer } = doorGeometry(state.levels.length)
  if (outer < DOOR_RADIUS) door.appendChild(svg('circle', { class: 'plate', r: DOOR_RADIUS }))
  door.appendChild(svg('circle', { class: 'hub', r: HUB_RADIUS - gap / 2 }))
  state.levels.forEach((level, i) => {
    const radius = outer - band * (i + 0.5)
    const g = svg('g', { class: 'ring' })
    g.appendChild(svg('circle', { class: 'band', r: radius, 'stroke-width': width }))
    const arcId = `arc-${i}`
    g.appendChild(svg('path', { id: arcId, d: `M ${-radius} 0 A ${radius} ${radius} 0 0 1 ${radius} 0`, fill: 'none' }))
    const label = svg('text', { class: 'label', 'font-size': fontSize, 'dominant-baseline': 'central', 'aria-hidden': 'true' })
    if (unlabelled) label.setAttribute('display', 'none')
    const path = svg('textPath', { href: `#${arcId}`, startOffset: '50%', 'text-anchor': 'middle' })
    label.appendChild(path)
    g.appendChild(label)
    const inset = Math.min(NOTCH_INSET, width / 4)
    const turn = svg('g', { class: 'notch-turn' })
    turn.appendChild(svg('rect', { class: 'notch', x: -NOTCH_WIDTH / 2, y: -radius - width / 2 + inset, width: NOTCH_WIDTH, height: width - inset * 2 }))
    g.appendChild(turn)
    g.addEventListener('click', () => { if (levelById(level.id)?.unlocked) selectLevel(level.id) })
    g.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && levelById(level.id)?.unlocked) { e.preventDefault(); selectLevel(level.id) }
    })
    door.appendChild(g)
    rings.set(level.id, { g, label, path, turn, radius, thin, angle: null })
  })
}

// The longest form of the label that fits its arc: full name, numeral and first word, numeral.
function fitLabel (ring, level, i) {
  const numeral = roman(i + 1)
  if (ring.thin || !level.unlocked) return numeral
  const room = ring.radius * 2 * LABEL_HALF_SPAN_DEG * Math.PI / 180
  const candidates = [`${numeral} · ${shortName(level)}`, `${numeral} · ${firstWord(level)}`]
  for (const text of candidates) {
    ring.path.textContent = text
    const glyphs = ring.label.getComputedTextLength()
    // getComputedTextLength leaves out letter-spacing, which the engraved caps carry on every glyph.
    const tracking = (parseFloat(getComputedStyle(ring.label).letterSpacing) || 0) * ring.label.getNumberOfChars()
    if (glyphs === 0 || glyphs + tracking <= room) return text
  }
  return numeral
}

// Rotating in SVG user space keeps the turn about the door centre (0,0) whatever the viewBox origin.
function turnNotch (ring, angle) {
  if (ring.angle === angle) return
  const from = ring.angle
  ring.angle = angle
  ring.turn.setAttribute('transform', `rotate(${angle})`)
  if (from === null || reduceMotion.matches) return
  const start = performance.now()
  const ease = (t) => 1 - Math.pow(1 - t, 3)
  const step = (now) => {
    if (ring.angle !== angle) return
    const t = Math.min(1, (now - start) / TUMBLER_TURN_MS)
    ring.turn.setAttribute('transform', `rotate(${from + (angle - from) * ease(t)})`)
    if (t < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

function renderDoor () {
  const ids = state.levels.map(l => l.id).join('|')
  if ($('door').dataset.ids !== ids) {
    buildDoor()
    $('door').dataset.ids = ids
  }
  const total = roman(state.levels.length)
  state.levels.forEach((level, i) => {
    const ring = rings.get(level.id)
    const { g, path } = ring
    const status = ringStatus(level)
    g.setAttribute('class', `ring ring--${status}`)
    path.textContent = fitLabel(ring, level, i)
    turnNotch(ring, level.solved ? ALIGNED_ANGLE : looseAngle(level.id))
    if (level.unlocked) {
      g.setAttribute('role', 'button')
      g.setAttribute('tabindex', '0')
    } else {
      g.setAttribute('role', 'img')
      g.removeAttribute('tabindex')
    }
    g.setAttribute('aria-label', `Tumbler ${roman(i + 1)} of ${total}, ${guardianName(level)}, ${statusWord(status)}`)
  })
  renderStrip()
  renderLegend()
}

function renderStrip () {
  const strip = $('strip')
  strip.replaceChildren()
  state.levels.forEach((level, i) => {
    const status = ringStatus(level)
    const li = document.createElement('li')
    li.className = `is-${status}`
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = roman(i + 1)
    b.disabled = !level.unlocked
    b.setAttribute('aria-label', `${guardianName(level)}, ${statusWord(status)}`)
    if (level.id === current) b.setAttribute('aria-current', 'step')
    b.onclick = () => selectLevel(level.id)
    li.appendChild(b)
    strip.appendChild(li)
  })
}

function renderLegend () {
  const legend = $('legend')
  const solved = state.levels.filter(l => l.solved).length
  const count = state.levels.length
  const last = state.levels[count - 1]
  const model = state.model || {}
  const modelLine = model.mock ? 'Mock model · dev only' : `Offline · ${model.model || 'local model'}`
  legend.innerHTML = ''
  if (!count) {
    legend.append('No tumblers yet', document.createElement('br'), modelLine)
    return
  }
  const lastLine = solved === count ? 'The vault stands open.' : `${roman(count)} · ${guardianName(last)} sleeps`
  const b = document.createElement('b')
  b.textContent = `${solved} of ${count}`
  legend.append(b, ' tumblers turned', document.createElement('br'), lastLine, document.createElement('br'), modelLine)
}

// ---- the hall ----
function renderHall () {
  const level = levelById(current)
  $('newGameBtn').disabled = !state.levels.length
  if (!level) {
    if (!state.levels.length) renderEmptyVault()
    return
  }
  const i = levelIndex(current)
  $('kicker').textContent = `Tumbler ${roman(i + 1)} of ${roman(state.levels.length)}`
  $('guardian').textContent = guardianName(level)
  const wards = []
  if (level.wards.input) wards.push(WARD_LABELS.input)
  if (level.wards.output) wards.push(level.wards.fuzzy ? WARD_LABELS.fuzzy : WARD_LABELS.output)
  if (level.wards.guardModel) wards.push(WARD_LABELS.guardModel)
  $('wards').replaceChildren(...(wards.length ? wards : ['No wards. Just ask.']).map(text => {
    const li = document.createElement('li')
    li.textContent = text
    return li
  }))
  $('hint').textContent = level.hint || ''
  renderBudget(level)
}

function renderEmptyVault () {
  $('kicker').textContent = ''
  $('guardian').textContent = 'The vault is empty'
  $('wards').replaceChildren()
  $('hint').textContent = ''
  $('budget').hidden = true
  $('guessStatus').textContent = ''
  $('log').replaceChildren()
  addNote('No tumblers are set in this door. An operator can add a level from the Operator console.')
  setComposer()
}

function guessStatusLine (count) {
  return `${count} ${count === 1 ? 'guess' : 'guesses'} left this minute`
}

function guessesLeft (level) {
  const seen = guessWindows.get(level.id)
  return seen && Date.now() - seen.at < GUESS_WINDOW_MS ? seen.remaining : level.guessesPerMinute
}

function renderBudget (level) {
  const row = $('budget')
  if (level.maxPrompts === null) {
    row.hidden = true
  } else {
    row.hidden = false
    const pips = $('pips')
    pips.replaceChildren()
    if (level.maxPrompts <= MAX_PIPS) {
      for (let i = 0; i < level.maxPrompts; i++) {
        const pip = document.createElement('i')
        if (i < level.promptsLeft) pip.className = 'is-full'
        pips.appendChild(pip)
      }
    }
    $('budgetCount').textContent = `${level.promptsLeft} of ${level.maxPrompts}`
  }
  setComposer()
}

function setComposer () {
  const level = levelById(current)
  const spent = level && level.promptsLeft === 0
  const input = $('chatInput')
  input.disabled = !level || busy || restoring || spent
  $('sendBtn').disabled = input.disabled
  $('forgetBtn').disabled = !level || busy || restoring
  $('guessInput').disabled = !level
  $('guessBtn').disabled = !level
  input.placeholder = spent
    ? 'Your breaths are spent. Speak the word, or seal the vault and begin again.'
    : level ? `Speak to ${guardianName(level)}…` : ''
}

// Guardian replies are markdown rendered into a div.reply; the player's own words stay plain text.
function addTurn (kind, who, text) {
  const el = document.createElement('div')
  el.className = `turn turn--${kind}`
  const label = document.createElement('div')
  label.className = 'who'
  label.textContent = who
  const guardian = kind.split(' ').includes('guardian')
  const body = document.createElement(guardian ? 'div' : 'p')
  if (guardian) {
    body.className = 'reply'
    body.innerHTML = renderMarkdown(text)
  } else {
    body.textContent = text
  }
  el.append(label, body)
  $('log').appendChild(el)
  el.scrollIntoView({ block: 'end' })
  return { el, label, body }
}

function markBlocked (turn, blockedAt) {
  turn.el.classList.add('turn--blocked')
  turn.label.textContent = BLOCK_LABELS[blockedAt] || 'A ward stopped this'
}

function addNote (text) {
  const p = document.createElement('p')
  p.className = 'note'
  p.textContent = text
  $('log').appendChild(p)
  p.scrollIntoView({ block: 'end' })
}

// ---- actions ----
async function refreshState () {
  const previous = current
  const r = await api('/api/state')
  state = { levels: r.levels || [], model: r.model || {} }
  if (!levelById(current)?.unlocked) current = state.levels.find(l => l.unlocked && !l.solved)?.id || state.levels[0]?.id || null
  renderDoor()
  renderHall()
  if (previous !== null && current && current !== previous) selectLevel(current, { force: true })
}

// The server keeps every exchange a player saw; a 404 means a server without the endpoint, so nothing to restore.
async function fetchConversation (id) {
  const r = await api(`/api/conversation?levelId=${encodeURIComponent(id)}`)
  if (r.status === 404) return { turns: [], forgotten: 0 }
  if (r.status !== 200) throw new Error(`conversation ${r.status}`)
  return { turns: r.turns || [], forgotten: r.forgotten || 0 }
}

function restoreTurns (level, turns) {
  for (const turn of turns) {
    addTurn('you', 'You', turn.you)
    const reply = addTurn('guardian', guardianName(level), turn.reply || '…')
    if (turn.blockedAt) markBlocked(reply, turn.blockedAt)
  }
}

async function selectLevel (id, { force = false } = {}) {
  const level = levelById(id)
  if (!level?.unlocked) return
  if (id === current && !force) return
  current = id
  const seq = ++selectSeq
  $('log').replaceChildren()
  forgottenSeen.set(id, 0)
  restoring = true
  renderDoor()
  renderHall()
  $('guessStatus').textContent = guessStatusLine(guessesLeft(level))
  let conversation = null
  try {
    conversation = await fetchConversation(id)
  } catch {}
  // The player moved on, or picked this level again, while the answer was on its way.
  if (seq !== selectSeq || current !== id) return
  restoring = false
  if (conversation) {
    restoreTurns(level, conversation.turns)
    forgottenSeen.set(id, conversation.forgotten)
  } else {
    addNote(NO_ANSWER)
  }
  addNote(`You stand before ${guardianName(level)}. Talk the word out of the guardian, then speak it into the door.`)
  if (level.solved) addNote('This tumbler has already turned.')
  setComposer()
  // A player who started typing the word while the turns loaded keeps the field.
  if (!$('guessForm').contains(document.activeElement)) $('chatInput').focus()
}

async function send (event) {
  event.preventDefault()
  const input = $('chatInput')
  const message = input.value.trim()
  const level = levelById(current)
  if (!message || !level || busy || restoring) return
  busy = true
  input.value = ''
  setComposer()
  $('log').setAttribute('aria-busy', 'true')
  addTurn('you', 'You', message)
  const reply = addTurn('guardian turn--pending', guardianName(level), '')
  let text = ''
  let done = null
  let failed = null
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ levelId: current, message })
    })
    if (res.status === 403) {
      const body = await res.json().catch(() => ({}))
      failed = body.error === 'prompt budget exhausted' ? 'Your breaths are spent on this tumbler.' : 'This tumbler is still sealed.'
    } else if (res.status === MODEL_FAILED_STATUS) {
      failed = MODEL_FAILED
    } else if (!res.ok) {
      failed = NO_ANSWER
    } else {
      await readSSE(res, (ev, data) => {
        if (ev === 'token') { text += data.token; reply.body.innerHTML = renderMarkdown(text) }
        else if (ev === 'message') { text = data.text; reply.body.innerHTML = renderMarkdown(text) }
        else if (ev === 'done') done = data
        else if (ev === 'error') failed = MODEL_FAILED
      })
    }
  } catch {
    failed = 'The connection to the door was lost.'
  }
  reply.el.classList.remove('turn--pending')
  if (failed) {
    reply.el.remove()
    addNote(failed)
  } else {
    reply.body.innerHTML = renderMarkdown(text || '…')
    if (done?.blockedAt) markBlocked(reply, done.blockedAt)
    if (done?.forgotten > (forgottenSeen.get(current) || 0)) {
      forgottenSeen.set(current, done.forgotten)
      addNote(`The guardian has forgotten your first ${done.forgotten} ${done.forgotten === 1 ? 'exchange' : 'exchanges'}.`)
    }
  }
  $('log').removeAttribute('aria-busy')
  busy = false
  try {
    await refreshState()
  } catch {
    setComposer()
    addNote(NO_ANSWER)
  }
  $('chatInput').focus()
}

async function guess (event) {
  event.preventDefault()
  const input = $('guessInput')
  const word = input.value.trim()
  const level = levelById(current)
  if (!word || !level) return
  $('guessBtn').disabled = true
  let r
  try {
    r = await api('/api/guess', { method: 'POST', body: JSON.stringify({ levelId: current, guess: word }) })
  } catch {
    $('guessStatus').textContent = NO_ANSWER
    return
  } finally {
    $('guessBtn').disabled = false
  }
  if (r.status === 200 && r.correct) {
    input.value = ''
    $('guessStatus').textContent = 'The tumbler turns.'
    addNote(`${guardianName(level)} yields. The tumbler turns.`)
    try {
      await refreshState()
    } catch {
      addNote(NO_ANSWER)
      return
    }
    const next = state.levels[levelIndex(level.id) + 1]
    if (next?.unlocked) {
      addNote(`Tumbler ${roman(levelIndex(next.id) + 1)} is open: ${guardianName(next)} waits.`)
      setTimeout(() => { if (current === level.id && !busy) selectLevel(next.id) }, TUMBLER_TURN_MS)
    }
  } else if (r.status === 429) {
    guessWindows.set(level.id, { remaining: 0, at: Date.now() })
    $('guessStatus').textContent = 'The door is cooling. Wait a minute.'
  } else if (r.status !== 200) {
    $('guessStatus').textContent = NO_ANSWER
  } else {
    guessWindows.set(level.id, { remaining: r.remaining, at: Date.now() })
    $('guessStatus').textContent = `Not the word · ${r.remaining} left this minute`
    const form = $('guessForm')
    form.classList.add('is-wrong')
    setTimeout(() => form.classList.remove('is-wrong'), WRONG_SHAKE_MS)
  }
}

async function forget () {
  const id = current
  if (!id) return
  const r = await api('/api/reset', { method: 'POST', body: JSON.stringify({ levelId: id }) }).catch(() => ({ status: 0 }))
  // The player opened another level while the reset was on its way; its log is not this one.
  if (current !== id) return
  if (r.status !== 200) {
    addNote(NO_ANSWER)
    return
  }
  $('log').replaceChildren()
  forgottenSeen.set(id, 0)
  addNote('The guardian has forgotten this conversation. Spent breaths stay spent.')
}

async function newGame () {
  if (!confirm('Seal the vault and start a new game? Every tumbler resets and your breaths refill.')) return
  const r = await api('/api/game/reset', { method: 'POST' }).catch(() => ({ status: 0 }))
  if (r.status !== 200) {
    addNote(NO_ANSWER)
    return
  }
  current = null
  forgottenSeen.clear()
  await refreshState()
  selectLevel(current, { force: true })
}

// Minimal SSE reader over fetch's streaming body.
async function readSSE (res, onEvent) {
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let idx
    while ((idx = buf.indexOf('\n\n')) !== -1) {
      const chunk = buf.slice(0, idx)
      buf = buf.slice(idx + 2)
      let ev = 'message'
      let data = ''
      for (const line of chunk.split('\n')) {
        if (line.startsWith(EVENT_PREFIX)) ev = line.slice(EVENT_PREFIX.length)
        else if (line.startsWith(DATA_PREFIX)) data += line.slice(DATA_PREFIX.length)
      }
      try { onEvent(ev, data ? JSON.parse(data) : {}) } catch {}
    }
  }
}

$('composer').addEventListener('submit', send)
$('guessForm').addEventListener('submit', guess)
$('forgetBtn').onclick = forget
$('newGameBtn').onclick = newGame
// Label fitting measures rendered text: redo it once the faces load and when the door reappears.
document.fonts?.ready.then(() => { if (state.levels.length) renderDoor() })
window.matchMedia(DESKTOP_QUERY).addEventListener('change', (e) => { if (e.matches && state.levels.length) renderDoor() })

// On a small desktop door the password field sits in the hall with its label
// hidden, so the placeholder names it; in the hub the visible label does.
const movedGuessField = window.matchMedia(SMALL_DOOR_QUERY)
const guessFieldBelowHall = window.matchMedia(FIELD_BELOW_HALL_QUERY)
const HUB_GUESS_PLACEHOLDER = $('guessInput').placeholder
const MOVED_GUESS_PLACEHOLDER = 'Speak the word…'
// Wherever the field shows below the conversation (phones, small desktop door) it follows the hall
// in the DOM too, so reading and tab order match what is on screen.
// Moving a focused element drops its focus, so the move waits until focus leaves the form.
const placeGuessField = () => {
  const form = $('guessForm')
  const moved = movedGuessField.matches
  $('guessInput').placeholder = moved ? MOVED_GUESS_PLACEHOLDER : HUB_GUESS_PLACEHOLDER
  form.querySelector('label').classList.toggle('sr-only', moved)
  if (form.contains(document.activeElement)) return
  const anchor = document.querySelector(guessFieldBelowHall.matches ? 'main.hall' : '.door')
  if (anchor.nextElementSibling !== form) anchor.after(form)
}
movedGuessField.addEventListener('change', placeGuessField)
guessFieldBelowHall.addEventListener('change', placeGuessField)
$('guessForm').addEventListener('focusout', (e) => { if (!$('guessForm').contains(e.relatedTarget)) placeGuessField() })
placeGuessField()

refreshState()
  .then(() => { if (current) selectLevel(current, { force: true }) })
  .catch(() => { $('guardian').textContent = 'The door did not answer. Reload to try again.' })

// Player screen: the vault door. Talks only to the public API; the password
// never reaches this file.
const $ = (id) => document.getElementById(id)
const SVG_NS = 'http://www.w3.org/2000/svg'

const DOOR_RADIUS = 305
const HUB_RADIUS = 118
const RING_GAP = 6
const NOTCH_WIDTH = 8
const ALIGNED_ANGLE = -90
const LOOSE_ANGLE_START = 60
const LOOSE_ANGLE_SPAN = 180
const MAX_LABEL_SIZE = 15
const LABEL_TO_BAND = 0.55
const MAX_PIPS = 24
const WRONG_SHAKE_MS = 400
const TUMBLER_TURN_MS = 1200

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
const forgottenSeen = new Map()
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

function looseAngle (id) {
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) % LOOSE_ANGLE_SPAN
  return LOOSE_ANGLE_START + hash
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
function buildDoor () {
  const door = $('door')
  door.replaceChildren()
  rings.clear()
  const count = state.levels.length
  const band = (DOOR_RADIUS - HUB_RADIUS) / count
  door.appendChild(svg('circle', { class: 'hub', r: HUB_RADIUS - RING_GAP / 2 }))
  state.levels.forEach((level, i) => {
    const radius = DOOR_RADIUS - band * (i + 0.5)
    const width = band - RING_GAP
    const g = svg('g', { class: 'ring' })
    g.appendChild(svg('circle', { class: 'band', r: radius, 'stroke-width': width }))
    const arcId = `arc-${i}`
    g.appendChild(svg('path', { id: arcId, d: `M ${-radius} 0 A ${radius} ${radius} 0 0 1 ${radius} 0`, fill: 'none' }))
    const label = svg('text', { class: 'label', 'font-size': Math.min(MAX_LABEL_SIZE, width * LABEL_TO_BAND), 'dominant-baseline': 'central' })
    const path = svg('textPath', { href: `#${arcId}`, startOffset: '50%', 'text-anchor': 'middle' })
    label.appendChild(path)
    g.appendChild(label)
    const turn = svg('g', { class: 'notch-turn' })
    turn.appendChild(svg('rect', { class: 'notch', x: -NOTCH_WIDTH / 2, y: -radius - width / 2 + 2, width: NOTCH_WIDTH, height: width - 4 }))
    g.appendChild(turn)
    g.addEventListener('click', () => { if (levelById(level.id)?.unlocked) selectLevel(level.id) })
    g.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && levelById(level.id)?.unlocked) { e.preventDefault(); selectLevel(level.id) }
    })
    door.appendChild(g)
    rings.set(level.id, { g, path, turn })
  })
}

function renderDoor () {
  const ids = state.levels.map(l => l.id).join('|')
  if ($('door').dataset.ids !== ids) {
    buildDoor()
    $('door').dataset.ids = ids
  }
  const total = roman(state.levels.length)
  state.levels.forEach((level, i) => {
    const { g, path, turn } = rings.get(level.id)
    const status = ringStatus(level)
    g.setAttribute('class', `ring ring--${status}`)
    path.textContent = level.unlocked ? `${roman(i + 1)} · ${shortName(level)}` : roman(i + 1)
    turn.style.transform = `rotate(${level.solved ? ALIGNED_ANGLE : looseAngle(level.id)}deg)`
    if (level.unlocked) {
      g.setAttribute('role', 'button')
      g.setAttribute('tabindex', '0')
    } else {
      g.removeAttribute('role')
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
  const lastLine = solved === count ? 'The vault stands open.' : `${roman(count)} · ${guardianName(last)} sleeps`
  legend.innerHTML = ''
  const b = document.createElement('b')
  b.textContent = `${solved} of ${count}`
  legend.append(b, ' tumblers turned', document.createElement('br'), lastLine, document.createElement('br'), modelLine)
}

// ---- the hall ----
function renderHall () {
  const level = levelById(current)
  if (!level) return
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
  $('guessStatus').textContent = `${level.guessesPerMinute} guesses a minute`
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
  input.disabled = !level || busy || spent
  $('sendBtn').disabled = input.disabled
  $('forgetBtn').disabled = !level || busy
  $('guessInput').disabled = !level
  $('guessBtn').disabled = !level
  input.placeholder = spent
    ? 'Your breaths are spent. Speak the word, or seal the vault and begin again.'
    : level ? `Speak to ${guardianName(level)}…` : ''
}

function addTurn (kind, who, text) {
  const el = document.createElement('div')
  el.className = `turn turn--${kind}`
  const label = document.createElement('div')
  label.className = 'who'
  label.textContent = who
  const body = document.createElement('p')
  body.textContent = text
  el.append(label, body)
  $('log').appendChild(el)
  el.scrollIntoView({ block: 'end' })
  return { el, label, body }
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
  const r = await api('/api/state')
  state = { levels: r.levels || [], model: r.model || {} }
  if (!levelById(current)?.unlocked) current = state.levels.find(l => l.unlocked && !l.solved)?.id || state.levels[0]?.id || null
  renderDoor()
  renderHall()
}

function selectLevel (id) {
  const level = levelById(id)
  if (!level) return
  current = id
  $('log').replaceChildren()
  forgottenSeen.set(id, 0)
  renderDoor()
  renderHall()
  addNote(`You stand before ${guardianName(level)}. Talk the word out of the guardian, then speak it into the door.`)
  if (level.solved) addNote('This tumbler has already turned.')
  $('chatInput').focus()
}

async function send (event) {
  event.preventDefault()
  const input = $('chatInput')
  const message = input.value.trim()
  const level = levelById(current)
  if (!message || !level || busy) return
  busy = true
  input.value = ''
  setComposer()
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
    } else if (!res.ok) {
      failed = 'The door did not answer. Try again.'
    } else {
      await readSSE(res, (ev, data) => {
        if (ev === 'token') { text += data.token; reply.body.textContent = text }
        else if (ev === 'message') { text = data.text; reply.body.textContent = text }
        else if (ev === 'done') done = data
        else if (ev === 'error') failed = 'The guardian lost his words. Your breath was returned.'
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
    reply.body.textContent = text || '…'
    if (done?.blockedAt) {
      reply.el.classList.add('turn--blocked')
      reply.label.textContent = BLOCK_LABELS[done.blockedAt] || 'A ward stopped this'
    }
    if (done?.forgotten > (forgottenSeen.get(current) || 0)) {
      forgottenSeen.set(current, done.forgotten)
      addNote(`The guardian has forgotten your first ${done.forgotten} ${done.forgotten === 1 ? 'exchange' : 'exchanges'}.`)
    }
  }
  busy = false
  await refreshState()
  $('chatInput').focus()
}

async function guess (event) {
  event.preventDefault()
  const input = $('guessInput')
  const word = input.value.trim()
  const level = levelById(current)
  if (!word || !level) return
  $('guessBtn').disabled = true
  const r = await api('/api/guess', { method: 'POST', body: JSON.stringify({ levelId: current, guess: word }) })
  $('guessBtn').disabled = false
  if (r.correct) {
    input.value = ''
    $('guessStatus').textContent = 'The tumbler turns.'
    addNote(`${guardianName(level)} yields. The tumbler turns.`)
    await refreshState()
    const next = state.levels[levelIndex(level.id) + 1]
    if (next?.unlocked) {
      addNote(`Tumbler ${roman(levelIndex(next.id) + 1)} is open: ${guardianName(next)} waits.`)
      setTimeout(() => selectLevel(next.id), TUMBLER_TURN_MS)
    }
  } else if (r.status === 429) {
    $('guessStatus').textContent = 'The door is cooling. Wait a minute.'
  } else {
    $('guessStatus').textContent = `Not the word · ${r.remaining} left this minute`
    const form = $('guessForm')
    form.classList.add('is-wrong')
    setTimeout(() => form.classList.remove('is-wrong'), WRONG_SHAKE_MS)
  }
}

async function forget () {
  if (!current) return
  await api('/api/reset', { method: 'POST', body: JSON.stringify({ levelId: current }) })
  $('log').replaceChildren()
  forgottenSeen.set(current, 0)
  addNote('The guardian has forgotten this conversation. Spent breaths stay spent.')
}

async function newGame () {
  if (!confirm('Seal the vault and start a new game? Every tumbler resets and your breaths refill.')) return
  await api('/api/game/reset', { method: 'POST' })
  current = null
  forgottenSeen.clear()
  await refreshState()
  selectLevel(current)
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
        if (line.startsWith('event: ')) ev = line.slice(7)
        else if (line.startsWith('data: ')) data += line.slice(6)
      }
      try { onEvent(ev, data ? JSON.parse(data) : {}) } catch {}
    }
  }
}

$('composer').addEventListener('submit', send)
$('guessForm').addEventListener('submit', guess)
$('forgetBtn').onclick = forget
$('newGameBtn').onclick = newGame

refreshState().then(() => { if (current) selectLevel(current) })

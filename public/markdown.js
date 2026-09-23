// The small slice of markdown a guardian writes: paragraphs, line breaks,
// bullet lists, **bold**, *em* and _em_. Everything is escaped first, so the
// only tags in the output are the ones this file writes.
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const ESCAPE_RE = /[&<>"']/g
const BLANK_LINE_RE = /\n[ \t]*\n/
const BULLET_RE = /^\s*[-*] +/
// A whole line wrapped in spaced asterisks, `* sighs *`, is a stage direction, not a bullet.
const STAGE_DIRECTION_RE = /^\s*\* +(.+?) +\*\s*$/
const BOLD_EM_RE = /\*\*\*(?=[^\s*])([^*<]+?)(?<=\S)\*\*\*/g
const BOLD_RE = /\*\*(?=\S)(.+?)(?<=\S)\*\*/g
// Emphasis never spans a `<`, so it cannot open inside a tag an earlier pass wrote and close outside it.
const STAR_EM_RE = /\*(?=[^\s*])([^*<]+?)(?<=\S)\*/g
// Underscores only open and close at word boundaries, so snake_case stays literal.
const UNDERSCORE_EM_RE = /(?<![\p{L}\p{N}_])_(?=\S)([^_<]+?)(?<=\S)_(?![\p{L}\p{N}_])/gu

function escapeHtml (text) {
  return text.replace(ESCAPE_RE, (ch) => ESCAPES[ch])
}

function inline (text) {
  return text
    .replace(BOLD_EM_RE, '<strong><em>$1</em></strong>')
    .replace(BOLD_RE, '<strong>$1</strong>')
    .replace(STAR_EM_RE, '<em>$1</em>')
    .replace(UNDERSCORE_EM_RE, '<em>$1</em>')
}

function renderBlock (block) {
  let html = ''
  let lines = []
  let items = []
  const flushParagraph = () => {
    if (lines.length) html += `<p>${lines.join('<br>')}</p>`
    lines = []
  }
  const flushList = () => {
    if (items.length) html += `<ul>${items.map(item => `<li>${inline(item)}</li>`).join('')}</ul>`
    items = []
  }
  for (const raw of block.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const stage = raw.match(STAGE_DIRECTION_RE)
    if (stage) {
      flushList()
      lines.push(`<em>${inline(stage[1])}</em>`)
    } else if (BULLET_RE.test(raw)) {
      flushParagraph()
      items.push(raw.replace(BULLET_RE, '').trim())
    } else {
      flushList()
      lines.push(inline(line))
    }
  }
  flushParagraph()
  flushList()
  return html
}

export function renderMarkdown (text) {
  const source = escapeHtml(String(text ?? '').replace(/\r\n?/g, '\n')).trim()
  if (!source) return ''
  return source.split(BLANK_LINE_RE).map(renderBlock).join('')
}

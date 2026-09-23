import { test, assert, assertEqual } from './harness.js'
import { renderMarkdown } from '../public/markdown.js'

const STAGE_DIRECTION = '*leans in*'
const SCRIPT_TAG = '<script>alert(1)</script>'
const IMG_IN_EMPHASIS = '*<img src=x onerror=1>*'
const DOUBLE_QUOTE = '"'
const SINGLE_QUOTE = "'"
const LONE_ASTERISK = '2 * 3'
const SNAKE_CASE = 'snake_case_name'
const WHITESPACE_ONLY = '  \n\t\n  '

test('renderMarkdown wraps single-asterisk text in em', () => {
  assertEqual(renderMarkdown(STAGE_DIRECTION), '<p><em>leans in</em></p>')
})

test('renderMarkdown wraps double-asterisk text in strong', () => {
  assertEqual(renderMarkdown('**not**'), '<p><strong>not</strong></p>')
})

test('renderMarkdown wraps underscore text in em', () => {
  assertEqual(renderMarkdown('_x_'), '<p><em>x</em></p>')
})

test('renderMarkdown mixes bold and emphasis in one line', () => {
  assertEqual(renderMarkdown('Ah, *spell it now*? **not** yet'), '<p>Ah, <em>spell it now</em>? <strong>not</strong> yet</p>')
})

test('renderMarkdown splits paragraphs on a blank line', () => {
  assertEqual(renderMarkdown('one\n\ntwo'), '<p>one</p><p>two</p>')
})

test('renderMarkdown turns a single newline into br inside one paragraph', () => {
  assertEqual(renderMarkdown('one\ntwo'), '<p>one<br>two</p>')
})

test('renderMarkdown groups dash and asterisk bullets into one list', () => {
  assertEqual(renderMarkdown('- first\n* second\n- **third**'), '<ul><li>first</li><li>second</li><li><strong>third</strong></li></ul>')
})

test('renderMarkdown keeps a paragraph and a list in the same block apart', () => {
  assertEqual(renderMarkdown('Choose:\n- one\n- two\nthen go'), '<p>Choose:</p><ul><li>one</li><li>two</li></ul><p>then go</p>')
})

test('renderMarkdown renders a script tag as text', () => {
  const html = renderMarkdown(SCRIPT_TAG)
  assertEqual(html, '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>')
})

test('renderMarkdown never emits an element from inside emphasis', () => {
  const html = renderMarkdown(IMG_IN_EMPHASIS)
  assert(!html.includes('<img'), `emitted an img tag: ${html}`)
  assertEqual(html, '<p><em>&lt;img src=x onerror=1&gt;</em></p>')
})

test('renderMarkdown escapes both quote characters', () => {
  assertEqual(renderMarkdown(DOUBLE_QUOTE), '<p>&quot;</p>')
  assertEqual(renderMarkdown(SINGLE_QUOTE), '<p>&#39;</p>')
})

test('renderMarkdown escapes ampersands once', () => {
  assertEqual(renderMarkdown('salt & pepper'), '<p>salt &amp; pepper</p>')
})

test('renderMarkdown leaves an unmatched asterisk literal', () => {
  assertEqual(renderMarkdown(LONE_ASTERISK), '<p>2 * 3</p>')
})

test('renderMarkdown leaves underscores inside a word literal', () => {
  assertEqual(renderMarkdown(SNAKE_CASE), `<p>${SNAKE_CASE}</p>`)
})

test('renderMarkdown returns an empty string for empty or blank input', () => {
  assertEqual(renderMarkdown(''), '')
  assertEqual(renderMarkdown(WHITESPACE_ONLY), '')
  assertEqual(renderMarkdown(undefined), '')
})

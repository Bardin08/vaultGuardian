import { test, assertEqual } from './harness.js'
import { cacheControlFor, contentTypeFor } from '../src/static.js'

const NO_STORE = 'no-store'
const NO_CACHE = 'no-cache'
const FONT_YEAR_SECONDS = 31536000
const IMMUTABLE_FONT = `public, max-age=${FONT_YEAR_SECONDS}, immutable`

const HTML_PATH = '/index.html'
const ADMIN_HTML_PATH = '/admin.html'
const JS_PATH = '/app.js'
const ADMIN_JS_PATH = '/admin.js'
const CSS_PATH = '/style.css'
const TOKENS_CSS_PATH = '/tokens.css'
const FONT_PATH = '/fonts/marcellus-sc-latin-400-normal.woff2'
const SVG_PATH = '/favicon.svg'
const UNKNOWN_PATH = '/data.bin'

test('serves .html with no-store so the page markup is always fresh', () => {
  assertEqual(cacheControlFor(HTML_PATH), NO_STORE)
  assertEqual(cacheControlFor(ADMIN_HTML_PATH), NO_STORE)
})

test('serves .js and .css with no-cache so scripts revalidate every load', () => {
  assertEqual(cacheControlFor(JS_PATH), NO_CACHE)
  assertEqual(cacheControlFor(ADMIN_JS_PATH), NO_CACHE)
  assertEqual(cacheControlFor(CSS_PATH), NO_CACHE)
  assertEqual(cacheControlFor(TOKENS_CSS_PATH), NO_CACHE)
})

test('serves .woff2 as immutable for a year since font filenames carry weight and style', () => {
  assertEqual(cacheControlFor(FONT_PATH), IMMUTABLE_FONT)
})

test('serves an unknown non-font extension with no-cache, same as js and css', () => {
  assertEqual(cacheControlFor(UNKNOWN_PATH), NO_CACHE)
})

test('contentTypeFor keeps the existing MIME mapping for known extensions', () => {
  assertEqual(contentTypeFor(HTML_PATH), 'text/html')
  assertEqual(contentTypeFor(JS_PATH), 'text/javascript')
  assertEqual(contentTypeFor(CSS_PATH), 'text/css')
  assertEqual(contentTypeFor(SVG_PATH), 'image/svg+xml')
  assertEqual(contentTypeFor(FONT_PATH), 'font/woff2')
})

test('contentTypeFor falls back to octet-stream for an unknown extension', () => {
  assertEqual(contentTypeFor(UNKNOWN_PATH), 'application/octet-stream')
})

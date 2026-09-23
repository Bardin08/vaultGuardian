import { test, assertEqual } from './harness.js'
import { cacheControlFor, contentTypeFor, versionAssetUrls } from '../src/static.js'

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

const STYLE_VERSION = 'kf3a1z'
const APP_VERSION = 'kf3a20'
const CHANGED_APP_VERSION = 'kf9z99'
const VERSION_MAP = { [CSS_PATH]: STYLE_VERSION, [JS_PATH]: APP_VERSION }
const versionFromMap = map => url => (url in map ? map[url] : null)

test('versionAssetUrls appends ?v= to a same-origin stylesheet link and script src', () => {
  const html = `<link rel="stylesheet" href="${CSS_PATH}"><script src="${JS_PATH}"></script>`
  const versioned = versionAssetUrls(html, versionFromMap(VERSION_MAP))
  assertEqual(versioned, `<link rel="stylesheet" href="${CSS_PATH}?v=${STYLE_VERSION}"><script src="${JS_PATH}?v=${APP_VERSION}"></script>`)
})

test('versionAssetUrls leaves an external URL unchanged', () => {
  const externalJs = 'https://cdn.example.com/app.js'
  const html = `<script src="${externalJs}"></script>`
  assertEqual(versionAssetUrls(html, versionFromMap(VERSION_MAP)), html)
})

test('versionAssetUrls leaves a protocol-relative URL unchanged', () => {
  const protocolRelativeJs = '//cdn.example.com/app.js'
  const html = `<script src="${protocolRelativeJs}"></script>`
  assertEqual(versionAssetUrls(html, versionFromMap(VERSION_MAP)), html)
})

test('versionAssetUrls leaves image and font references unchanged', () => {
  const html = `<link rel="icon" href="${SVG_PATH}"><link rel="preload" href="${FONT_PATH}" as="font">`
  assertEqual(versionAssetUrls(html, versionFromMap(VERSION_MAP)), html)
})

test('versionAssetUrls leaves a URL that already carries a query string unchanged', () => {
  const alreadyQueried = `${JS_PATH}?v=old`
  const html = `<script src="${alreadyQueried}"></script>`
  assertEqual(versionAssetUrls(html, versionFromMap(VERSION_MAP)), html)
})

test('versionAssetUrls leaves a URL unchanged when versionFor returns null', () => {
  const html = `<link rel="stylesheet" href="${TOKENS_CSS_PATH}">`
  assertEqual(versionAssetUrls(html, versionFromMap(VERSION_MAP)), html)
})

test('versionAssetUrls reflects a changed version from versionFor', () => {
  const html = `<script src="${JS_PATH}"></script>`
  const bumped = { ...VERSION_MAP, [JS_PATH]: CHANGED_APP_VERSION }
  assertEqual(versionAssetUrls(html, versionFromMap(bumped)), `<script src="${JS_PATH}?v=${CHANGED_APP_VERSION}"></script>`)
})

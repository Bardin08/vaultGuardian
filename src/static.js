// Static-file rules: what MIME type a path serves as, and how long the
// browser may cache it. Kept together and tested because getting either one
// wrong ships a stale page or a stale script silently.
import path from 'bare-path'

export const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
}

const FONT_MAX_AGE_SECONDS = 365 * 24 * 60 * 60 // one year: font filenames carry weight/style and never change content

export function contentTypeFor (filePath) {
  return MIME[path.extname(filePath)] || 'application/octet-stream'
}

export function cacheControlFor (filePath) {
  const ext = path.extname(filePath)
  if (ext === '.html') return 'no-store'
  if (ext === '.woff2') return `public, max-age=${FONT_MAX_AGE_SECONDS}, immutable`
  return 'no-cache'
}

// A stale browser cache can hold an old app.js/style.css under an old
// Cache-Control even after the server starts sending no-cache for them,
// because a fresh-per-the-old-header entry is reused without a revalidation
// request. The URL never changes, so nothing invalidates it. Stamping a
// version query onto same-origin .css/.js references inside the HTML makes
// the URL itself change on every deploy, so a cached entry can no longer
// match.
const ASSET_URL_RE = /((?:href|src)=")(\/(?!\/)[^"?]*\.(?:css|js))(")/g

export function versionAssetUrls (html, versionFor) {
  return html.replace(ASSET_URL_RE, (match, prefix, url, suffix) => {
    const version = versionFor(url)
    if (version === null || version === undefined) return match
    return `${prefix}${url}?v=${version}${suffix}`
  })
}

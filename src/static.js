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

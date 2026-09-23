import fs from 'bare-fs'
import bareProcess from 'bare-process'
import { TEST_DATA_DIR, TEST_PASSPHRASE } from './env.js'
import { run } from './harness.js'

if (fs.existsSync(TEST_DATA_DIR)) fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true })
bareProcess.env.VAULT_DATA_DIR = TEST_DATA_DIR
bareProcess.env.ADMIN_PASSPHRASE = TEST_PASSPHRASE
bareProcess.env.QVAC_MOCK = '1'

const SUITES = [
  './security.test.js',
  './context.test.js',
  './levels.test.js',
  './sessions.test.js',
  './play.test.js',
  './guards.test.js',
  './static.test.js',
  './budget-guess.test.js',
  './markdown.test.js',
  './markdown-guard.test.js',
  './conversation.test.js',
  './sampling.test.js',
  './level-export.test.js',
  './admin-runtime.test.js'
]

for (const suite of SUITES) await import(suite)
const failed = await run()
fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true })

if (failed) {
  console.error(`${failed} test(s) failed`)
  bareProcess.exit(1)
}
console.log('all checks passed')

// Minimal async test runner: suites register tests on import, run.js runs them.
const tests = []

export function test (name, fn) {
  tests.push({ name, fn })
}

export function assert (condition, message) {
  if (!condition) throw new Error(message)
}

export function assertEqual (actual, expected, message = 'values differ') {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) throw new Error(`${message}: expected ${e}, got ${a}`)
}

export async function run () {
  let failed = 0
  for (const { name, fn } of tests) {
    try {
      await fn()
      console.log(`ok - ${name}`)
    } catch (err) {
      failed++
      console.error(`not ok - ${name}: ${err.message}`)
    }
  }
  return failed
}

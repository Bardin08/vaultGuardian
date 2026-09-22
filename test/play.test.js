import { test, assert, assertEqual } from './harness.js'
import { withPrompt } from '../src/play.js'
import { newSessionId, promptsLeft, spendPrompt } from '../src/sessions.js'

const BUDGET = 1
const ONE_PROMPT = { id: 'l1', promptBudget: { maxPrompts: BUDGET } }
const RESULT = { text: 'Greetings, traveller.' }

test('a turn spends one prompt and returns the run result', async () => {
  const sid = newSessionId()
  const outcome = await withPrompt({ sid, level: ONE_PROMPT, admin: false, run: async () => RESULT })
  assertEqual(outcome, { exhausted: false, result: RESULT })
  assertEqual(promptsLeft(sid, ONE_PROMPT), 0)
})

test('an exhausted budget never calls the model', async () => {
  const sid = newSessionId()
  spendPrompt(sid, ONE_PROMPT)
  let called = false
  const outcome = await withPrompt({ sid, level: ONE_PROMPT, admin: false, run: async () => { called = true } })
  assert(outcome.exhausted, 'turn ran past the budget')
  assert(!called, 'model was called')
})

test('a failed turn refunds its prompt and rethrows', async () => {
  const sid = newSessionId()
  let threw = false
  try {
    await withPrompt({ sid, level: ONE_PROMPT, admin: false, run: async () => { throw new Error('model down') } })
  } catch {
    threw = true
  }
  assert(threw, 'error was swallowed')
  assertEqual(promptsLeft(sid, ONE_PROMPT), BUDGET)
})

test('two concurrent turns against a budget of one run the model only once', async () => {
  const sid = newSessionId()
  let calls = 0
  const run = async () => { calls++; return RESULT }
  const outcomes = await Promise.all([
    withPrompt({ sid, level: ONE_PROMPT, admin: false, run }),
    withPrompt({ sid, level: ONE_PROMPT, admin: false, run })
  ])
  assertEqual(calls, 1)
  assertEqual(outcomes.filter(outcome => outcome.exhausted).length, 1)
})

test('admin turns neither spend nor check the budget', async () => {
  const sid = newSessionId()
  spendPrompt(sid, ONE_PROMPT)
  const outcome = await withPrompt({ sid, level: ONE_PROMPT, admin: true, run: async () => RESULT })
  assertEqual(outcome, { exhausted: false, result: RESULT })
  assertEqual(promptsLeft(sid, ONE_PROMPT), 0)
})

import { test, assert, assertEqual } from './harness.js'
import { writeJSON, readJSON } from '../src/store.js'
import {
  initSessions, newSessionId, solvedLevels, markSolved, promptsLeft, spendPrompt,
  refundPrompt, resetGame, pushTurn, conversation, checkGuessLimit
} from '../src/sessions.js'

const BUDGET = 2
const LIMITED = { id: 'l1', promptBudget: { maxPrompts: BUDGET } }
const UNLIMITED = { id: 'l2', promptBudget: { maxPrompts: 0 } }
const MANY_SENDS = 50
const ONE_GUESS_PER_MINUTE = 1
const NO_GUESSES_LEFT = 0
const RATE_LIMITED = -1
const MESSAGES_PER_EXCHANGE = 2

test('legacy progress arrays load as solved levels, and forged keys are dropped', () => {
  const sid = newSessionId()
  writeJSON('progress.json', JSON.parse(`{"${sid}": ["l1"], "__proto__": ["l1"], "not-a-sid": ["l1"]}`))
  initSessions()
  assert(solvedLevels(sid).has('l1'), 'legacy solve lost')
  assertEqual(promptsLeft(sid, LIMITED), BUDGET)
  markSolved(sid, 'l2')
  assertEqual(Object.keys(readJSON('progress.json', {})), [sid])
})

test('spending counts down and refuses at zero', () => {
  const sid = newSessionId()
  assert(spendPrompt(sid, LIMITED), 'first send refused')
  assert(spendPrompt(sid, LIMITED), 'second send refused')
  assertEqual(promptsLeft(sid, LIMITED), 0)
  assert(!spendPrompt(sid, LIMITED), 'send allowed past the budget')
})

test('a refund gives the prompt back', () => {
  const sid = newSessionId()
  spendPrompt(sid, LIMITED)
  refundPrompt(sid, LIMITED)
  assertEqual(promptsLeft(sid, LIMITED), BUDGET)
})

test('a level with maxPrompts 0 never runs out', () => {
  const sid = newSessionId()
  for (let i = 0; i < MANY_SENDS; i++) assert(spendPrompt(sid, UNLIMITED), `send ${i} refused`)
  assertEqual(promptsLeft(sid, UNLIMITED), null)
})

test('budget usage survives a reload', () => {
  const sid = newSessionId()
  spendPrompt(sid, LIMITED)
  initSessions()
  assertEqual(promptsLeft(sid, LIMITED), BUDGET - 1)
})

test('resetGame clears only that session', () => {
  const sid = newSessionId()
  const other = newSessionId()
  for (const s of [sid, other]) {
    markSolved(s, 'l1')
    spendPrompt(s, LIMITED)
    pushTurn(s, 'l1', 'hello', 'greetings')
    checkGuessLimit(s, 'l1', ONE_GUESS_PER_MINUTE)
  }
  resetGame(sid)
  assertEqual(solvedLevels(sid).size, 0)
  assertEqual(promptsLeft(sid, LIMITED), BUDGET)
  assertEqual(conversation(sid, 'l1').length, 0)
  assertEqual(checkGuessLimit(sid, 'l1', ONE_GUESS_PER_MINUTE), NO_GUESSES_LEFT)
  assert(solvedLevels(other).has('l1'), 'other session lost its solve')
  assertEqual(promptsLeft(other, LIMITED), BUDGET - 1)
  assertEqual(conversation(other, 'l1').length, MESSAGES_PER_EXCHANGE)
  assertEqual(checkGuessLimit(other, 'l1', ONE_GUESS_PER_MINUTE), RATE_LIMITED)
})

import { test, assert, assertEqual } from './harness.js'
import fs from 'bare-fs'
import path from 'bare-path'
import { writeJSON, readJSON, dataDir } from '../src/store.js'
import {
  initSessions, newSessionId, solvedLevels, markSolved, promptsLeft, spendPrompt,
  refundPrompt, resetGame, pushTurn, conversation, checkGuessLimit, storedTurns, MAX_STORED_TURNS
} from '../src/sessions.js'

const BUDGET = 2
const LIMITED = { id: 'l1', promptBudget: { maxPrompts: BUDGET } }
const UNLIMITED = { id: 'l2', promptBudget: { maxPrompts: 0 } }
const MANY_SENDS = 50
const ONE_GUESS_PER_MINUTE = 1
const NO_GUESSES_LEFT = 0
const RATE_LIMITED = -1
const MESSAGES_PER_EXCHANGE = 2
const USED_ON_LOAD = 2
const PROGRESS_FILE = 'progress.json'

// A directory where progress.json should be makes the rename in writeJSON fail.
function withUnwritableProgress (fn) {
  const file = path.join(dataDir(), PROGRESS_FILE)
  fs.rmSync(file, { force: true })
  fs.mkdirSync(file)
  try {
    return fn()
  } finally {
    fs.rmSync(file, { recursive: true, force: true })
    fs.rmSync(file + '.tmp', { force: true })
  }
}

function throws (fn) {
  try {
    fn()
  } catch {
    return true
  }
  return false
}

test('legacy progress arrays load as solved levels, and forged keys are dropped', () => {
  const sid = newSessionId()
  writeJSON('progress.json', JSON.parse(`{"${sid}": ["l1"], "__proto__": ["l1"], "not-a-sid": ["l1"]}`))
  initSessions()
  assert(solvedLevels(sid).has('l1'), 'legacy solve lost')
  assertEqual(promptsLeft(sid, LIMITED), BUDGET)
  markSolved(sid, 'l2')
  assertEqual(Object.keys(readJSON('progress.json', {})), [sid])
})

test('loaded progress rejects a non-array solved value and non-integer or negative prompt counts', () => {
  const sid = newSessionId()
  writeJSON('progress.json', { [sid]: { solved: 'l1', promptsUsed: { l1: '9', l2: -1, l3: USED_ON_LOAD } } })
  initSessions()
  assertEqual(solvedLevels(sid).size, 0)
  assertEqual(promptsLeft(sid, { id: 'l1', promptBudget: { maxPrompts: BUDGET } }), BUDGET)
  assertEqual(promptsLeft(sid, { id: 'l2', promptBudget: { maxPrompts: BUDGET } }), BUDGET)
  assertEqual(promptsLeft(sid, { id: 'l3', promptBudget: { maxPrompts: BUDGET } }), BUDGET - USED_ON_LOAD)
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

test('a spend that cannot be saved is rolled back and rethrown', () => {
  const sid = newSessionId()
  const threw = withUnwritableProgress(() => throws(() => spendPrompt(sid, LIMITED)))
  assert(threw, 'a failed save should surface')
  assertEqual(promptsLeft(sid, LIMITED), BUDGET)
})

test('a refund that cannot be saved is rolled back and rethrown', () => {
  const sid = newSessionId()
  spendPrompt(sid, LIMITED)
  const threw = withUnwritableProgress(() => throws(() => refundPrompt(sid, LIMITED)))
  assert(threw, 'a failed save should surface')
  assertEqual(promptsLeft(sid, LIMITED), BUDGET - 1)
})

test('trimming stored turns drops where the dropped turns were blocked', () => {
  const FIRST_BLOCKED_AT = 'input'
  const SECOND_BLOCKED_AT = 'output'
  const sid = newSessionId()
  pushTurn(sid, 'l1', 'first', 'no', FIRST_BLOCKED_AT)
  pushTurn(sid, 'l1', 'second', 'no', SECOND_BLOCKED_AT)
  for (let i = 2; i <= MAX_STORED_TURNS; i++) pushTurn(sid, 'l1', `hello ${i}`, `greetings ${i}`)
  const turns = storedTurns(sid, 'l1')
  assertEqual(turns.length, MAX_STORED_TURNS)
  assertEqual(conversation(sid, 'l1').length, MAX_STORED_TURNS * MESSAGES_PER_EXCHANGE)
  assertEqual(turns[0].you, 'second')
  assertEqual(turns[0].blockedAt, SECOND_BLOCKED_AT)
})

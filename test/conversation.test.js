import { test, assertEqual } from './harness.js'
import { newSessionId, pushTurn, conversation, storedTurns, resetConversation } from '../src/sessions.js'
import { conversationView } from '../src/conversation.js'
import { defaultLevels } from '../src/levels.js'

const LEVEL_ID = 'l2'
const OTHER_LEVEL_ID = 'l3'
const OPEN_DOOR_INDEX = 1
const ONE_TURN = 1
const ROOMY_TOKENS = 3000
const CTX_SIZE = 4096
const EXCHANGES = 3
const MODEL_HISTORY_KEYS = ['role', 'content']
const BLOCKED_AT_INPUT = 'input'
const BLOCKED_AT_OUTPUT = 'output'

const level = { ...defaultLevels()[OPEN_DOOR_INDEX], memory: { maxTurns: ONE_TURN, maxContextTokens: ROOMY_TOKENS } }

test('a stored exchange keeps the model history to role and content', () => {
  const sid = newSessionId()
  pushTurn(sid, LEVEL_ID, 'hi', 'no', BLOCKED_AT_INPUT)
  for (const message of conversation(sid, LEVEL_ID)) assertEqual(Object.keys(message), MODEL_HISTORY_KEYS)
})

test('the conversation view returns every exchange with where it was blocked', () => {
  const sid = newSessionId()
  pushTurn(sid, LEVEL_ID, 'hi', 'no', BLOCKED_AT_INPUT)
  pushTurn(sid, LEVEL_ID, 'hello', 'greetings')
  pushTurn(sid, LEVEL_ID, 'again', 'blocked', BLOCKED_AT_OUTPUT)
  const view = conversationView({ turns: storedTurns(sid, LEVEL_ID), level, ctxSize: CTX_SIZE })
  assertEqual(view.turns, [
    { you: 'hi', reply: 'no', blockedAt: BLOCKED_AT_INPUT },
    { you: 'hello', reply: 'greetings', blockedAt: null },
    { you: 'again', reply: 'blocked', blockedAt: BLOCKED_AT_OUTPUT }
  ])
})

test('the conversation view counts what the model no longer sees', () => {
  const sid = newSessionId()
  for (let i = 0; i < EXCHANGES; i++) pushTurn(sid, LEVEL_ID, `hello ${i}`, `greetings ${i}`)
  const view = conversationView({ turns: storedTurns(sid, LEVEL_ID), level, ctxSize: CTX_SIZE })
  assertEqual(view.forgotten, EXCHANGES - ONE_TURN)
})

test('an empty conversation forgets nothing', () => {
  assertEqual(conversationView({ turns: storedTurns(newSessionId(), LEVEL_ID), level, ctxSize: CTX_SIZE }), { turns: [], forgotten: 0 })
})

test('stored turns never cross sessions or levels', () => {
  const sid = newSessionId()
  const other = newSessionId()
  pushTurn(sid, LEVEL_ID, 'mine', 'yours')
  assertEqual(storedTurns(other, LEVEL_ID), [])
  assertEqual(storedTurns(sid, OTHER_LEVEL_ID), [])
})

test('resetting a conversation clears where its turns were blocked', () => {
  const sid = newSessionId()
  pushTurn(sid, LEVEL_ID, 'hi', 'no', BLOCKED_AT_INPUT)
  resetConversation(sid, LEVEL_ID)
  pushTurn(sid, LEVEL_ID, 'hello', 'greetings')
  assertEqual(storedTurns(sid, LEVEL_ID), [{ you: 'hello', reply: 'greetings', blockedAt: null }])
})

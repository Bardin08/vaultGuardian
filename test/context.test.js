import { test, assertEqual } from './harness.js'
import { estimateTokens, trimHistory } from '../src/context.js'

const ROOMY_TOKENS = 3000
const CTX_SIZE = 4096
const REPLY_RESERVE = 512
const TURNS_WITHOUT_LIMIT = 20
const PAIR_COUNT = 5
const CHARS_PER_MESSAGE = 300
const TOKENS_PER_PAIR = 200
const PAIRS_THAT_FIT = 2
const TIGHT_TOKENS = TOKENS_PER_PAIR * PAIRS_THAT_FIT + TOKENS_PER_PAIR / 2

function pairs (count, chars = 1) {
  const history = []
  for (let i = 0; i < count; i++) {
    history.push({ role: 'user', content: `u${i}`.padEnd(chars, '.') })
    history.push({ role: 'assistant', content: `a${i}`.padEnd(chars, '.') })
  }
  return history
}

const BASE = {
  systemPrompt: '',
  message: '',
  maxTurns: TURNS_WITHOUT_LIMIT,
  maxContextTokens: ROOMY_TOKENS,
  ctxSize: CTX_SIZE,
  replyReserve: REPLY_RESERVE
}

test('estimateTokens counts three characters per token, rounded up', () => {
  const FOUR_CHARS = 'abcd'
  const EXPECTED_TOKENS = 2
  assertEqual(estimateTokens(FOUR_CHARS), EXPECTED_TOKENS)
})

test('history under both limits is kept whole', () => {
  const history = pairs(PAIRS_THAT_FIT)
  const result = trimHistory({ ...BASE, history })
  assertEqual(result.forgotten, 0)
  assertEqual(result.history, history)
})

test('the turn cap drops the oldest pairs first', () => {
  const MAX_TURNS = 3
  const result = trimHistory({ ...BASE, history: pairs(PAIR_COUNT), maxTurns: MAX_TURNS })
  assertEqual(result.forgotten, PAIR_COUNT - MAX_TURNS)
  assertEqual(result.history[0].content, `u${PAIR_COUNT - MAX_TURNS}`)
})

test('the level token cap drops pairs until the rest fits', () => {
  const result = trimHistory({ ...BASE, history: pairs(PAIR_COUNT, CHARS_PER_MESSAGE), maxContextTokens: TIGHT_TOKENS })
  assertEqual(result.forgotten, PAIR_COUNT - PAIRS_THAT_FIT)
})

test('the model context cap applies when it is tighter than the level cap', () => {
  const result = trimHistory({ ...BASE, history: pairs(PAIR_COUNT, CHARS_PER_MESSAGE), ctxSize: REPLY_RESERVE + TIGHT_TOKENS })
  assertEqual(result.forgotten, PAIR_COUNT - PAIRS_THAT_FIT)
})

test('maxTurns of zero sends no history at all', () => {
  const NO_MEMORY = 0
  const result = trimHistory({ ...BASE, history: pairs(PAIR_COUNT), maxTurns: NO_MEMORY })
  assertEqual(result.history, [])
  assertEqual(result.forgotten, PAIR_COUNT)
})

test('a system prompt larger than the limit yields an empty history', () => {
  const OVERSIZED_CHARS = ROOMY_TOKENS * 3 + 3
  const result = trimHistory({ ...BASE, history: pairs(PAIRS_THAT_FIT), systemPrompt: 'x'.repeat(OVERSIZED_CHARS) })
  assertEqual(result.history, [])
  assertEqual(result.forgotten, PAIRS_THAT_FIT)
})

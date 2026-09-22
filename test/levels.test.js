import { test, assert, assertEqual } from './harness.js'
import { writeJSON } from '../src/store.js'
import { defaultLevels, normalizeLevel, loadLevels, DEFAULT_MAX_PROMPTS, DEFAULT_MEMORY } from '../src/levels.js'

const SPEC_PROMPT_BUDGET = 12
const SHIPPED_LEVEL_COUNT = 7
const UNLIMITED = 0
const NEGATIVE = -3
const FORM_VALUE = '5'
const FORM_NUMBER = 5

test('the shipped budget is twelve prompts', () => {
  assertEqual(DEFAULT_MAX_PROMPTS, SPEC_PROMPT_BUDGET)
})

test('every shipped level carries the default budget and memory', () => {
  const levels = defaultLevels()
  assertEqual(levels.length, SHIPPED_LEVEL_COUNT)
  for (const level of levels) {
    assertEqual(level.promptBudget, { maxPrompts: DEFAULT_MAX_PROMPTS }, level.id)
    assertEqual(level.memory, DEFAULT_MEMORY, level.id)
  }
})

test('normalizeLevel fills a missing budget and memory', () => {
  const level = normalizeLevel({ id: 'custom' })
  assertEqual(level.promptBudget, { maxPrompts: DEFAULT_MAX_PROMPTS })
  assertEqual(level.memory, DEFAULT_MEMORY)
})

test('normalizeLevel keeps zero as unlimited and rejects negatives', () => {
  assertEqual(normalizeLevel({ id: 'a', promptBudget: { maxPrompts: UNLIMITED } }).promptBudget.maxPrompts, UNLIMITED)
  assertEqual(normalizeLevel({ id: 'b', promptBudget: { maxPrompts: NEGATIVE } }).promptBudget.maxPrompts, DEFAULT_MAX_PROMPTS)
  assertEqual(normalizeLevel({ id: 'c', memory: { maxTurns: NEGATIVE, maxContextTokens: UNLIMITED } }).memory, DEFAULT_MEMORY)
})

test('normalizeLevel accepts numeric strings from the admin form', () => {
  const level = normalizeLevel({ id: 'd', promptBudget: { maxPrompts: FORM_VALUE }, memory: { maxTurns: FORM_VALUE, maxContextTokens: FORM_VALUE } })
  assertEqual(level.promptBudget.maxPrompts, FORM_NUMBER)
  assertEqual(level.memory, { maxTurns: FORM_NUMBER, maxContextTokens: FORM_NUMBER })
})

test('loadLevels upgrades a saved file that predates the budget', () => {
  const legacy = defaultLevels().map(({ promptBudget, memory, ...rest }) => rest)
  writeJSON('levels.json', legacy)
  const loaded = loadLevels()
  assert(loaded.every(l => l.promptBudget.maxPrompts === DEFAULT_MAX_PROMPTS), 'budget missing after load')
  assert(loaded.every(l => l.memory.maxTurns === DEFAULT_MEMORY.maxTurns), 'memory missing after load')
})

import { test, assert, assertEqual } from './harness.js'
import { stripMarkdown, replyLeaksPassword, classifierPrompt } from '../src/guards.js'
import { defaultLevels } from '../src/levels.js'

const PLAIN_FILTER_INDEX = 2
const FORMATTED = '**M**OON_BEAM_ `x` ~~y~~'
const FORMATTING_REMOVED = 'MOONBEAM x y'
const BOLD_LEAK = '**SUN**FLOWER'
const ITALIC_LEAK = '*SUN*FLOWER'
const UNDERSCORE_LEAK = 'SUN_FLOWER_'
const SPACED = 'sun flower'
const REPLY_ONLY_PROMPT = '{reply}'
const FORMATTED_PASSWORD = '**MOON**BEAM'
const PASSWORD = 'MOONBEAM'

const plainFilter = defaultLevels()[PLAIN_FILTER_INDEX]

test('stripMarkdown removes emphasis, code and strike markers and nothing else', () => {
  assertEqual(stripMarkdown(FORMATTED), FORMATTING_REMOVED)
})

test('stripMarkdown treats a missing reply as empty', () => {
  assertEqual(stripMarkdown(undefined), '')
})

test('the shipped plain filter is not fuzzy', () => {
  assert(plainFilter.outputGuard.enabled && !plainFilter.outputGuard.fuzzy, 'expected a plain output filter')
})

for (const reply of [BOLD_LEAK, ITALIC_LEAK, UNDERSCORE_LEAK]) {
  test(`the plain output filter catches ${reply}`, () => {
    assertEqual(replyLeaksPassword(plainFilter, reply).leaked, true)
  })
}

test('the plain output filter leaves spaced-out words to the fuzzy filter', () => {
  assertEqual(replyLeaksPassword(plainFilter, SPACED).leaked, false)
})

test('the classifier is shown the reply with formatting removed', () => {
  const level = { ...plainFilter, guardModelCheck: { enabled: true, prompt: REPLY_ONLY_PROMPT } }
  assert(classifierPrompt(level, FORMATTED_PASSWORD).includes(PASSWORD), 'classifier prompt should contain the unformatted password')
})

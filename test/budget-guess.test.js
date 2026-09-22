// The prompt budget gates talking to the guardian, never guessing the password.
import { test, assert } from './harness.js'
import { newSessionId, promptsLeft, spendPrompt, checkGuessLimit } from '../src/sessions.js'
import { validateGuess } from '../src/guards.js'
import { defaultLevels } from '../src/levels.js'

const NO_PROMPTS_LEFT = 0

test('a guess still works at zero prompts', () => {
  const level = defaultLevels()[0]
  const sid = newSessionId()
  while (spendPrompt(sid, level));
  assert(promptsLeft(sid, level) === NO_PROMPTS_LEFT, 'budget not spent')
  const remaining = checkGuessLimit(sid, level.id, level.submitValidation.maxGuessesPerMinute)
  assert(remaining >= NO_PROMPTS_LEFT, `guess rate-limited after a spent budget: ${remaining}`)
  assert(validateGuess(level, level.password), 'the password was refused after a spent budget')
})

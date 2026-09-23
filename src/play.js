// One chat turn under the level's prompt budget: the prompt is spent before
// the model runs and given back if the turn fails. Admin turns skip it.
import { spendPrompt, refundPrompt } from './sessions.js'

export async function withPrompt ({ sid, level, admin, run }) {
  if (!admin && !spendPrompt(sid, level)) return { exhausted: true }
  try {
    return { exhausted: false, result: await run() }
  } catch (err) {
    if (!admin) refundPrompt(sid, level)
    throw err
  }
}

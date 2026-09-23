// What a player already saw on a level, so a reload can put it back, and how
// many of those exchanges the model would no longer see on the next turn.
import { trimHistory } from './context.js'

export function conversationView ({ turns, level, ctxSize }) {
  const history = turns.flatMap(({ you, reply }) => [
    { role: 'user', content: you },
    { role: 'assistant', content: reply }
  ])
  const { forgotten } = trimHistory({
    systemPrompt: level.systemPrompt,
    history,
    message: '',
    maxTurns: level.memory.maxTurns,
    maxContextTokens: level.memory.maxContextTokens,
    ctxSize
  })
  return { turns: turns.map(({ you, reply, blockedAt }) => ({ you, reply, blockedAt })), forgotten }
}

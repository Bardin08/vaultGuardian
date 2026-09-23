// What the server adds to every turn, for the admin console's level export.
// Lives apart from qvac.js because guards.js, which owns the classifier's
// system message, already imports qvac.js.
import { STYLE_DIRECTIVE, CHAT_SAMPLING, CLASSIFIER_SAMPLING, THINKING } from './qvac.js'
import { CLASSIFIER_SYSTEM } from './guards.js'

export function adminRuntime ({ ctxSize, model }) {
  return {
    styleDirective: STYLE_DIRECTIVE,
    chatSampling: CHAT_SAMPLING,
    classifierSampling: CLASSIFIER_SAMPLING,
    classifierSystem: CLASSIFIER_SYSTEM,
    ctxSize,
    thinking: THINKING,
    model
  }
}

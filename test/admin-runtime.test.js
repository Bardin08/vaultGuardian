import { test, assertEqual } from './harness.js'
import { adminRuntime, STYLE_DIRECTIVE, CHAT_SAMPLING, CLASSIFIER_SAMPLING } from '../src/qvac.js'

const CTX_SIZE = 8192
const MODEL = 'QWEN3_4B_INST_Q4_K_M'
// run.js leaves QVAC_THINKING unset, so the model is told not to reason.
const THINKING_OFF = false

test('admin runtime: states what the server adds to every turn', () => {
  assertEqual(adminRuntime({ ctxSize: CTX_SIZE, model: MODEL }), {
    styleDirective: STYLE_DIRECTIVE,
    chatSampling: CHAT_SAMPLING,
    classifierSampling: CLASSIFIER_SAMPLING,
    ctxSize: CTX_SIZE,
    thinking: THINKING_OFF,
    model: MODEL
  }, 'runtime description differs')
})

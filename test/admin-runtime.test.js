import { test, assertEqual } from './harness.js'
import { adminRuntime } from '../src/runtime.js'
import { STYLE_DIRECTIVE, CHAT_SAMPLING, CLASSIFIER_SAMPLING, THINKING } from '../src/qvac.js'
import { CLASSIFIER_SYSTEM } from '../src/guards.js'

const CTX_SIZE = 8192
const MODEL = 'QWEN3_4B_INST_Q4_K_M'

test('admin runtime: states what the server adds to every turn', () => {
  assertEqual(adminRuntime({ ctxSize: CTX_SIZE, model: MODEL }), {
    styleDirective: STYLE_DIRECTIVE,
    chatSampling: CHAT_SAMPLING,
    classifierSampling: CLASSIFIER_SAMPLING,
    classifierSystem: CLASSIFIER_SYSTEM,
    ctxSize: CTX_SIZE,
    thinking: THINKING,
    model: MODEL
  }, 'runtime description differs')
})

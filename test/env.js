import path from 'bare-path'

export const TEST_DATA_DIR = path.join(new URL('.', import.meta.url).pathname, '.tmp-data')
export const TEST_PASSPHRASE = 'test-only-passphrase'

import { describe, expect, it } from 'vitest'
import { commandPollInterval } from './commands'
describe('command polling', () => {
  it.each(['CREATED','SENT','ACKED','EXECUTING'])('polls while %s', status => expect(commandPollInterval(status)).toBe(2000))
  it.each(['SUCCEEDED','FAILED','TIMEOUT'])('stops at %s', status => expect(commandPollInterval(status)).toBe(false))
})

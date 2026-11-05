import { describe, expect, it } from 'vitest'
import { unwrap } from './client'
describe('API envelope', () => {
  it('unwraps successful data', async () => {
    await expect(unwrap({ data: { success: true, data: { id: 'x' } }, response: new Response() })).resolves.toEqual({ id: 'x' })
  })
  it('preserves backend code and message on domain errors', async () => {
    await expect(unwrap({ data: { success: false, code: 'NOT_FOUND', message: 'Missing' }, response: new Response() })).rejects.toMatchObject({ code: 'NOT_FOUND', message: 'Missing' })
  })
})

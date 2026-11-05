import createClient from 'openapi-fetch'
import type { paths } from './generated/voltbridge-schema'

export const api = createClient<paths>({ baseUrl: import.meta.env.VITE_API_BASE_URL || '' })
export class ApiError extends Error {
  code: string
  constructor(code: string, message: string) { super(message); this.name = 'ApiError'; this.code = code }
}
export async function unwrap<T>(response: { data?: unknown; error?: unknown; response: Response }): Promise<T> {
  if (response.error) throw new ApiError('HTTP_ERROR', 'The request failed. Check the backend and try again.')
  const envelope = response.data as {success?: boolean; code?: string; message?: string; data?: T} | undefined
  if (!envelope?.success) throw new ApiError(envelope?.code || 'API_ERROR', envelope?.message || 'The backend returned an error.')
  return envelope.data as T
}

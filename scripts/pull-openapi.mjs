import { mkdir, writeFile } from 'node:fs/promises'
const url = process.env.OPENAPI_URL || 'http://localhost:8080/v3/api-docs'
const response = await fetch(url)
if (!response.ok) throw new Error(`OpenAPI request failed: ${response.status} ${response.statusText}`)
const document = await response.json()
await mkdir('openapi', { recursive: true })
await writeFile('openapi/voltbridge-openapi.json', `${JSON.stringify(document, null, 2)}\n`)

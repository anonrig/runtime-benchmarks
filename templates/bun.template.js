import path from 'node:path'
import assert from 'node:assert'
import { handler } from './benchmark.js'

const configFile = Bun.file(path.join(__dirname, 'runtime-config.json'))
const { bun } = await configFile.json()

Bun.serve({
  port: parseInt(bun.port),
  async fetch(request) {
    const result = await handler(request)
    if (result instanceof Response) return result
    assert.ok(result)
    return new Response('hello world')
  },
})

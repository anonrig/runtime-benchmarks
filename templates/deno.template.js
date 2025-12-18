import config from './runtime-config.json' with { type: 'json' }
import { handler } from './benchmark.js'
import assert from 'node:assert'

Deno.serve(
  {
    port: config.deno.port,
  },
  async (request) => {
    const result = await handler(request)
    if (result instanceof Response) return result
    assert.ok(result)
    return new Response('hello world')
  }
)

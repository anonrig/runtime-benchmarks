import config from '../config.json' with { type: 'json' }
import { handler } from './benchmark.js'
import assert from 'node:assert'

Deno.serve(
  {
    port: parseInt(config.deno.port),
  },
  async () => {
    assert.ok(await handler())
    return new Response('hello world')
  }
)

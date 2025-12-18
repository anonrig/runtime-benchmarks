import assert from 'node:assert'
import { handler } from './benchmark.js'

export default {
  async fetch(request) {
    const result = await handler(request)
    if (result instanceof Response) return result
    assert.ok(result)
    return new Response('hello world')
  },
}

import assert from 'node:assert'
import { handler } from './benchmark.js'

export default {
  async fetch() {
    assert.ok(await handler())
    return new Response('hello world')
  },
}

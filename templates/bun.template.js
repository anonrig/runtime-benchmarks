import path from 'node:path'
import assert from 'node:assert'
import { handler } from './benchmark.js'

const configFile = Bun.file(path.join(__dirname, '../config.json'))
const { bun } = await configFile.json()

Bun.serve({
  port: parseInt(bun.port),
  async fetch() {
    assert.ok(await handler())
    return new Response('hello world')
  },
})

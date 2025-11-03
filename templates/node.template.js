import http from 'node:http'
import { readFileSync } from 'node:fs'
import assert from 'node:assert'
import { handler } from './benchmark.js'

const {
  node: { port },
} = JSON.parse(readFileSync('../config.json', 'utf8'))

const server = http.createServer(async (req, res) => {
  assert.ok(await handler())
  res.writeHead(200)
  res.end('hello world')
})
server.listen(parseInt(port))

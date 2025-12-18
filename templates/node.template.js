import http from 'node:http'
import { readFileSync } from 'node:fs'
import { Readable } from 'node:stream'
import assert from 'node:assert'
import { handler } from './benchmark.js'

const {
  node: { port },
} = JSON.parse(readFileSync('./runtime-config.json', 'utf8'))

const server = http.createServer(async (req, res) => {
  // Convert Node.js request to Web Request
  const body =
    req.method !== 'GET' && req.method !== 'HEAD' ? Readable.toWeb(req) : null

  const request = new Request(`http://localhost:${port}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: body,
    duplex: 'half',
  })

  const result = await handler(request)

  if (result instanceof Response) {
    res.writeHead(result.status)
    if (result.body) {
      const reader = result.body.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        res.write(value)
      }
    }
    res.end()
    return
  }

  assert.ok(result)
  res.writeHead(200)
  res.end('hello world')
})
server.listen(parseInt(port))

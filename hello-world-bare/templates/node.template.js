// Serves hello world straight from node:http, without converting each
// request to a web Request as templates/node.template.js does.
import http from 'node:http'
import { readFileSync } from 'node:fs'

const {
  node: { port },
} = JSON.parse(readFileSync('./runtime-config.json', 'utf8'))

http
  .createServer((req, res) => {
    // Send the same Content-Type that the other runtimes' Response sets.
    res.writeHead(200, { 'content-type': 'text/plain;charset=UTF-8' })
    res.end('hello world')
  })
  .listen(parseInt(port))

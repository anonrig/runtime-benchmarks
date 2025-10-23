import http from 'node:http'
import { readFileSync } from 'node:fs'

const config = JSON.parse(readFileSync('./config.json', 'utf8'))
const { port } = config.node

const server = http.createServer((req, res) => {
  res.writeHead(200)
  res.end('hello world')
})
server.listen(parseInt(port))

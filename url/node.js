import http from 'node:http'
import { readFileSync } from 'node:fs'

const { node: { port }} = JSON.parse(readFileSync('../config.json', 'utf8'))
const lines = readFileSync('./dataset.txt', 'utf8').split('\n');

const server = http.createServer((req, res) => {
  for (let line of lines) {
    try {
      new URL(line);
    } catch { }
  }
  res.writeHead(200)
  res.end('hello world')
})
server.listen(parseInt(port))

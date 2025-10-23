import path from 'node:path'

const file = Bun.file(path.join(__dirname, '../config.json'))
const { bun } = await file.json()

Bun.serve({
  port: parseInt(bun.port),
  fetch() {
    return new Response('hello world')
  },
})

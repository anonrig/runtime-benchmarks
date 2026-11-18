import path from 'node:path'

const configFile = Bun.file(path.join(__dirname, 'runtime-config.json'))
const { bun } = await configFile.json()

Bun.serve({
  port: parseInt(bun.port),
  fetch() {
    return new Response('hello world')
  },
})

import path from 'node:path'
import { URL } from 'node:url';

const configFile = Bun.file(path.join(__dirname, '../config.json'))
const { bun } = await configFile.json()

const dataset = Bun.file(path.join(__dirname, './dataset.txt'))
const lines = (await dataset.text()).split('\n')

Bun.serve({
  port: parseInt(bun.port),
  fetch() {
    for (let line of lines) {
      try {
        new URL(line);
      } catch { }
    }
    return new Response('hello world')
  },
})

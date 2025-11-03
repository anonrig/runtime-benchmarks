import { readFileSync } from 'node:fs';
import config from '../config.json' with { type: 'json' }

const lines = readFileSync('./dataset.txt', 'utf8').split('\n');

Deno.serve(
  {
    port: parseInt(config.deno.port),
  },
  () => {
    for (let line of lines) {
      try {
        new URL(line);
      } catch { }
    }
    return new Response('hello world')
  }
)

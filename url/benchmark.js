import { readFileSync } from 'node:fs'

const lines = readFileSync('./dataset.txt', 'utf8').split('\n')

export function handler() {
  for (let line of lines) {
    try {
      new URL(line)
    } catch {}
  }
  return true
}

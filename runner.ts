import { ChildProcess, execSync, spawn } from 'node:child_process'
import { parseArgs } from 'node:util'
import { copyFileSync, unlinkSync, readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import path from 'node:path'
import { createConnection } from 'node:net'
import { setTimeout } from 'node:timers/promises'

const config = JSON.parse(readFileSync('./config.json', 'utf8'))
const runtimes = ['workerd', 'deno', 'bun', 'node']

type Benchmark = {
  directory_name: string
  runtime: 'workerd' | 'deno' | 'bun' | 'node'
}

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    benchmark: {
      type: 'string',
    },
  },
  strict: true,
  allowPositionals: false,
})

const processes: Record<Benchmark['runtime'], ChildProcess> = {}

function cleanup() {
  console.log('\nCleaning up processes...')
  for (const [runtime, proc] of Object.entries(processes)) {
    if (proc && proc.pid) {
      try {
        proc.kill('SIGTERM')
      } catch (error) {
        console.error(`Failed to kill ${runtime} process:`, error)
      }
    }
  }
}

// Register cleanup handlers
process.on('SIGINT', () => {
  cleanup()
  process.exit(130)
})

process.on('SIGTERM', () => {
  cleanup()
  process.exit(143)
})

process.on('exit', () => {
  cleanup()
})

async function waitForPort(port: number, maxAttempts = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const { promise, resolve, reject } = Promise.withResolvers()
      const socket = createConnection(port, 'localhost')
      socket.on('connect', () => {
        socket.end()
        resolve()
      })
      socket.on('error', reject)
      await promise
      return // Successfully connected, exit the function
    } catch {
      await setTimeout(100)
    }
  }
  throw new Error(`Port ${port} did not become available`)
}

async function startServer(path: string, runtime: Benchmark['runtime']): void {
  console.log(`Starting server for ${runtime}`)
  switch (runtime) {
    case 'workerd':
      processes.workerd = spawn(
        './node_modules/.bin/workerd',
        ['serve', path],
        { stdio: 'ignore', detached: false }
      )
      break
    case 'deno':
      processes.deno = spawn('deno', ['run', '--allow-net', path], {
        stdio: 'ignore',
        detached: false,
      })
      break
    case 'bun':
      processes.bun = spawn('bun', [path], { stdio: 'ignore', detached: false })
      break
    case 'node':
      processes.node = spawn('node', [path], {
        stdio: 'ignore',
        detached: false,
      })
      break
  }

  await waitForPort(config[runtime].port)
}

let benchmark = values.benchmark
assert(
  benchmark,
  'Benchmark path is required, such as: node --run bench -- --benchmark=hello-world'
)

const exportJson = path.join(benchmark, 'benchmark-results.json')
const exportMarkdown = path.join(benchmark, 'benchmark-results.md')

let command = `hyperfine --warmup 50 --export-json ${exportJson} --export-markdown ${exportMarkdown} `

const destination = path.join(benchmark, 'workerd.config.capnp')
try {
  unlinkSync(destination)
} catch (error) {}
copyFileSync('./base.capnp', destination)

for (const runtime of runtimes) {
  if (runtime === 'workerd') {
    await startServer(
      path.join('./', benchmark, 'workerd.config.capnp'),
      runtime
    )
  } else {
    await startServer(path.join('./', benchmark, `./${runtime}.js`), runtime)
  }

  const port = config[runtime].port
  command += ` -n "${runtime}" "curl http://localhost:${port}/"`
}

console.log('All servers ready!')
console.log('')
console.log('Now running: ', command)
console.log('')

execSync(command, { stdio: ['inherit', 'inherit', 'inherit'] })

cleanup()
process.exit(0)

import { ChildProcess, execSync, spawn } from 'node:child_process'
import { parseArgs } from 'node:util'
import { copyFileSync, unlinkSync, readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
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

async function startServer(
  filePath: string,
  runtime: Benchmark['runtime'],
  cwd?: string
): void {
  console.log(`Starting server for ${runtime}`)
  switch (runtime) {
    case 'workerd':
      processes.workerd = spawn(
        '../node_modules/.bin/workerd',
        ['serve', filePath],
        { stdio: 'ignore', detached: false, cwd: cwd }
      )
      break
    case 'deno':
      processes.deno = spawn(
        'deno',
        ['run', '--allow-net', '--allow-read', filePath],
        {
          stdio: 'ignore',
          detached: false,
          cwd: cwd,
        }
      )
      break
    case 'bun':
      processes.bun = spawn('bun', [filePath], {
        stdio: 'ignore',
        detached: false,
        cwd: cwd,
      })
      break
    case 'node':
      processes.node = spawn('node', [filePath], {
        stdio: 'ignore',
        detached: false,
        cwd: cwd,
      })
      break
  }

  await waitForPort(config[runtime].port)
}

let benchmark = values.benchmark
assert(
  benchmark,
  'Benchmark path is required, such as: node --run bench -- --benchmark=hello-world or --benchmark=all'
)

async function runBenchmark(benchmarkPath: string) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Running benchmark: ${benchmarkPath}`)
  console.log('='.repeat(60) + '\n')

  const exportJson = path.join(benchmarkPath, 'benchmark-results.json')
  const exportMarkdown = path.join(benchmarkPath, 'benchmark-results.md')

  let command = `hyperfine --warmup 50 --export-json ${exportJson} --export-markdown ${exportMarkdown} `

  // Generate workerd config with dynamic file embedding
  const destination = path.join(benchmarkPath, 'workerd.config.capnp')
  let baseCapnp = readFileSync('./base.capnp', 'utf8')

  // Always embed benchmark.js as an esModule
  let additionalFiles =
    ',\n    (name = "benchmark.js", esModule = embed "benchmark.js")'

  // Check if files.json exists in the benchmark directory
  const filesJsonPath = path.join(benchmarkPath, 'files.json')
  try {
    const files = JSON.parse(readFileSync(filesJsonPath, 'utf8'))
    if (Array.isArray(files) && files.length > 0) {
      additionalFiles +=
        ',\n    ' +
        files
          .map((file) => `(name = "${file}", text = embed "${file}")`)
          .join(',\n    ')
    }
  } catch (error) {
    // No files.json or invalid JSON, no additional files needed
  }

  // Replace the comment line with actual embedded files
  baseCapnp = baseCapnp.replace(
    '    # Additional files will be inserted here by the runner',
    additionalFiles
  )

  try {
    unlinkSync(destination)
  } catch (error) {}
  writeFileSync(destination, baseCapnp, 'utf8')

  // Copy template files for each runtime
  for (const runtime of runtimes) {
    const templatePath = `./templates/${runtime}.template.js`
    const destinationPath = path.join(benchmarkPath, `${runtime}.js`)
    try {
      unlinkSync(destinationPath)
    } catch (error) {}
    copyFileSync(templatePath, destinationPath)
  }

  for (const runtime of runtimes) {
    if (runtime === 'workerd') {
      await startServer('./workerd.config.capnp', runtime, benchmarkPath)
    } else {
      await startServer(`./${runtime}.js`, runtime, benchmarkPath)
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
}

function findBenchmarkDirectories(): string[] {
  const entries = readdirSync('.')
  const benchmarkDirs: string[] = []

  for (const entry of entries) {
    // Skip hidden directories, node_modules, and templates
    if (entry.startsWith('.') || entry === 'node_modules' || entry === 'templates') {
      continue
    }

    const fullPath = path.join('.', entry)

    // Check if it's a directory
    try {
      const stat = statSync(fullPath)
      if (!stat.isDirectory()) {
        continue
      }
    } catch (error) {
      continue
    }

    // Check if it contains benchmark.js
    const benchmarkFile = path.join(fullPath, 'benchmark.js')
    if (existsSync(benchmarkFile)) {
      benchmarkDirs.push(entry)
    }
  }

  return benchmarkDirs.sort()
}

if (benchmark === 'all') {
  const benchmarkDirs = findBenchmarkDirectories()

  if (benchmarkDirs.length === 0) {
    console.error('No benchmark directories found!')
    process.exit(1)
  }

  console.log(`Found ${benchmarkDirs.length} benchmark(s): ${benchmarkDirs.join(', ')}`)

  for (const dir of benchmarkDirs) {
    await runBenchmark(dir)
  }
} else {
  await runBenchmark(benchmark)
}

process.exit(0)
